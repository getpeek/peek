use crate::import::{ImportType, ImportedData};

use super::{Database, sanitize_table_name};
use serde_json::{Value, json};
use sqlx::{Column, MySqlConnection, Row, TypeInfo};
use std::collections::HashMap;

pub(crate) struct MysqlDatabase {
    connection: MySqlConnection,
    // information_schema never lists TEMPORARY tables, so imports are remembered here and
    // described with SHOW COLUMNS when the schema is read.
    imported_tables: Vec<String>,
}

impl MysqlDatabase {
    pub(crate) fn new(connection: MySqlConnection) -> Self {
        Self {
            connection,
            imported_tables: Vec::new(),
        }
    }
}

#[async_trait::async_trait]
impl Database for MysqlDatabase {
    async fn get_results(&mut self, query: &str) -> Result<Vec<Value>, String> {
        let rows = sqlx::query(query)
            .fetch_all(&mut self.connection)
            .await
            .map_err(|e| e.to_string())?;

        let mut results = Vec::new();
        for row in rows {
            let mut fields: Vec<(String, Value, &str)> = Vec::new();

            for (i, col) in row.columns().iter().enumerate() {
                let col_name = col.name();
                let type_name = col.type_info().name();

                let value: Value = match type_name {
                    "VARCHAR" | "CHAR" | "TEXT" | "TINYTEXT" | "MEDIUMTEXT" | "LONGTEXT" => row
                        .try_get::<String, _>(i)
                        .map_or(Value::Null, |v| json!(v)),

                    "DATE" => row
                        .try_get::<chrono::NaiveDate, _>(i)
                        .map_or(Value::Null, |v| json!(v.format("%Y-%m-%d").to_string())),

                    "DATETIME" | "TIMESTAMP" => row
                        .try_get::<chrono::NaiveDateTime, _>(i)
                        .map_or(Value::Null, |dt| {
                            json!(dt.format("%Y-%m-%dT%H:%M:%S").to_string())
                        }),

                    "TIME" => row
                        .try_get::<chrono::NaiveTime, _>(i)
                        .map_or(Value::Null, |t| json!(t.format("%H:%M:%S").to_string())),

                    "TINYINT" => {
                        if col.type_info().to_string().contains("(1)") {
                            row.try_get::<bool, _>(i).map_or(Value::Null, |v| json!(v))
                        } else {
                            row.try_get::<i8, _>(i).map_or(Value::Null, |v| json!(v))
                        }
                    }

                    "SMALLINT" => row.try_get::<i16, _>(i).map_or(Value::Null, |v| json!(v)),

                    "INT" | "MEDIUMINT" => {
                        row.try_get::<i32, _>(i).map_or(Value::Null, |v| json!(v))
                    }

                    "BIGINT" => row.try_get::<i64, _>(i).map_or(Value::Null, |v| json!(v)),

                    // MySQL Unsigned Integer types
                    "UNSIGNED TINYINT" => row.try_get::<u8, _>(i).map_or(Value::Null, |v| json!(v)),

                    "UNSIGNED SMALLINT" => {
                        row.try_get::<u16, _>(i).map_or(Value::Null, |v| json!(v))
                    }

                    "UNSIGNED INT" | "UNSIGNED MEDIUMINT" => {
                        row.try_get::<u32, _>(i).map_or(Value::Null, |v| json!(v))
                    }

                    "UNSIGNED BIGINT" => row.try_get::<u64, _>(i).map_or(Value::Null, |v| json!(v)),

                    "FLOAT" => row.try_get::<f32, _>(i).map_or(Value::Null, |v| json!(v)),

                    "DOUBLE" => row.try_get::<f64, _>(i).map_or(Value::Null, |v| json!(v)),

                    "DECIMAL" | "NUMERIC" => row
                        .try_get::<rust_decimal::Decimal, _>(i)
                        .map_or(Value::Null, |v| json!(v)),

                    "JSON" => row.try_get::<Value, _>(i).unwrap_or(Value::Null),

                    "BINARY" | "VARBINARY" | "BLOB" | "TINYBLOB" | "MEDIUMBLOB" | "LONGBLOB" => {
                        row.try_get::<Vec<u8>, _>(i).map_or(Value::Null, |bytes| {
                            use base64::Engine;
                            json!(base64::engine::general_purpose::STANDARD.encode(bytes))
                        })
                    }

                    "UUID" | "CHAR(36)" => row
                        .try_get::<String, _>(i)
                        .map_or(Value::Null, |v| json!(v)),

                    "ENUM" | "SET" => row
                        .try_get::<String, _>(i)
                        .map_or(Value::Null, |v| json!(v)),

                    _ => row
                        .try_get::<String, _>(i)
                        .map_or(Value::Null, |v| json!(v)),
                };

                fields.push((col_name.to_string(), value, type_name));
            }

            results.push(json!(fields));
        }

        Ok(results)
    }

    async fn execute(&mut self, query: &str) -> Result<String, String> {
        sqlx::query(query)
            .execute(&mut self.connection)
            .await
            .map_err(|e| e.to_string())?;

        Ok("ok".to_string())
    }

