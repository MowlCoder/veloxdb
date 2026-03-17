use std::collections::BTreeMap;
use std::time::Instant;

use tauri::{AppHandle, State};
use tokio_postgres::SimpleQueryMessage;
use uuid::Uuid;

use crate::db::{
    build_pool, get_or_create_pool, list_connections, load_connection,
    persist_connection, quote_identifier, resolve_connection_id, AppState,
    MAX_QUERY_ROWS,
};
use crate::models::{
    ColumnInfo, ConnectionInput, ConnectionSummary, QueryRequest, QueryResult,
    SchemaRequest, StoredConnection, TableInfo,
};

#[tauri::command]
pub async fn connect_db(
    app: AppHandle,
    state: State<'_, AppState>,
    input: ConnectionInput,
) -> Result<ConnectionSummary, String> {
    let connection_id = input
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    let pool = build_pool(&input)?;
    let client = pool.get().await.map_err(|error| error.to_string())?;
    client
        .simple_query("select 1")
        .await
        .map_err(|error| error.to_string())?;

    let stored_connection = StoredConnection::from_input(connection_id.clone(), input);
    persist_connection(&app, &stored_connection)?;

    state
        .pools
        .write()
        .await
        .insert(connection_id.clone(), pool);

    *state.active_connection_id.write().await = Some(connection_id);

    Ok(stored_connection.summary())
}

#[tauri::command]
pub async fn list_connections_command(app: AppHandle) -> Result<Vec<ConnectionSummary>, String> {
    list_connections(&app)
}

#[tauri::command]
pub async fn set_active_connection(
    app: AppHandle,
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<ConnectionSummary, String> {
    let stored_connection = load_connection(&app, &connection_id)?
        .ok_or_else(|| "Stored connection details were not found.".to_string())?;
    let pool = get_or_create_pool(&app, &state, &connection_id).await?;
    let client = pool.get().await.map_err(|error| error.to_string())?;

    client
        .simple_query("select 1")
        .await
        .map_err(|error| error.to_string())?;

    *state.active_connection_id.write().await = Some(connection_id);

    Ok(stored_connection.summary())
}

#[tauri::command]
pub async fn run_query(
    app: AppHandle,
    state: State<'_, AppState>,
    input: QueryRequest,
) -> Result<QueryResult, String> {
    let connection_id = resolve_connection_id(&state, input.connection_id).await?;
    let sql = input.sql.trim();

    if sql.is_empty() {
        return Err("Enter a SQL statement before running the query.".to_string());
    }

    let pool = get_or_create_pool(&app, &state, &connection_id).await?;
    let client = pool.get().await.map_err(|error| error.to_string())?;

    let started_at = Instant::now();
    let messages = client
        .simple_query(sql)
        .await
        .map_err(|error| error.to_string())?;

    let mut columns = Vec::new();
    let mut rows = Vec::new();
    let mut total_rows = 0usize;
    let mut command_tag = None;

    for message in messages {
        match message {
            SimpleQueryMessage::RowDescription(description) => {
                if columns.is_empty() {
                    columns = description
                        .iter()
                        .map(|column| column.name().to_string())
                        .collect();
                }
            }
            SimpleQueryMessage::Row(row) => {
                total_rows += 1;

                if columns.is_empty() {
                    columns = row
                        .columns()
                        .iter()
                        .map(|column| column.name().to_string())
                        .collect();
                }

                if rows.len() >= MAX_QUERY_ROWS {
                    continue;
                }

                let mut mapped_row = BTreeMap::new();
                for (index, column_name) in columns.iter().enumerate() {
                    mapped_row.insert(column_name.clone(), row.get(index).map(str::to_owned));
                }
                rows.push(mapped_row);
            }
            SimpleQueryMessage::CommandComplete(count) => {
                command_tag = Some(count);
            }
            _ => {}
        }
    }

    Ok(QueryResult {
        columns,
        row_count: rows.len(),
        rows,
        execution_ms: started_at.elapsed().as_millis(),
        truncated: total_rows > MAX_QUERY_ROWS,
        command_tag,
    })
}

#[tauri::command]
pub async fn get_tables(
    app: AppHandle,
    state: State<'_, AppState>,
    connection_id: Option<String>,
) -> Result<Vec<TableInfo>, String> {
    let connection_id = resolve_connection_id(&state, connection_id).await?;
    let pool = get_or_create_pool(&app, &state, &connection_id).await?;
    let client = pool.get().await.map_err(|error| error.to_string())?;

    let rows = client
        .query(
            "
            select table_schema, table_name
            from information_schema.tables
            where table_type = 'BASE TABLE'
              and table_schema not in ('pg_catalog', 'information_schema')
            order by table_schema, table_name
            ",
            &[],
        )
        .await
        .map_err(|error| error.to_string())?;

    Ok(rows
        .into_iter()
        .map(|row| {
            let schema: String = row.get(0);
            let name: String = row.get(1);
            let preview_query = format!(
                "select * from \"{}\".\"{}\" limit 100;",
                quote_identifier(&schema),
                quote_identifier(&name)
            );

            TableInfo {
                schema,
                name,
                preview_query,
            }
        })
        .collect())
}

#[tauri::command]
pub async fn get_schema(
    app: AppHandle,
    state: State<'_, AppState>,
    input: SchemaRequest,
) -> Result<Vec<ColumnInfo>, String> {
    let connection_id = resolve_connection_id(&state, input.connection_id).await?;
    let pool = get_or_create_pool(&app, &state, &connection_id).await?;
    let client = pool.get().await.map_err(|error| error.to_string())?;

    let rows = client
        .query(
            "
            select table_schema, table_name, column_name, data_type, is_nullable
            from information_schema.columns
            where table_schema = $1 and table_name = $2
            order by ordinal_position
            ",
            &[&input.table_schema, &input.table_name],
        )
        .await
        .map_err(|error| error.to_string())?;

    Ok(rows
        .into_iter()
        .map(|row| ColumnInfo {
            table_schema: row.get(0),
            table_name: row.get(1),
            column_name: row.get(2),
            data_type: row.get(3),
            is_nullable: row.get::<_, String>(4) == "YES",
        })
        .collect())
}
