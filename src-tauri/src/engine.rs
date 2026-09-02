use parquet::file::reader::{FileReader, SerializedFileReader};
use parquet::record::Field;
use serde::de::{Deserializer, MapAccess, SeqAccess, Visitor};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::fmt;
use std::fs::{self, File};
use std::io::{BufRead, BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

const PREVIEW_ROWS: usize = 100;
const PROFILE_ROWS: usize = 100_000;
const DISTINCT_LIMIT: usize = 10_000;
const JOIN_ROW_LIMIT: usize = 200_000;

#[derive(Debug, Clone, Serialize)]
pub struct ColumnProfile {
    name: String,
    inferred_type: String,
    null_count: u64,
    distinct_count: usize,
    distinct_is_estimate: bool,
    min: Option<String>,
    max: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DatasetSummary {
    path: String,
    name: String,
    format: String,
    size_bytes: u64,
    row_count: u64,
    scanned_rows: u64,
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
    profiles: Vec<ColumnProfile>,
    fingerprint: String,
    preview_limited: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct TableData {
    headers: Vec<String>,
    rows: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum RecipeStep {
    Filter {
        name: String,
        column: String,
        operator: String,
        value: String,
    },
    Derive {
        name: String,
        column: String,
        new_column: String,
        operation: String,
        value: String,
    },
    Rename {
        name: String,
        column: String,
        new_name: String,
    },
    Select {
        name: String,
        columns: Vec<String>,
    },
    Join {
        name: String,
        right_path: String,
        left_key: String,
        right_key: String,
        prefix: String,
    },
}

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub source_path: String,
    pub destination_path: String,
    pub format: String,
    pub steps: Vec<RecipeStep>,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    rows_written: u64,
    bytes_written: u64,
    destination_path: String,
}

#[derive(Clone, Copy, PartialEq)]
enum ValueKind {
    Empty,
    Integer,
    Decimal,
    Boolean,
    Date,
    Text,
}

struct ProfileAccumulator {
    kind: ValueKind,
    null_count: u64,
    distinct: HashSet<String>,
    distinct_capped: bool,
    lexical_min: Option<String>,
    lexical_max: Option<String>,
    numeric_min: Option<(f64, String)>,
    numeric_max: Option<(f64, String)>,
}

impl ProfileAccumulator {
    fn new() -> Self {
        Self {
            kind: ValueKind::Empty,
            null_count: 0,
            distinct: HashSet::new(),
            distinct_capped: false,
            lexical_min: None,
            lexical_max: None,
            numeric_min: None,
            numeric_max: None,
        }
    }

    fn observe(&mut self, value: &str) {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            self.null_count += 1;
            return;
        }
        let detected = detect_kind(trimmed);
        self.kind = merge_kind(self.kind, detected);
        if self.distinct.len() < DISTINCT_LIMIT {
            self.distinct.insert(trimmed.to_owned());
        } else if !self.distinct.contains(trimmed) {
            self.distinct_capped = true;
        }
        if self
            .lexical_min
            .as_deref()
            .map_or(true, |current| trimmed < current)
        {
            self.lexical_min = Some(trimmed.to_owned());
        }
        if self
            .lexical_max
            .as_deref()
            .map_or(true, |current| trimmed > current)
        {
            self.lexical_max = Some(trimmed.to_owned());
        }
        if matches!(detected, ValueKind::Integer | ValueKind::Decimal) {
            // `detect_kind` only accepts finite numbers. Keep the original spelling for
            // display/export while comparing the actual numeric value for profile bounds.
            let numeric = trimmed.parse::<f64>().expect("detected numeric value");
            if self
                .numeric_min
                .as_ref()
                .map_or(true, |(current, _)| numeric < *current)
            {
                self.numeric_min = Some((numeric, trimmed.to_owned()));
            }
            if self
                .numeric_max
                .as_ref()
                .map_or(true, |(current, _)| numeric > *current)
            {
                self.numeric_max = Some((numeric, trimmed.to_owned()));
            }
        }
    }

    fn finish(self, name: String, sampled: bool) -> ColumnProfile {
        let inferred_type = match self.kind {
            ValueKind::Empty => "empty",
            ValueKind::Integer => "integer",
            ValueKind::Decimal => "decimal",
            ValueKind::Boolean => "boolean",
            ValueKind::Date => "date",
            ValueKind::Text => "text",
        }
        .to_owned();
        let (min, max) = if matches!(self.kind, ValueKind::Integer | ValueKind::Decimal) {
            (
                self.numeric_min.map(|(_, value)| value),
                self.numeric_max.map(|(_, value)| value),
            )
        } else {
            (self.lexical_min, self.lexical_max)
        };
        ColumnProfile {
            name,
            inferred_type,
            null_count: self.null_count,
            distinct_count: self.distinct.len(),
            distinct_is_estimate: sampled || self.distinct_capped,
            min,
            max,
        }
    }
}

fn detect_kind(value: &str) -> ValueKind {
    if value.parse::<i64>().is_ok() {
        ValueKind::Integer
    } else if value.parse::<f64>().is_ok_and(f64::is_finite) {
        ValueKind::Decimal
    } else if matches!(value.to_ascii_lowercase().as_str(), "true" | "false") {
        ValueKind::Boolean
    } else if value.len() >= 10
        && value.as_bytes().get(4) == Some(&b'-')
        && value.as_bytes().get(7) == Some(&b'-')
        && value[..4].chars().all(|c| c.is_ascii_digit())
    {
        ValueKind::Date
    } else {
        ValueKind::Text
    }
}

fn merge_kind(existing: ValueKind, next: ValueKind) -> ValueKind {
    if existing == ValueKind::Empty {
        next
    } else if existing == next {
        existing
    } else if matches!(
        (existing, next),
        (ValueKind::Integer, ValueKind::Decimal) | (ValueKind::Decimal, ValueKind::Integer)
    ) {
        ValueKind::Decimal
    } else {
        ValueKind::Text
    }
}

fn data_format(path: &Path) -> Result<&'static str, String> {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        .as_str()
    {
        "csv" => Ok("csv"),
        "json" => Ok("json"),
        "jsonl" | "ndjson" => Ok("jsonl"),
        "parquet" => Ok("parquet"),
        _ => Err("Unsupported file type. Use CSV, JSON, JSONL, NDJSON, or Parquet.".to_owned()),
    }
}

fn fingerprint(path: &Path, metadata: &fs::Metadata) -> Result<String, String> {
    let mut file =
        File::open(path).map_err(|error| format!("Could not fingerprint source: {error}"))?;
    let mut sample = vec![0_u8; 65_536];
    let read = file
        .read(&mut sample)
        .map_err(|error| format!("Could not fingerprint source: {error}"))?;
    let modified = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map_or(0, |value| value.as_secs());
    let mut hasher = Sha256::new();
    hasher.update(metadata.len().to_le_bytes());
    hasher.update(modified.to_le_bytes());
    hasher.update(&sample[..read]);
    Ok(format!("{:x}", hasher.finalize()))
}

fn unique_headers(headers: Vec<String>) -> Vec<String> {
    let mut seen: HashMap<String, usize> = HashMap::new();
    headers
        .into_iter()
        .enumerate()
        .map(|(index, header)| {
            let base = if header.trim().is_empty() {
                format!("column_{}", index + 1)
            } else {
                header.trim().to_owned()
            };
            let count = seen.entry(base.clone()).or_insert(0);
            *count += 1;
            if *count == 1 {
                base
            } else {
                format!("{base}_{}", *count)
            }
        })
        .collect()
}

fn csv_headers(path: &Path) -> Result<Vec<String>, String> {
    let mut reader = csv::ReaderBuilder::new()
        .flexible(true)
        .from_path(path)
        .map_err(|error| format!("CSV could not be opened: {error}"))?;
    let headers = reader
        .headers()
        .map_err(|error| format!("CSV header could not be read: {error}"))?
        .iter()
        .map(str::to_owned)
        .collect();
    Ok(unique_headers(headers))
}

fn json_object(value: Value) -> Result<Map<String, Value>, String> {
    value
        .as_object()
        .cloned()
        .ok_or_else(|| "Every JSON record must be an object with named fields.".to_owned())
}

fn json_value_string(value: Option<&Value>) -> String {
    match value {
        None | Some(Value::Null) => String::new(),
        Some(Value::String(value)) => value.clone(),
        Some(Value::Bool(value)) => value.to_string(),
        Some(Value::Number(value)) => value.to_string(),
        Some(value) => serde_json::to_string(value).unwrap_or_default(),
    }
}

/// State shared by the streaming JSON visitor. JSON arrays can be several GB,
/// so a record is intentionally the largest unit kept in memory here.
#[derive(Default)]
struct JsonStreamState {
    row_count: u64,
    stopped: bool,
    callback_error: Option<String>,
}

struct JsonRecordVisitor<'state, 'callback, F> {
    state: &'state mut JsonStreamState,
    callback: &'callback mut F,
}

impl<F> JsonRecordVisitor<'_, '_, F>
where
    F: FnMut(Map<String, Value>) -> Result<bool, String>,
{
    fn observe(&mut self, object: Map<String, Value>) {
        self.state.row_count += 1;
        if self.state.stopped {
            return;
        }
        match (self.callback)(object) {
            Ok(keep_going) => self.state.stopped = !keep_going,
            Err(error) => {
                self.state.callback_error = Some(error);
                self.state.stopped = true;
            }
        }
    }
}

impl<'de, F> Visitor<'de> for JsonRecordVisitor<'_, '_, F>
where
    F: FnMut(Map<String, Value>) -> Result<bool, String>,
{
    type Value = ();

    fn expecting(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("a JSON object or an array of JSON objects")
    }

    fn visit_seq<A>(mut self, mut sequence: A) -> Result<Self::Value, A::Error>
    where
        A: SeqAccess<'de>,
    {
        while let Some(object) = sequence.next_element::<Map<String, Value>>()? {
            self.observe(object);
        }
        Ok(())
    }

    fn visit_map<A>(mut self, mut map: A) -> Result<Self::Value, A::Error>
    where
        A: MapAccess<'de>,
    {
        let mut object = Map::new();
        while let Some((key, value)) = map.next_entry::<String, Value>()? {
            object.insert(key, value);
        }
        self.observe(object);
        Ok(())
    }
}

/// Visit a JSON object, or every object in a JSON array, without ever
/// materialising the surrounding array. This deliberately consumes a complete
/// document even if the caller has enough preview rows, so malformed tails are
/// still reported rather than silently producing a partial result.
fn stream_json_objects<F>(path: &Path, mut callback: F) -> Result<u64, String>
where
    F: FnMut(Map<String, Value>) -> Result<bool, String>,
{
    let file = File::open(path).map_err(|error| format!("JSON could not be opened: {error}"))?;
    let mut deserializer = serde_json::Deserializer::from_reader(BufReader::new(file));
    let mut state = JsonStreamState::default();
    {
        let visitor = JsonRecordVisitor {
            state: &mut state,
            callback: &mut callback,
        };
        deserializer
            .deserialize_any(visitor)
            .map_err(|error| format!("JSON is invalid: {error}"))?;
    }
    deserializer
        .end()
        .map_err(|error| format!("JSON is invalid: {error}"))?;
    if let Some(error) = state.callback_error {
        return Err(error);
    }
    Ok(state.row_count)
}

fn json_headers(path: &Path, lines: bool) -> Result<Vec<String>, String> {
    let mut headers = Vec::new();
    let mut seen = HashSet::new();
    let mut observe = |object: &Map<String, Value>| {
        for key in object.keys() {
            if seen.insert(key.clone()) {
                headers.push(key.clone());
            }
        }
    };
    if lines {
        for (index, line) in BufReader::new(
            File::open(path).map_err(|error| format!("JSON Lines could not be opened: {error}"))?,
        )
        .lines()
        .enumerate()
        {
            let line = line.map_err(|error| format!("JSON Lines read failed: {error}"))?;
            if line.trim().is_empty() {
                continue;
            }
            let object = json_object(
                serde_json::from_str(&line)
                    .map_err(|error| format!("Invalid JSON on line {}: {error}", index + 1))?,
            )?;
            observe(&object);
        }
    } else {
        stream_json_objects(path, |object| {
            observe(&object);
            Ok(true)
        })?;
    }
    if headers.is_empty() {
        return Err("No object fields were found in this JSON source.".to_owned());
    }
    Ok(unique_headers(headers))
}

fn parquet_reader(path: &Path) -> Result<SerializedFileReader<File>, String> {
    SerializedFileReader::new(
        File::open(path).map_err(|error| format!("Parquet could not be opened: {error}"))?,
    )
    .map_err(|error| format!("Parquet metadata is invalid: {error}"))
}

fn parquet_headers(path: &Path) -> Result<Vec<String>, String> {
    let reader = parquet_reader(path)?;
    let mut rows = reader
        .get_row_iter(None)
        .map_err(|error| format!("Parquet rows could not be read: {error}"))?;
    if let Some(row) = rows.next() {
        let row = row.map_err(|error| format!("Parquet row could not be read: {error}"))?;
        Ok(unique_headers(
            row.get_column_iter()
                .map(|(name, _)| name.clone())
                .collect(),
        ))
    } else {
        Ok(unique_headers(
            reader
                .metadata()
                .file_metadata()
                .schema_descr()
                .columns()
                .iter()
                .map(|column| column.name().to_owned())
                .collect(),
        ))
    }
}

/// Convert Parquet's typed record field into the same cell representation used by
/// CSV and JSON. `Display` is deliberately not used: it renders UTF-8 fields with
/// quotes and a null as the literal word "null", which changes filtering and
/// profiling semantics.
fn parquet_value_string(field: &Field) -> String {
    match field {
        Field::Null => String::new(),
        Field::Str(value) => value.clone(),
        Field::Bool(value) => value.to_string(),
        Field::Byte(value) => value.to_string(),
        Field::Short(value) => value.to_string(),
        Field::Int(value) => value.to_string(),
        Field::Long(value) => value.to_string(),
        Field::UByte(value) => value.to_string(),
        Field::UShort(value) => value.to_string(),
        Field::UInt(value) => value.to_string(),
        Field::ULong(value) => value.to_string(),
        Field::Float16(value) => value.to_string(),
        Field::Float(value) => value.to_string(),
        Field::Double(value) => value.to_string(),
        Field::Date(value) => value.to_string(),
        Field::TimeMillis(value) => value.to_string(),
        Field::TimeMicros(value) => value.to_string(),
        Field::TimestampMillis(value) => value.to_string(),
        Field::TimestampMicros(value) => value.to_string(),
        // Complex values and binary/decimal values retain Parquet's stable record
        // rendering. Only strings and nulls have different cell semantics.
        value => value.to_string(),
    }
}

fn source_headers(path: &Path, format: &str) -> Result<Vec<String>, String> {
    match format {
        "csv" => csv_headers(path),
        "json" => json_headers(path, false),
        "jsonl" => json_headers(path, true),
        "parquet" => parquet_headers(path),
        _ => unreachable!(),
    }
}

fn iterate_rows<F>(
    path: &Path,
    format: &str,
    headers: &[String],
    mut callback: F,
) -> Result<u64, String>
where
    F: FnMut(Vec<String>) -> Result<bool, String>,
{
    let mut count = 0_u64;
    match format {
        "csv" => {
            let mut reader = csv::ReaderBuilder::new()
                .flexible(true)
                .from_path(path)
                .map_err(|error| format!("CSV could not be opened: {error}"))?;
            for record in reader.records() {
                let record =
                    record.map_err(|error| format!("CSV row {} is invalid: {error}", count + 2))?;
                let mut row: Vec<String> = record.iter().map(str::to_owned).collect();
                row.resize(headers.len(), String::new());
                count += 1;
                if !callback(row)? {
                    break;
                }
            }
        }
        "jsonl" => {
            for (index, line) in BufReader::new(
                File::open(path)
                    .map_err(|error| format!("JSON Lines could not be opened: {error}"))?,
            )
            .lines()
            .enumerate()
            {
                let line = line.map_err(|error| format!("JSON Lines read failed: {error}"))?;
                if line.trim().is_empty() {
                    continue;
                }
                let object =
                    json_object(serde_json::from_str(&line).map_err(|error| {
                        format!("Invalid JSON on line {}: {error}", index + 1)
                    })?)?;
                count += 1;
                if !callback(
                    headers
                        .iter()
                        .map(|header| json_value_string(object.get(header)))
                        .collect(),
                )? {
                    break;
                }
            }
        }
        "json" => {
            count = stream_json_objects(path, |object| {
                callback(
                    headers
                        .iter()
                        .map(|header| json_value_string(object.get(header)))
                        .collect(),
                )
            })?;
        }
        "parquet" => {
            let reader = parquet_reader(path)?;
            let rows = reader
                .get_row_iter(None)
                .map_err(|error| format!("Parquet rows could not be read: {error}"))?;
            for row in rows {
                let row = row.map_err(|error| {
                    format!("Parquet row {} could not be read: {error}", count + 1)
                })?;
                count += 1;
                if !callback(
                    row.get_column_iter()
                        .map(|(_, field)| parquet_value_string(field))
                        .collect(),
                )? {
                    break;
                }
            }
        }
        _ => unreachable!(),
    }
    Ok(count)
}

pub fn analyze_file(path_string: &str) -> Result<DatasetSummary, String> {
    let path = Path::new(path_string);
    let metadata = fs::metadata(path).map_err(|error| format!("Source is unavailable: {error}"))?;
    if !metadata.is_file() {
        return Err("The selected source is not a regular file.".to_owned());
    }
    let format = data_format(path)?;
    let headers = source_headers(path, format)?;
    if headers.is_empty() {
        return Err("The source has no columns.".to_owned());
    }
    let mut accumulators: Vec<ProfileAccumulator> =
        headers.iter().map(|_| ProfileAccumulator::new()).collect();
    let mut preview = Vec::new();
    let mut profiled = 0_u64;
    let row_count = if format == "parquet" {
        let reader = parquet_reader(path)?;
        let total = reader.metadata().file_metadata().num_rows().max(0) as u64;
        iterate_rows(path, format, &headers, |row| {
            if preview.len() < PREVIEW_ROWS {
                preview.push(row.clone());
            }
            if profiled < PROFILE_ROWS as u64 {
                for (index, value) in row.iter().enumerate().take(accumulators.len()) {
                    accumulators[index].observe(value);
                }
                profiled += 1;
            }
            Ok(profiled < PROFILE_ROWS as u64 || preview.len() < PREVIEW_ROWS)
        })
        .map(|_| total)?
    } else {
        iterate_rows(path, format, &headers, |row| {
            if preview.len() < PREVIEW_ROWS {
                preview.push(row.clone());
            }
            if profiled < PROFILE_ROWS as u64 {
                for (index, value) in row.iter().enumerate().take(accumulators.len()) {
                    accumulators[index].observe(value);
                }
                profiled += 1;
            }
            Ok(true)
        })?
    };
    let sampled = profiled < row_count;
    let profiles = headers
        .iter()
        .cloned()
        .zip(accumulators)
        .map(|(name, accumulator)| accumulator.finish(name, sampled))
        .collect();
    Ok(DatasetSummary {
        path: path.to_string_lossy().into_owned(),
        name: path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("source")
            .to_owned(),
        format: format.to_owned(),
        size_bytes: metadata.len(),
        row_count,
        scanned_rows: profiled,
        headers,
        rows: preview,
        profiles,
        fingerprint: fingerprint(path, &metadata)?,
        preview_limited: row_count > PREVIEW_ROWS as u64,
    })
}

#[derive(Clone)]
enum CompiledStep {
    Filter {
        index: usize,
        operator: String,
        value: String,
    },
    Derive {
        index: usize,
        operation: String,
        value: String,
    },
    Select {
        indexes: Vec<usize>,
    },
    Join {
        index: usize,
        right_columns: Vec<usize>,
        rows: HashMap<String, Vec<String>>,
    },
}

type JoinRows = HashMap<String, Vec<String>>;
type JoinData = (Vec<String>, JoinRows);

fn step_name(step: &RecipeStep) -> &str {
    match step {
        RecipeStep::Filter { name, .. }
        | RecipeStep::Derive { name, .. }
        | RecipeStep::Rename { name, .. }
        | RecipeStep::Select { name, .. }
        | RecipeStep::Join { name, .. } => name,
    }
}

fn column_index(headers: &[String], column: &str, step: &RecipeStep) -> Result<usize, String> {
    headers
        .iter()
        .position(|header| header == column)
        .ok_or_else(|| {
            format!(
                "Step “{}” refers to missing column “{column}”.",
                step_name(step)
            )
        })
}

fn load_join(path_string: &str, key: &str) -> Result<JoinData, String> {
    let path = Path::new(path_string);
    let format = data_format(path)?;
    if format == "parquet" {
        return Err("Join files currently support CSV, JSON, and JSON Lines. Export Parquet reference data to one of those formats first.".to_owned());
    }
    let headers = source_headers(path, format)?;
    let key_index = headers
        .iter()
        .position(|header| header == key)
        .ok_or_else(|| format!("Join file does not contain key column “{key}”."))?;
    let mut rows = HashMap::new();
    let mut seen_rows = 0_usize;
    let count = iterate_rows(path, format, &headers, |row| {
        if seen_rows >= JOIN_ROW_LIMIT {
            return Err(format!(
                "Join file exceeds the {JOIN_ROW_LIMIT}-row safety cap. Reduce it before joining."
            ));
        }
        seen_rows += 1;
        let value = row.get(key_index).cloned().unwrap_or_default();
        rows.entry(value).or_insert(row);
        Ok(true)
    })?;
    if count == 0 {
        return Err("Join file contains no rows.".to_owned());
    }
    Ok((headers, rows))
}

fn compile_steps(
    initial_headers: &[String],
    steps: &[RecipeStep],
) -> Result<(Vec<String>, Vec<CompiledStep>), String> {
    let mut headers = initial_headers.to_vec();
    let mut compiled = Vec::new();
    for step in steps {
        match step {
            RecipeStep::Filter {
                column,
                operator,
                value,
                ..
            } => compiled.push(CompiledStep::Filter {
                index: column_index(&headers, column, step)?,
                operator: operator.clone(),
                value: value.clone(),
            }),
            RecipeStep::Derive {
                column,
                new_column,
                operation,
                value,
                ..
            } => {
                if new_column.trim().is_empty() {
                    return Err(format!(
                        "Step “{}” needs a new column name.",
                        step_name(step)
                    ));
                }
                let index = column_index(&headers, column, step)?;
                headers.push(new_column.clone());
                compiled.push(CompiledStep::Derive {
                    index,
                    operation: operation.clone(),
                    value: value.clone(),
                });
            }
            RecipeStep::Rename {
                column, new_name, ..
            } => {
                let index = column_index(&headers, column, step)?;
                if new_name.trim().is_empty() {
                    return Err(format!("Step “{}” needs a new name.", step_name(step)));
                }
                headers[index] = new_name.clone();
            }
            RecipeStep::Select { columns, .. } => {
                if columns.is_empty() {
                    return Err(format!(
                        "Step “{}” must keep at least one column.",
                        step_name(step)
                    ));
                }
                let indexes: Result<Vec<_>, _> = columns
                    .iter()
                    .map(|column| column_index(&headers, column, step))
                    .collect();
                let indexes = indexes?;
                headers = indexes
                    .iter()
                    .map(|index| headers[*index].clone())
                    .collect();
                compiled.push(CompiledStep::Select { indexes });
            }
            RecipeStep::Join {
                right_path,
                left_key,
                right_key,
                prefix,
                ..
            } => {
                let index = column_index(&headers, left_key, step)?;
                let (right_headers, rows) = load_join(right_path, right_key)?;
                let right_key_index = right_headers
                    .iter()
                    .position(|header| header == right_key)
                    .unwrap();
                let right_columns: Vec<usize> = (0..right_headers.len())
                    .filter(|column| *column != right_key_index)
                    .collect();
                headers.extend(
                    right_columns
                        .iter()
                        .map(|column| format!("{prefix}{}", right_headers[*column])),
                );
                compiled.push(CompiledStep::Join {
                    index,
                    right_columns,
                    rows,
                });
            }
        }
    }
    Ok((headers, compiled))
}

fn filter_passes(actual: &str, operator: &str, expected: &str) -> Result<bool, String> {
    match operator {
        "equals" => Ok(actual == expected),
        "not_equals" => Ok(actual != expected),
        "contains" => Ok(actual.to_lowercase().contains(&expected.to_lowercase())),
        "is_empty" => Ok(actual.trim().is_empty()),
        "is_not_empty" => Ok(!actual.trim().is_empty()),
        "greater_than" | "less_than" => {
            let actual: f64 = actual
                .parse()
                .map_err(|_| format!("Value “{actual}” is not numeric."))?;
            let expected: f64 = expected
                .parse()
                .map_err(|_| format!("Comparison “{expected}” is not numeric."))?;
            Ok(if operator == "greater_than" {
                actual > expected
            } else {
                actual < expected
            })
        }
        _ => Err(format!("Unknown filter condition “{operator}”.")),
    }
}

fn apply_compiled(
    mut row: Vec<String>,
    compiled: &[CompiledStep],
) -> Result<Option<Vec<String>>, String> {
    for step in compiled {
        match step {
            CompiledStep::Filter {
                index,
                operator,
                value,
            } => {
                if !filter_passes(
                    row.get(*index).map(String::as_str).unwrap_or(""),
                    operator,
                    value,
                )? {
                    return Ok(None);
                }
            }
            CompiledStep::Derive {
                index,
                operation,
                value,
            } => {
                let input = row.get(*index).cloned().unwrap_or_default();
                let output = match operation.as_str() {
                    "trim" => input.trim().to_owned(),
                    "uppercase" => input.to_uppercase(),
                    "lowercase" => input.to_lowercase(),
                    "prefix" => format!("{value}{input}"),
                    "suffix" => format!("{input}{value}"),
                    _ => return Err(format!("Unknown derive operation “{operation}”.")),
                };
                row.push(output);
            }
            CompiledStep::Select { indexes } => {
                row = indexes
                    .iter()
                    .map(|index| row.get(*index).cloned().unwrap_or_default())
                    .collect()
            }
            CompiledStep::Join {
                index,
                right_columns,
                rows,
            } => {
                let match_row = rows.get(row.get(*index).map(String::as_str).unwrap_or(""));
                row.extend(right_columns.iter().map(|column| {
                    match_row
                        .and_then(|joined| joined.get(*column))
                        .cloned()
                        .unwrap_or_default()
                }));
            }
        }
    }
    Ok(Some(row))
}

pub fn preview_recipe(path_string: &str, steps: &[RecipeStep]) -> Result<TableData, String> {
    let path = Path::new(path_string);
    let format = data_format(path)?;
    let source_headers = source_headers(path, format)?;
    let (headers, compiled) = compile_steps(&source_headers, steps)?;
    let mut rows = Vec::new();
    iterate_rows(path, format, &source_headers, |row| {
        if let Some(row) = apply_compiled(row, &compiled)? {
            rows.push(row);
        }
        Ok(rows.len() < PREVIEW_ROWS)
    })?;
    Ok(TableData { headers, rows })
}

fn partial_path(destination: &Path) -> PathBuf {
    let mut name = destination.file_name().unwrap_or_default().to_os_string();
    name.push(format!(".{}.partial", std::process::id()));
    destination.with_file_name(name)
}

pub fn export_result(request: &ExportRequest) -> Result<ExportResult, String> {
    let source_path = Path::new(&request.source_path);
    let format = data_format(source_path)?;
    let source_headers = source_headers(source_path, format)?;
    let (headers, compiled) = compile_steps(&source_headers, &request.steps)?;
    if !matches!(request.format.as_str(), "csv" | "jsonl") {
        return Err("Export format must be CSV or JSON Lines.".to_owned());
    }
    let destination = Path::new(&request.destination_path);
    let partial = partial_path(destination);
    let mut written = 0_u64;
    let export_result = (|| -> Result<(), String> {
        if request.format == "csv" {
            let mut writer = csv::WriterBuilder::new()
                .from_path(&partial)
                .map_err(|error| format!("Export could not be created: {error}"))?;
            writer
                .write_record(&headers)
                .map_err(|error| format!("CSV header could not be written: {error}"))?;
            iterate_rows(source_path, format, &source_headers, |row| {
                if let Some(row) = apply_compiled(row, &compiled)? {
                    writer
                        .write_record(row)
                        .map_err(|error| format!("CSV row could not be written: {error}"))?;
                    written += 1;
                }
                Ok(true)
            })?;
            writer
                .flush()
                .map_err(|error| format!("CSV export could not be finished: {error}"))?;
        } else {
            let mut writer = BufWriter::new(
                File::create(&partial)
                    .map_err(|error| format!("Export could not be created: {error}"))?,
            );
            iterate_rows(source_path, format, &source_headers, |row| {
                if let Some(row) = apply_compiled(row, &compiled)? {
                    let object: Map<String, Value> = headers
                        .iter()
                        .cloned()
                        .zip(row.into_iter().map(Value::String))
                        .collect();
                    serde_json::to_writer(&mut writer, &object)
                        .map_err(|error| format!("JSON row could not be written: {error}"))?;
                    writer
                        .write_all(b"\n")
                        .map_err(|error| format!("JSON row could not be written: {error}"))?;
                    written += 1;
                }
                Ok(true)
            })?;
            writer
                .flush()
                .map_err(|error| format!("JSON export could not be finished: {error}"))?;
        }
        Ok(())
    })();
    if let Err(error) = export_result {
        let _ = fs::remove_file(&partial);
        return Err(error);
    }
    fs::rename(&partial, destination).map_err(|error| {
        let _ = fs::remove_file(&partial);
        format!("Completed export could not replace the destination: {error}")
    })?;
    let bytes = fs::metadata(destination)
        .map_err(|error| format!("Export metadata could not be read: {error}"))?
        .len();
    Ok(ExportResult {
        rows_written: written,
        bytes_written: bytes,
        destination_path: destination.to_string_lossy().into_owned(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn profiles_and_previews_csv_without_loading_output() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("orders.csv");
        fs::write(
            &path,
            "id,status,amount\n1,shipped,12.5\n2,,7\n3,shipped,19\n",
        )
        .unwrap();
        let summary = analyze_file(path.to_str().unwrap()).unwrap();
        assert_eq!(summary.row_count, 3);
        assert_eq!(summary.rows.len(), 3);
        assert_eq!(summary.profiles[1].null_count, 1);
        assert_eq!(summary.profiles[2].inferred_type, "decimal");
    }

    // @claim:local-formats
    #[test]
    fn claim_local_formats_open_and_profile_csv_json_json_lines_and_parquet() {
        let dir = tempdir().unwrap();
        let csv = dir.path().join("records.csv");
        let json = dir.path().join("records.json");
        let jsonl = dir.path().join("records.jsonl");
        fs::write(&csv, "id,status\n1,keep\n").unwrap();
        fs::write(&json, r#"[{"id":2,"status":"keep"}]"#).unwrap();
        fs::write(&jsonl, "{\"id\":3,\"status\":\"keep\"}\n").unwrap();
        let parquet = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../.factory/verification-artifacts/native-sample.parquet");
        for source in [&csv, &json, &jsonl, &parquet] {
            let summary = analyze_file(source.to_str().unwrap()).unwrap();
            assert!(!summary.headers.is_empty());
            assert!(summary.row_count > 0);
            assert_eq!(summary.headers.len(), summary.profiles.len());
        }
    }

    // @claim:large-json-arrays @regression:json-array-over-256-mib
    #[test]
    fn claim_large_json_arrays_stream_past_the_previous_256_mib_guard() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("over-256-mib.json");
        let mut writer = BufWriter::new(File::create(&path).unwrap());
        writer.write_all(br#"[{"id":1,"status":"first"},"#).unwrap();
        let whitespace = vec![b' '; 1024 * 1024];
        // The old engine rejected any JSON array once its file metadata was
        // above 256 MiB. Whitespace keeps this fixture valid without creating
        // a huge array of records, so the test exercises the exact boundary.
        for _ in 0..256 {
            writer.write_all(&whitespace).unwrap();
        }
        writer.write_all(br#"{"id":2,"status":"last"}]"#).unwrap();
        writer.flush().unwrap();
        assert!(fs::metadata(&path).unwrap().len() > 256 * 1024 * 1024);

        let summary = analyze_file(path.to_str().unwrap()).unwrap();
        assert_eq!(summary.row_count, 2);
        assert_eq!(summary.headers, vec!["id", "status"]);
        assert_eq!(summary.rows, vec![vec!["1", "first"], vec!["2", "last"]]);
    }

    // @claim:numeric-profile-bounds
    #[test]
    fn claim_numeric_profile_bounds_use_numeric_order_instead_of_text_order() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("numbers.csv");
        fs::write(&path, "integer,decimal\n2,124.50\n10,88.00\n100,241.25\n").unwrap();
        let summary = analyze_file(path.to_str().unwrap()).unwrap();
        assert_eq!(summary.profiles[0].inferred_type, "integer");
        assert_eq!(summary.profiles[0].min.as_deref(), Some("2"));
        assert_eq!(summary.profiles[0].max.as_deref(), Some("100"));
        assert_eq!(summary.profiles[1].min.as_deref(), Some("88.00"));
        assert_eq!(summary.profiles[1].max.as_deref(), Some("241.25"));
    }

    // @claim:parquet-profile-filter-export
    #[test]
    fn claim_parquet_strings_nulls_filter_and_export_as_native_cells() {
        let fixture = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../.factory/verification-artifacts/native-sample.parquet");
        let dir = tempdir().unwrap();
        let output = dir.path().join("filtered.csv");
        let summary = analyze_file(fixture.to_str().unwrap()).unwrap();
        assert_eq!(summary.headers, vec!["id", "amount", "status"]);
        assert_eq!(summary.rows[0], vec!["1", "2", "keep"]);
        assert_eq!(summary.rows[1], vec!["2", "10", ""]);
        assert_eq!(summary.rows[2], vec!["3", "100", "drop"]);
        let status = &summary.profiles[2];
        assert_eq!(status.null_count, 1);
        assert_eq!(status.min.as_deref(), Some("drop"));
        assert_eq!(status.max.as_deref(), Some("keep"));
        let result = export_result(&ExportRequest {
            source_path: fixture.to_string_lossy().into_owned(),
            destination_path: output.to_string_lossy().into_owned(),
            format: "csv".into(),
            steps: vec![RecipeStep::Filter {
                name: "Keep named status".into(),
                column: "status".into(),
                operator: "equals".into(),
                value: "keep".into(),
            }],
        })
        .unwrap();
        assert_eq!(result.rows_written, 1);
        assert_eq!(
            fs::read_to_string(output).unwrap(),
            "id,amount,status\n1,2,keep\n"
        );
    }

    #[test]
    fn applies_ordered_recipe_and_exports_every_matching_row() {
        let dir = tempdir().unwrap();
        let source = dir.path().join("source.csv");
        let output = dir.path().join("result.csv");
        fs::write(&source, "name,status\n Ada ,keep\nBob,drop\n").unwrap();
        let steps = vec![
            RecipeStep::Filter {
                name: "Keep approved".into(),
                column: "status".into(),
                operator: "equals".into(),
                value: "keep".into(),
            },
            RecipeStep::Derive {
                name: "Clean name".into(),
                column: "name".into(),
                new_column: "clean_name".into(),
                operation: "trim".into(),
                value: String::new(),
            },
        ];
        let result = export_result(&ExportRequest {
            source_path: source.to_string_lossy().into_owned(),
            destination_path: output.to_string_lossy().into_owned(),
            format: "csv".into(),
            steps,
        })
        .unwrap();
        assert_eq!(result.rows_written, 1);
        let text = fs::read_to_string(output).unwrap();
        assert!(text.contains("clean_name"));
        assert!(text.contains("Ada"));
        assert!(!text.contains("Bob"));
    }

    // @claim:desktop-complete-export
    #[test]
    fn claim_desktop_complete_export_includes_rows_beyond_the_preview() {
        let dir = tempdir().unwrap();
        let source = dir.path().join("source.csv");
        let output = dir.path().join("result.csv");
        let mut input = String::from("id,amount\n");
        for value in 1..=101 {
            input.push_str(&format!("{value},{value}\n"));
        }
        fs::write(&source, input).unwrap();
        let result = export_result(&ExportRequest {
            source_path: source.to_string_lossy().into_owned(),
            destination_path: output.to_string_lossy().into_owned(),
            format: "csv".into(),
            steps: vec![RecipeStep::Filter {
                name: "Values above 99".into(),
                column: "amount".into(),
                operator: "greater_than".into(),
                value: "99".into(),
            }],
        })
        .unwrap();
        assert_eq!(result.rows_written, 2);
        let text = fs::read_to_string(output).unwrap();
        assert!(text.contains("100,100"));
        assert!(text.contains("101,101"));
    }

    // @claim:local-joins
    #[test]
    fn joins_reference_data_by_named_key() {
        let dir = tempdir().unwrap();
        let source = dir.path().join("source.csv");
        let lookup = dir.path().join("lookup.csv");
        fs::write(&source, "region,value\nN,4\nS,5\n").unwrap();
        fs::write(&lookup, "code,label\nN,North\n").unwrap();
        let step = RecipeStep::Join {
            name: "Add label".into(),
            right_path: lookup.to_string_lossy().into_owned(),
            left_key: "region".into(),
            right_key: "code".into(),
            prefix: "ref_".into(),
        };
        let result = preview_recipe(source.to_str().unwrap(), &[step]).unwrap();
        assert_eq!(result.headers, vec!["region", "value", "ref_label"]);
        assert_eq!(result.rows[0][2], "North");
        assert_eq!(result.rows[1][2], "");
    }
}
