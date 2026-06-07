use crate::import::ImportedData;

use super::Database;
use serde_json::{Value, json};
use sqlx::{Column, Connection, MySqlConnection, Row, TypeInfo};
use std::collections::HashMap;

pub(crate) struct MysqlDatabase {
    connection_string: String,
}

impl MysqlDatabase {
    pub(crate) fn new(connection_string: &str) -> Self {
        Self {
            connection_string: connection_string.to_string(),
        }
    }
}

#[async_trait::async_trait]
impl Database for MysqlDatabase {
    async fn get_results(&mut self, query: &str) -> Result<Vec<Value>, String> {
        let mut conn = MySqlConnection::connect(&self.connection_string)
            .await
            .map_err(|e| e.to_string())?;

        let rows = sqlx::query(query)
            .fetch_all(&mut conn)
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
        let mut conn = MySqlConnection::connect(&self.connection_string)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query(query)
            .execute(&mut conn)
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
        let mut conn = MySqlConnection::connect(&self.connection_string)
            .await
            .map_err(|e| e.to_string())?;

        let db_name = self
            .connection_string
            .split('/')
            .next_back()
            .and_then(|s| s.split('?').next())
            .unwrap_or("mysql");

        let columns = sqlx::query(
            "SELECT table_name, column_name, column_type FROM information_schema.columns WHERE table_schema = ?",
        )
        .bind(db_name)
        .fetch_all(&mut conn)
        .await
        .map_err(|_| "Could not get columns".to_string())?;

        let mut schema_map = HashMap::new();
        let mut column_map = HashMap::new();

        for row in columns {
            let table_name = row.get::<String, _>(0);
            let column_name = row.get::<String, _>(1);
            let column_type = row.get::<String, _>(2);

            schema_map
                .entry(table_name.clone())
                .or_insert(Vec::new())
                .push((column_name.clone(), column_type.clone()));

            column_map
                .entry(table_name.clone())
                .or_insert(Vec::new())
                .push(column_name.clone());
        }

        let pk_rows = sqlx::query(
            "SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
             FROM information_schema.table_constraints tc
             JOIN information_schema.key_column_usage kcu
                 ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema   = kcu.table_schema
                AND tc.table_name     = kcu.table_name
             WHERE tc.constraint_type = 'PRIMARY KEY'
               AND tc.table_schema    = ?
             ORDER BY tc.table_name, kcu.ordinal_position",
        )
        .bind(db_name)
        .fetch_all(&mut conn)
        .await
        .map_err(|_| "Could not get primary key info".to_string())?;

        let mut pk_map: HashMap<String, Vec<String>> = HashMap::new();
        for row in pk_rows {
            let table_name: String = row.get(0);
            let column_name: String = row.get(1);
            pk_map.entry(table_name).or_default().push(column_name);
        }

        Ok((schema_map, column_map, pk_map))
    }

    async fn import_data(&mut self, _data: ImportedData) -> Result<(), String> {
        Ok(())
    }
}
