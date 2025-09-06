use crate::import::{ImportType, ImportedData};

use super::Database;
use serde_json::{json, Value};
use sqlx::{Column, PgConnection, Row, TypeInfo};
use std::collections::HashMap;

pub struct PostgresDatabase {
    connection: PgConnection,
}

impl PostgresDatabase {
    pub fn new(connection: PgConnection) -> Self {
        Self { connection }
    }
}

#[async_trait::async_trait]
impl Database for PostgresDatabase {
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
                    "UUID" => row
                        .try_get::<uuid::Uuid, _>(i)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),

                    "TEXT" | "VARCHAR" | "CHAR" => row
                        .try_get::<String, _>(i)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),

                    "DATE" => row
                        .try_get::<chrono::NaiveDate, _>(i)
                        .map(|v| json!(v.format("%Y-%m-%d").to_string()))
                        .unwrap_or(Value::Null),

                    "TIMESTAMP" => row
                        .try_get::<chrono::NaiveDateTime, _>(i)
                        .map(|dt| json!(dt.format("%Y-%m-%dT%H:%M:%S").to_string()))
                        .unwrap_or(Value::Null),

                    "TIMESTAMPTZ" => row
                        .try_get::<chrono::DateTime<chrono::Utc>, _>(i)
                        .map(|dt| json!(dt.to_rfc3339()))
                        .unwrap_or(Value::Null),

                    "INT2" => row
                        .try_get::<i16, _>(i)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),

                    "INT4" => row
                        .try_get::<i32, _>(i)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),

                    "INT8" => row
                        .try_get::<i64, _>(i)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),

                    "FLOAT4" | "FLOAT8" | "NUMERIC" => row
                        .try_get::<rust_decimal::Decimal, _>(i)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),

                    "JSON" | "JSONB" => row.try_get::<Value, _>(i).unwrap_or(Value::Null),

                    "BOOL" => row
                        .try_get::<bool, _>(i)
                        .map(|v| json!(v))
                        .unwrap_or(Value::Null),

                    _ => match row
                        .try_get_raw(i)
                        .map(|raw| raw.as_bytes())
                        .map_err(|_| "".to_string())?
                    {
                        Ok(bytes) => match std::str::from_utf8(bytes) {
                            Ok(s) => json!(s),
                            Err(_) => Value::Null,
                        },
                        Err(_) => Value::Null,
                    },
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
        ),
        String,
    > {
        let columns = sqlx::query(
            r#"SELECT
                c.table_name,
                c.column_name,
                c.udt_name AS pg_type
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'

            UNION ALL

            SELECT
                c.relname AS table_name,
                a.attname AS column_name,
                t.typname AS pg_type
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_attribute a ON a.attrelid = c.oid
            JOIN pg_type t ON t.oid = a.atttypid
            WHERE c.relpersistence = 't'
              AND a.attnum > 0
              AND NOT a.attisdropped;"#,
        )
        .fetch_all(&mut self.connection)
        .await
        .map_err(|_| "Could not get columns".to_string())?;

        let mut schema_map = HashMap::new();

        let column_map = columns
            .into_iter()
            .map(|row| {
                (
                    row.get::<String, _>(0),
                    row.get::<String, _>(1),
                    row.get::<String, _>(2),
                )
            })
            .collect::<Vec<(String, String, String)>>();

        for (table_name, column_name, column_type) in &column_map {
            schema_map
                .entry(table_name.clone())
                .or_insert(Vec::new())
                .push((column_name.clone(), column_type.clone()));
        }

        let fk_rows = sqlx::query(
            r#"
                SELECT
                    tc.table_name AS referencing_table,
                    kcu.column_name AS referencing_column,
                    ccu.table_name AS referenced_table,
                    ccu.column_name AS referenced_column
                FROM
                    information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                  AND tc.table_schema = 'public';
                "#,
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

            let referenced_key = format!("{}.{}", referenced_table, referenced_column);
            let referencing_key = format!("{}.{}", referencing_table, referencing_column);

            fk_map
                .entry(referenced_key)
                .or_default()
                .push(referencing_key);
        }

        Ok((schema_map, fk_map))
    }

    async fn import_data(&mut self, data: ImportedData) -> Result<(), String> {
        let table_name = sanitize_table_name(&data.table_name);

        let fields_vec: Vec<_> = data.fields.iter().collect();

        let Some(first) = fields_vec.first() else {
            return Ok(());
        };

        let columns = first
            .iter()
            .map(|(name, kind)| {
                let col_type = match kind {
                    ImportType::UUID(_) => "uuid",
                    ImportType::Date(_) => "date",
                    ImportType::DateTime(_) => "datetime",
                    ImportType::Null | ImportType::Text(_) => "text",
                    ImportType::Number(_) => "int",
                    ImportType::Float(_) => "numeric",
                    ImportType::Boolean(_) => "boolean",
                    ImportType::JSON(_) => "json",
                };
                format!("{name} {col_type}")
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
                        ImportType::UUID(uuid) => format!("'{uuid}'"),
                        ImportType::Date(date) => format!("'{date}'"),
                        ImportType::DateTime(date) => format!("'{date}'"),
                        ImportType::Text(text) => format!("'{text}'"),
                        ImportType::Number(number) => format!("{number}"),
                        ImportType::Float(float) => format!("{float}",),
                        ImportType::Boolean(boolean) => format!("{boolean}"),
                        ImportType::Null => "NULL".to_string(),
                        ImportType::JSON(json) => format!("'{json}'"),
                    })
                    .collect::<Vec<String>>()
                    .join(",");

                format!("({})", formatted_values)
            })
            .collect::<Vec<_>>();

        sqlx::query(format!("CREATE TEMP TABLE IF NOT EXISTS {table_name} ({columns})").as_str())
            .execute(&mut self.connection)
            .await
            .map_err(|_| "Could not create temporary table ".to_string())?;

        for chunk in values.chunks(1) {
            let chunk_values = chunk.join(",");
            let column_names = first
                .iter()
                .map(|(name, _)| name)
                .cloned()
                .collect::<Vec<_>>()
                .join(",");

            if let Err(err) = sqlx::query(
                format!("INSERT INTO {table_name} ({column_names}) VALUES {chunk_values}").as_str(),
            )
            .execute(&mut self.connection)
            .await
            {
                eprintln!("{err:?}");
            }
        }

        Ok(())
    }
}

pub(crate) fn sanitize_table_name(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '_')
        .collect::<String>()
        .replace('-', " ")
        .to_lowercase();

    if sanitized.chars().next().is_some_and(|c| c.is_numeric()) {
        format!("t_{}", sanitized)
    } else if sanitized.is_empty() {
        "imported_table".to_string()
    } else {
        sanitized
    }
}
