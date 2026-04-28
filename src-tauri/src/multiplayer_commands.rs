use base64::{engine::general_purpose::STANDARD as B64, Engine as _};
use serde::Serialize;
use tauri::{async_runtime::Mutex, AppHandle, State};

use crate::multiplayer::{IrohNode, MultiplayerSession};
use crate::AppData;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HostSessionInfo {
    pub ticket: String,
    pub author: String,
    pub namespace_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinSessionInfo {
    pub author: String,
    pub namespace_id: String,
}

async fn ensure_node(state: &mut AppData) -> Result<&IrohNode, String> {
    if state.iroh.is_none() {
        let node = IrohNode::spawn().await.map_err(|e| e.to_string())?;
        state.iroh = Some(node);
    }
    state
        .iroh
        .as_ref()
        .ok_or_else(|| "iroh node missing after init".to_string())
}

#[tauri::command]
pub async fn mp_host_session(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
) -> Result<HostSessionInfo, String> {
    let mut state = state.lock().await;

    if state.session.is_some() {
        return Err("a multiplayer session is already active".to_string());
    }

    let node = ensure_node(&mut state).await?;
    let session = MultiplayerSession::host(node, app)
        .await
        .map_err(|e| e.to_string())?;

    let info = HostSessionInfo {
        ticket: session.ticket.clone(),
        author: format!("{}", session.author_id),
        namespace_id: format!("{}", session.namespace_id),
    };

    state.session = Some(session);
    Ok(info)
}

#[tauri::command]
pub async fn mp_join_session(
    app: AppHandle,
    state: State<'_, Mutex<AppData>>,
    ticket: String,
) -> Result<JoinSessionInfo, String> {
    let mut state = state.lock().await;

    if state.session.is_some() {
        return Err("a multiplayer session is already active".to_string());
    }

    let node = ensure_node(&mut state).await?;
    let session = MultiplayerSession::join(node, &ticket, app)
        .await
        .map_err(|e| e.to_string())?;

    let info = JoinSessionInfo {
        author: format!("{}", session.author_id),
        namespace_id: format!("{}", session.namespace_id),
    };

    state.session = Some(session);
    Ok(info)
}

#[tauri::command]
pub async fn mp_end_session(state: State<'_, Mutex<AppData>>) -> Result<(), String> {
    let mut state = state.lock().await;
    state.session.take();
    Ok(())
}

#[tauri::command]
pub async fn mp_doc_put(
    state: State<'_, Mutex<AppData>>,
    key: String,
    value_b64: String,
) -> Result<(), String> {
    let value = B64.decode(value_b64.as_bytes()).map_err(|e| e.to_string())?;
    let state = state.lock().await;
    let session = state
        .session
        .as_ref()
        .ok_or_else(|| "no active multiplayer session".to_string())?;
    session.put(&key, value).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mp_doc_del(
    state: State<'_, Mutex<AppData>>,
    key: String,
) -> Result<(), String> {
    let state = state.lock().await;
    let session = state
        .session
        .as_ref()
        .ok_or_else(|| "no active multiplayer session".to_string())?;
    session.del(&key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mp_gossip_send(
    state: State<'_, Mutex<AppData>>,
    payload: serde_json::Value,
) -> Result<(), String> {
    let state = state.lock().await;
    let session = state
        .session
        .as_ref()
        .ok_or_else(|| "no active multiplayer session".to_string())?;
    session
        .send_gossip(payload)
        .await
        .map_err(|e| e.to_string())
}
