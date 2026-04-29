# Multi-Database Architecture

## Overview

The Peek SQL client now supports multiple database types through a clean, trait-based architecture. The system automatically detects the database type from the connection string and routes queries to the appropriate handler.

## Supported Databases

- **PostgreSQL** - Full support for all PostgreSQL data types
- **MySQL/MariaDB** - Full support for MySQL data types including unsigned integers and binary types

## Architecture

### Core Components

1. **Database Trait** (`src/database/mod.rs`)
   - Defines the interface that all database implementations must follow
   - Two main methods: `get_results()` and `get_schema()`

2. **Database Implementations**
   - `src/database/postgres.rs` - PostgreSQL specific implementation
   - `src/database/mysql.rs` - MySQL specific implementation

3. **Command Layer** (`src/database_commands.rs`)
   - Tauri command handlers that act as dispatchers
   - Routes requests to the appropriate database implementation

4. **Connection Management** (`src/lib.rs`)
   - `DatabaseType` enum to track the current database type
   - `AppData` struct stores connection string and database type
   - Automatic detection based on connection string prefix

### Connection String Detection

The system automatically detects the database type from the connection string:

- **PostgreSQL**: `postgres://` or `postgresql://`
- **MySQL/MariaDB**: `mysql://` or `mariadb://`

## Adding a New Database Type

To add support for a new database (e.g., SQLite):

### 1. Update the DatabaseType Enum

In `src/lib.rs`:

```rust
#[derive(Debug)]
pub enum DatabaseType {
    PostgreSQL,
    MySQL,
    SQLite,  // Add new type
    Unknown,
}
```

### 2. Add Connection String Detection

In `src/lib.rs`, update the `set_connection` function:

```rust
} else if connection_string.starts_with("sqlite://")
    || connection_string.ends_with(".db")
    || connection_string.ends_with(".sqlite") {
    DatabaseType::SQLite
```

### 3. Create the Implementation

Create a new file `src/database/sqlite.rs`:

```rust
use crate::database::Database;
use serde_json::{json, Value};
use sqlx::{Column, Connection, SqliteConnection, Row, TypeInfo};
use std::collections::HashMap;

pub struct SqliteDatabase {
    connection_string: String,
}

impl SqliteDatabase {
    pub fn new(connection_string: &str) -> Self {
        Self {
            connection_string: connection_string.to_string(),
        }
    }
}

#[async_trait::async_trait]
impl Database for SqliteDatabase {
    async fn get_results(&self, query: &str) -> Result<Vec<Value>, String> {
        // Implementation here
    }

    async fn get_schema(&self) -> Result<(HashMap<String, Vec<String>>, HashMap<String, Vec<String>>), String> {
        // Implementation here
    }
}
```

### 4. Register the Module

In `src/database/mod.rs`:

```rust
pub mod mysql;
pub mod postgres;
pub mod sqlite;  // Add this
```

### 5. Update the Dispatchers

In `src/database_commands.rs`, add cases for the new database type:

```rust
DatabaseType::SQLite => {
    let db = SqliteDatabase::new(&state.connection_string);
    db.get_schema().await?  // or db.get_results(&query).await?
}
```

### 6. Update Dependencies

In `Cargo.toml`, add the necessary features to sqlx:

```toml
sqlx = { version = "0.8.6", features = [
    "postgres",
    "mysql",
    "sqlite",  # Add this
    # ... other features
] }
```

## Type Mapping

Each database implementation handles its native types and converts them to JSON values:

### PostgreSQL Types

- UUID → String
- TEXT/VARCHAR/CHAR → String
- DATE → String (YYYY-MM-DD)
- TIMESTAMP → String (ISO 8601)
- INT2/INT4/INT8 → Number
- FLOAT4/FLOAT8/NUMERIC → Number
- JSON/JSONB → JSON Value
- BOOL → Boolean

### MySQL Types

- VARCHAR/CHAR/TEXT → String
- DATE → String (YYYY-MM-DD)
- DATETIME/TIMESTAMP → String (ISO 8601)
- TINYINT/SMALLINT/INT/BIGINT → Number
- UNSIGNED variants → Number
- FLOAT/DOUBLE/DECIMAL → Number
- JSON → JSON Value
- BINARY/BLOB → Base64 String
- ENUM/SET → String

## Return Format

All database implementations return results in a consistent format:

```json
[
  [
    ["column_name", "value", "column_type"],
    ["id", 1, "INT4"],
    ["name", "John Doe", "VARCHAR"],
    ["created_at", "2024-01-01T12:00:00", "TIMESTAMP"]
  ]
]
```

## Error Handling

All database operations return `Result<T, String>` where errors are converted to user-friendly strings. Connection errors, query errors, and type conversion errors are all handled gracefully.

## Testing Different Databases

### PostgreSQL

```bash
# Connection string format
postgres://username:password@localhost:5432/database_name
```

### MySQL

```bash
# Connection string format
mysql://username:password@localhost:3306/database_name
```

### MariaDB

```bash
# Connection string format (same as MySQL)
mariadb://username:password@localhost:3306/database_name
```

## Future Enhancements

- Add support for more databases (SQLite, MongoDB, Redis)
- Add connection pooling for better performance
- Add query caching
- Add support for prepared statements
- Add transaction support
- Add migration support
