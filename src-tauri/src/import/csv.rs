use super::{ImportType, normalize_column_name};

impl super::FileImporter {
    pub(crate) fn csv(path: std::path::PathBuf) -> Result<super::ImportedData, super::ImportError> {
        let table_name = super::normalize_table_name(&path);
        let meta = qsv_sniffer::Sniffer::new()
            .sniff_path(&path)
            .map_err(|_| super::ImportError::FileNotFound)?;
        let csv = std::fs::read_to_string(path).map_err(|_| super::ImportError::FileNotFound)?;

        let mut reader = csv::ReaderBuilder::new()
            .has_headers(true)
            .delimiter(meta.dialect.delimiter)
            .from_reader(csv.as_bytes());

        let fields: Vec<Vec<(String, ImportType)>> = reader
            .records()
            .filter_map(std::result::Result::ok)
            .map(|record| {
                record
                    .iter()
                    .enumerate()
                    .map(|(index, field)| {
                        let f = normalize_column_name(meta.fields[index].clone());
                        let value = match meta.types[index] {
                            qsv_sniffer::Type::Unsigned | qsv_sniffer::Type::Signed => {
                                ImportType::Number(field.parse::<isize>().unwrap_or_default())
                            }
                            qsv_sniffer::Type::Text => ImportType::Text(field.to_string()),
                            qsv_sniffer::Type::Boolean => {
                                let v = field == "1" || field.starts_with('t');
                                ImportType::Boolean(v)
                            }
                            qsv_sniffer::Type::Float => {
                                ImportType::Float(field.parse::<f64>().unwrap_or_default())
                            }
                            qsv_sniffer::Type::Date => {
                                let date = chrono::NaiveDate::parse_from_str(field, "%Y-%m-%d")
                                    .unwrap_or_default();

                                ImportType::Date(date)
                            }
                            qsv_sniffer::Type::DateTime => {
                                let date = chrono::NaiveDateTime::parse_from_str(
                                    field,
                                    "%Y-%m-%d %H:%M:%S",
                                )
                                .unwrap_or_default();

                                ImportType::DateTime(date)
                            }
                            qsv_sniffer::Type::NULL => ImportType::Text("NULL".into()),
                        };
                        (f, value)
                    })
                    .collect()
            })
            .collect();

        let imported_data = super::ImportedData { table_name, fields };

        Ok(imported_data)
    }
}
