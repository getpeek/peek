use std::{
    collections::{HashMap, HashSet},
    path::PathBuf,
};

use serde_json::Value;

use super::{normalize_column_name, normalize_table_name, ImportError, ImportType, ImportedData};

impl super::FileImporter {
    pub fn json(path: PathBuf) -> Result<ImportedData, ImportError> {
        let file = std::fs::read_to_string(path.clone()).map_err(|_| ImportError::FileNotFound)?;

        let json: Vec<HashMap<String, Value>> =
            serde_json::from_str(&file).map_err(|_| ImportError::BadData)?;

        let all_keys: HashSet<String> = json
            .iter()
            .flat_map(|row| {
                row.keys()
                    .map(normalize_column_name)
                    .collect::<Vec<String>>()
            })
            .collect();

        let mut fields: Vec<Vec<(String, ImportType)>> = vec![];
        for row in json {
            let mut current = vec![];
            for key in all_keys.iter() {
                if let Some(value) = row.get(key) {
                    if matches!(value, Value::String(_)) {
                        current.push((
                            key.to_string(),
                            ImportType::Text(value.as_str().unwrap().to_string()),
                        ));
                    } else if matches!(value, Value::Bool(_)) {
                        current.push((
                            key.to_string(),
                            ImportType::Boolean(value.as_bool().unwrap()),
                        ));
                    } else if matches!(value, Value::Object(_)) || matches!(value, Value::Array(_))
                    {
                        current.push((key.to_string(), ImportType::JSON(value.clone())));
                    } else if matches!(value, Value::Number(_)) {
                        current.push((
                            key.to_string(),
                            ImportType::Number(value.as_i64().unwrap_or(0) as isize),
                        ));
                    }
                } else {
                    current.push((key.to_string(), ImportType::Null));
                }
            }
            fields.push(current);
        }

        Ok(ImportedData {
            table_name: normalize_table_name(&path),
            fields,
        })
    }
}
