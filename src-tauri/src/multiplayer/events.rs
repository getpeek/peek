// Stage 4–5 will wire up additional events; allow the placeholder structs to
// land now so the JS side has a stable surface to listen against.
#![allow(dead_code)]

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DocUpdateEvent {
    pub key: String,
    pub value_b64: String,
    pub author: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DocDeleteEvent {
    pub key: String,
    pub author: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GossipRecvEvent {
    pub payload: serde_json::Value,
    pub author: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PeerPresenceEvent {
    pub author: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct SyncFinishedEvent {}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct SessionEndedEvent {}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PeerDisconnectedEvent {}

#[derive(Debug, Clone, Serialize)]
pub(crate) struct PeerReconnectedEvent {}
