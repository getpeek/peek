use std::collections::HashMap;

#[derive(Debug, Clone, Default)]
pub struct SchemaIndex {
    /// table name → ordered list of (column_name, column_type)
    pub tables: HashMap<String, Vec<Column>>,
    /// (referenced_table, referenced_column) → list of (referencing_table, referencing_column)
    /// i.e. "who points at me" — read straight from the upstream `references` map.
    pub fk_incoming: HashMap<(String, String), Vec<(String, String)>>,
    /// (referencing_table, referencing_column) → list of (referenced_table, referenced_column)
    /// i.e. "what I point at" — derived by inverting `fk_incoming`.
    pub fk_outgoing: HashMap<(String, String), Vec<(String, String)>>,
    /// table name → ordered primary-key columns
    pub primary_keys: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone)]
pub struct Column {
    pub name: String,
    pub data_type: String,
}

impl SchemaIndex {
    pub fn from_raw(
        tables: HashMap<String, Vec<(String, String)>>,
        references: HashMap<String, Vec<String>>,
        primary_keys: HashMap<String, Vec<String>>,
    ) -> Self {
        let tables = tables
            .into_iter()
            .map(|(name, cols)| {
                let columns = cols
                    .into_iter()
                    .map(|(name, data_type)| Column { name, data_type })
                    .collect();
                (name, columns)
            })
            .collect();

        let mut fk_incoming: HashMap<(String, String), Vec<(String, String)>> = HashMap::new();
        let mut fk_outgoing: HashMap<(String, String), Vec<(String, String)>> = HashMap::new();
        for (referenced_key, referencers) in references {
            let Some(referenced) = parse_table_column(&referenced_key) else {
                continue;
            };
            for referencer_key in referencers {
                let Some(referencer) = parse_table_column(&referencer_key) else {
                    continue;
                };
                fk_incoming
                    .entry(referenced.clone())
                    .or_default()
                    .push(referencer.clone());
                fk_outgoing
                    .entry(referencer)
                    .or_default()
                    .push(referenced.clone());
            }
        }

        Self {
            tables,
            fk_incoming,
            fk_outgoing,
            primary_keys,
        }
    }

    #[must_use]
    pub fn table_names(&self) -> impl Iterator<Item = &str> {
        self.tables.keys().map(String::as_str)
    }

    #[must_use]
    pub fn columns_of(&self, table: &str) -> Option<&[Column]> {
        self.tables.get(table).map(Vec::as_slice)
    }

    #[must_use]
    pub fn has_table(&self, table: &str) -> bool {
        self.tables.contains_key(table)
    }

    /// Find any FK between `left_table` and `right_table` in either direction.
    /// Returns `(left_column, right_column)` — the column on the left side,
    /// then on the right side, in the order the user wrote them.
    #[must_use]
    pub fn fk_between(&self, left_table: &str, right_table: &str) -> Option<(String, String)> {
        for ((from_table, from_col), targets) in &self.fk_outgoing {
            if from_table == left_table {
                for (to_table, to_col) in targets {
                    if to_table == right_table {
                        return Some((from_col.clone(), to_col.clone()));
                    }
                }
            }
            if from_table == right_table {
                for (to_table, to_col) in targets {
                    if to_table == left_table {
                        return Some((to_col.clone(), from_col.clone()));
                    }
                }
            }
        }
        None
    }
}

fn parse_table_column(key: &str) -> Option<(String, String)> {
    let (table, column) = key.split_once('.')?;
    Some((table.to_string(), column.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixture() -> SchemaIndex {
        let mut tables = HashMap::new();
        tables.insert(
            "users".to_string(),
            vec![
                ("id".to_string(), "uuid".to_string()),
                ("name".to_string(), "text".to_string()),
                ("organisation_id".to_string(), "uuid".to_string()),
            ],
        );
        tables.insert(
            "organisations".to_string(),
            vec![
                ("id".to_string(), "uuid".to_string()),
                ("name".to_string(), "text".to_string()),
            ],
        );

        // organisations.id is referenced by users.organisation_id
        let mut references = HashMap::new();
        references.insert(
            "organisations.id".to_string(),
            vec!["users.organisation_id".to_string()],
        );

        let mut primary_keys = HashMap::new();
        primary_keys.insert("users".to_string(), vec!["id".to_string()]);
        primary_keys.insert("organisations".to_string(), vec!["id".to_string()]);

        SchemaIndex::from_raw(tables, references, primary_keys)
    }

    #[test]
    fn from_raw_populates_tables_and_columns() {
        let schema = fixture();
        let users = schema.columns_of("users").expect("users exists");
        assert_eq!(users.len(), 3);
        assert_eq!(users[0].name, "id");
        assert_eq!(users[0].data_type, "uuid");
    }

    #[test]
    fn fk_outgoing_inverted_correctly() {
        let schema = fixture();
        let outgoing = schema
            .fk_outgoing
            .get(&("users".to_string(), "organisation_id".to_string()))
            .expect("users.organisation_id has outgoing");
        assert_eq!(
            outgoing,
            &vec![("organisations".to_string(), "id".to_string())]
        );
    }

    #[test]
    fn fk_between_in_both_directions() {
        let schema = fixture();
        let pair = schema
            .fk_between("users", "organisations")
            .expect("FK exists");
        assert_eq!(pair, ("organisation_id".to_string(), "id".to_string()));

        let reversed = schema
            .fk_between("organisations", "users")
            .expect("FK exists in reverse");
        assert_eq!(reversed, ("id".to_string(), "organisation_id".to_string()));
    }

    #[test]
    fn fk_between_returns_none_for_unrelated_tables() {
        let schema = fixture();
        assert!(schema.fk_between("users", "nonexistent").is_none());
    }
}
