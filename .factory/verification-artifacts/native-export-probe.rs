extern crate local_data_workbench_lib;

use local_data_workbench_lib::engine::{export_result, ExportRequest, RecipeStep};

fn main() {
    let source = std::env::args().nth(1).expect("source");
    let destination = std::env::args().nth(2).expect("destination");
    let request = ExportRequest {
        source_path: source,
        destination_path: destination,
        format: "csv".to_owned(),
        steps: vec![RecipeStep::Filter {
            name: "Keep status".to_owned(),
            column: "status".to_owned(),
            operator: "equals".to_owned(),
            value: "keep".to_owned(),
        }],
    };
    println!("{:?}", export_result(&request));
}
