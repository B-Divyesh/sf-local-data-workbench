extern crate local_data_workbench_lib;

use local_data_workbench_lib::engine::analyze_file;

fn main() {
    for path in std::env::args().skip(1) {
        println!("{path}: {:?}", analyze_file(&path));
    }
}