    async fn get_schema(
        &mut self,
    ) -> Result<
        (
            HashMap<String, Vec<(String, String)>>,
            HashMap<String, Vec<String>>,
            HashMap<String, Vec<String>>,
        ),
        String,
    > {
        let columns = sqlx::query(
            "SELECT table_name, column_name, column_type
             FROM information_schema.columns
             WHERE table_schema = DATABASE()
             ORDER BY table_name, ordinal_position",
        )
        .fetch_all(&mut self.connection)
        .await
        .map_err(|_| "Could not get columns".to_string())?;

        let mut schema_map: HashMap<String, Vec<(String, String)>> = HashMap::new();
        for row in columns {
            let table_name: String = row.get(0);
            let column_name: String = row.get(1);
            let column_type: String = row.get(2);
            schema_map
                .entry(table_name)
                .or_default()
                .push((column_name, column_type));
        }

        for table in &self.imported_tables {
            // A failed SHOW means the temp table is gone (session reset); skip it.
            let Ok(rows) = sqlx::query(format!("SHOW COLUMNS FROM `{table}`").as_str())
                .fetch_all(&mut self.connection)
                .await
            else {
                continue;
            };
            let columns = rows
                .iter()
                .map(|row| (row.get::<String, _>("Field"), row.get::<String, _>("Type")))
                .collect();
            schema_map.insert(table.clone(), columns);
        }

        let fk_rows = sqlx::query(
            "SELECT
                kcu.TABLE_NAME             AS referencing_table,
                kcu.COLUMN_NAME            AS referencing_column,
                kcu.REFERENCED_TABLE_NAME  AS referenced_table,
                kcu.REFERENCED_COLUMN_NAME AS referenced_column
             FROM information_schema.KEY_COLUMN_USAGE kcu
             WHERE kcu.TABLE_SCHEMA = DATABASE()
               AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
             ORDER BY kcu.TABLE_NAME, kcu.ORDINAL_POSITION",
        )
        .fetch_all(&mut self.connection)
        .await
        .map_err(|_| "Could not get foreign key info".to_string())?;

        let mut fk_map: HashMap<String, Vec<String>> = HashMap::new();
        for row in fk_rows {
            let referencing_table: String = row.get("referencing_table");
            let referencing_column: String = row.get("referencing_column");
            let referenced_table: String = row.get("referenced_table");
            let referenced_column: String = row.get("referenced_column");

            fk_map
                .entry(format!("{referenced_table}.{referenced_column}"))
                .or_default()
                .push(format!("{referencing_table}.{referencing_column}"));
        }

        let pk_rows = sqlx::query(
            "SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
                 ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema   = kcu.table_schema
                AND tc.table_name     = kcu.table_name
             WHERE tc.constraint_type = 'PRIMARY KEY'
               AND tc.table_schema    = DATABASE()
             ORDER BY tc.table_name, kcu.ordinal_position",
        )
        .fetch_all(&mut self.connection)
        .await
        .map_err(|_| "Could not get primary key info".to_string())?;

        let mut pk_map: HashMap<String, Vec<String>> = HashMap::new();
        for row in pk_rows {
            let table_name: String = row.get(0);
            let column_name: String = row.get(1);
            pk_map.entry(table_name).or_default().push(column_name);
        }

        Ok((schema_map, fk_map, pk_map))
    }

    async fn import_data(&mut self, data: ImportedData) -> Result<(), String> {
        let table_name = sanitize_table_name(&data.table_name);

        let Some(first) = data.fields.first() else {
            return Ok(());
        };

        let columns = first
            .iter()
            .map(|(name, kind)| {
                let col_type = match kind {
                    ImportType::Uuid(_) => "char(36)",
                    ImportType::Date(_) => "date",
                    ImportType::DateTime(_) => "datetime",
                    ImportType::Null | ImportType::Text(_) => "text",
                    ImportType::Number(_) => "bigint",
                    ImportType::Float(_) => "double",
                    ImportType::Boolean(_) => "boolean",
                    ImportType::Json(_) => "json",
                };
                format!("`{name}` {col_type}")
            })
            .collect::<Vec<String>>()
            .join(", ");

        let values = data
            .fields
            .iter()
            .map(|row| {
                let formatted_values = row
                    .iter()
                    .map(|(_, value)| match value {
                        ImportType::Uuid(uuid) => quote_literal(&uuid.to_string()),
                        ImportType::Date(date_val) => quote_literal(&date_val.to_string()),
                        ImportType::DateTime(datetime_val) => {
                            quote_literal(&datetime_val.to_string())
                        }
                        ImportType::Text(text) => quote_literal(text),
                        ImportType::Number(number) => format!("{number}"),
                        ImportType::Float(float) => format!("{float}"),
                        ImportType::Boolean(boolean) => format!("{boolean}"),
                        ImportType::Null => "NULL".to_string(),
                        ImportType::Json(json) => quote_literal(&json.to_string()),
                    })
                    .collect::<Vec<String>>()
                    .join(",");

                format!("({formatted_values})")
            })
            .collect::<Vec<_>>();

        sqlx::query(
            format!("CREATE TEMPORARY TABLE IF NOT EXISTS `{table_name}` ({columns})").as_str(),
        )
        .execute(&mut self.connection)
        .await
        .map_err(|e| format!("Could not create temporary table: {e}"))?;

        let column_names = first
            .iter()
            .map(|(name, _)| format!("`{name}`"))
            .collect::<Vec<_>>()
            .join(",");

        for chunk in values.chunks(500) {
            let chunk_values = chunk.join(",");
            sqlx::query(
                format!("INSERT INTO `{table_name}` ({column_names}) VALUES {chunk_values}")
                    .as_str(),
            )
            .execute(&mut self.connection)
            .await
            .map_err(|e| format!("Could not insert imported rows: {e}"))?;
        }

        if !self.imported_tables.contains(&table_name) {
            self.imported_tables.push(table_name);
        }

        Ok(())
    }
}

// MySQL's default sql_mode treats backslash as an escape character, so it must be
// doubled before the quotes are.
fn quote_literal(value: &str) -> String {
    format!("'{}'", value.replace('\\', "\\\\").replace('\'', "''"))
}
