#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::import::normalize_table_name;

    #[test]
    fn test_normalize_name() {
        let path = Path::new("File Name.csv");
        assert_eq!(normalize_table_name(&path.to_path_buf()), "file_name");
    }
}
