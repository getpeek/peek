use super::Database;
use serde_json::{json, Value};
use sqlx::{Column, Connection, PgConnection, Row, TypeInfo};
use std::collections::HashMap;

pub struct PostgresDatabase {
    connection_string: String,
}

impl PostgresDatabase {
    pub fn new(connection_string: &str) -> Self {
        Self {
            connection_string: connection_string.to_string(),
        }
    }
}

#[async_trait::async_trait]
impl Database for PostgresDatabase {
    async fn get_results(&self, query: &str) -> Result<Vec<Value>, String> {
        let mut conn = PgConnection::connect(&self.connection_string)
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

    async fn execute(&self, query: &str) -> Result<String, String> {
        let mut conn = PgConnection::connect(&self.connection_string)
            .await
            .map_err(|e| e.to_string())?;

        sqlx::query(query)
            .execute(&mut conn)
            .await
            .map_err(|e| e.to_string())?;

        Ok("ok".to_string())
    }

    async fn get_schema(
        &self,
    ) -> Result<
        (
            HashMap<String, Vec<(String, String)>>,
            HashMap<String, Vec<String>>,
        ),
        String,
    > {
        let mut conn = PgConnection::connect(&self.connection_string)
            .await
            .map_err(|e| e.to_string())?;

        let columns = sqlx::query(
            r#"SELECT
                table_name,
                column_name,
                udt_name AS pg_type
            FROM information_schema.columns
            WHERE table_schema = 'public'"#,
        )
        .fetch_all(&mut conn)
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
        .fetch_all(&mut conn)
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
}
