use std::collections::HashMap;

use deadpool_postgres::{
    Config as PostgresConfig, ManagerConfig, Pool, RecyclingMethod, Runtime,
};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;
use tokio::sync::RwLock;
use tokio_postgres::NoTls;

use crate::models::{ConnectionInput, ConnectionSummary, StoredConnection};

pub const CONNECTION_STORE_PATH: &str = "connections.json";
pub const MAX_QUERY_ROWS: usize = 1000;

#[derive(Default)]
pub struct AppState {
    pub pools: RwLock<HashMap<String, Pool>>,
    pub active_connection_id: RwLock<Option<String>>,
}

pub fn build_pool(input: &ConnectionInput) -> Result<Pool, String> {
    let mut config = PostgresConfig::new();
    config.host = Some(input.host.clone());
    config.port = Some(input.port);
    config.dbname = Some(input.database.clone());
    config.user = Some(input.user.clone());
    config.password = Some(input.password.clone());
    config.manager = Some(ManagerConfig {
        recycling_method: RecyclingMethod::Fast,
    });

    config
        .create_pool(Some(Runtime::Tokio1), NoTls)
        .map_err(|error| error.to_string())
}

pub async fn resolve_connection_id(
    state: &AppState,
    requested_connection_id: Option<String>,
) -> Result<String, String> {
    if let Some(connection_id) = requested_connection_id {
        return Ok(connection_id);
    }

    state
        .active_connection_id
        .read()
        .await
        .clone()
        .ok_or_else(|| "Connect to a database before running this action.".to_string())
}

pub async fn get_or_create_pool(
    app: &AppHandle,
    state: &AppState,
    connection_id: &str,
) -> Result<Pool, String> {
    if let Some(pool) = state.pools.read().await.get(connection_id).cloned() {
        return Ok(pool);
    }

    let stored_connection = load_connection(app, connection_id)?
        .ok_or_else(|| "Stored connection details were not found.".to_string())?;

    let pool = build_pool(&ConnectionInput {
        id: Some(stored_connection.id.clone()),
        name: stored_connection.name.clone(),
        host: stored_connection.host.clone(),
        port: stored_connection.port,
        database: stored_connection.database.clone(),
        user: stored_connection.user.clone(),
        password: stored_connection.password.clone(),
    })?;

    state
        .pools
        .write()
        .await
        .insert(connection_id.to_string(), pool.clone());

    Ok(pool)
}

pub fn list_connections(app: &AppHandle) -> Result<Vec<ConnectionSummary>, String> {
    let store = app
        .store(CONNECTION_STORE_PATH)
        .map_err(|error| error.to_string())?;

    let mut connections = store
        .entries()
        .into_iter()
        .map(|(_, value)| {
            serde_json::from_value::<StoredConnection>(value).map_err(|error| error.to_string())
        })
        .collect::<Result<Vec<_>, _>>()?;

    connections.sort_by(|left, right| {
        right
            .connected_at
            .cmp(&left.connected_at)
            .then_with(|| left.name.cmp(&right.name))
    });

    Ok(connections
        .into_iter()
        .map(|connection| connection.summary())
        .collect())
}

pub fn persist_connection(app: &AppHandle, connection: &StoredConnection) -> Result<(), String> {
    let store = app
        .store(CONNECTION_STORE_PATH)
        .map_err(|error| error.to_string())?;

    store.set(
        connection.id.clone(),
        serde_json::to_value(connection).map_err(|error| error.to_string())?,
    );

    Ok(())
}

pub fn load_connection(
    app: &AppHandle,
    connection_id: &str,
) -> Result<Option<StoredConnection>, String> {
    let store = app
        .store(CONNECTION_STORE_PATH)
        .map_err(|error| error.to_string())?;

    store
        .get(connection_id)
        .map(|value| serde_json::from_value::<StoredConnection>(value).map_err(|error| error.to_string()))
        .transpose()
}

pub fn quote_identifier(value: &str) -> String {
    value.replace('"', "\"\"")
}
