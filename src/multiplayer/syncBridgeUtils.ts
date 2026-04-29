import { invoke } from "@tauri-apps/api/core";
import { getDefaultStore } from "jotai";
import { nanoid } from "nanoid";
import { executeQueries } from "../canvas/executeQueries";
import { canvasApiAtom, resultsAtom } from "../canvas/state";
import { execRequestKey, bytesToB64 } from "./diff";
import type { AppNode } from "../canvas/types";
import type { DatabaseResult, Schema } from "../state";
import type { Operation } from "./types";

export interface HostSessionInfo {
  ticket: string;
  author: string;
  namespaceId: string;
}

export interface JoinSessionInfo {
  author: string;
  namespaceId: string;
}

export interface DocUpdatePayload {
  key: string;
  valueB64: string;
  author: string;
}

export interface DocDeletePayload {
  key: string;
  author: string;
}

export interface ExecRequestPayload {
  nodeId: string;
  queries: string[];
}

export interface MultiplayerControls {
  host: () => Promise<HostSessionInfo>;
  join: (ticket: string) => Promise<JoinSessionInfo>;
  end: () => Promise<void>;
}

export function pushOperation(op: Operation): void {
  if (op.kind === "put") {
    invoke("mp_doc_put", {
      key: op.key,
      valueB64: bytesToB64(op.value),
    }).catch((e) => console.error("mp_doc_put failed:", op.key, e));
  } else {
    invoke("mp_doc_del", { key: op.key }).catch((e) =>
      console.error("mp_doc_del failed:", op.key, e),
    );
  }
}

export function isSchemaShape(v: unknown): v is Schema {
  if (!v || typeof v !== "object") {
    return false;
  }
  const s = v as Record<string, unknown>;
  return (
    typeof s.tables === "object" &&
    s.tables !== null &&
    typeof s.references === "object" &&
    s.references !== null &&
    typeof s.primaryKeys === "object" &&
    s.primaryKeys !== null
  );
}

/**
 * Refresh the Rust-side LSP schema cache from a JS-side `Schema`. Joiners
 * never call `get_schema` (no DB connection), so without this the LSP
 * backend's `SchemaCache` stays empty and completions / diagnostics return
 * nothing. We push the host's schema to `schema/index` over the iroh-doc;
 * the inbound listener for that key both updates `schemaAtom` (for canvas
 * UI) and calls this to feed the LSP. Empty-schema calls route through
 * `lsp_clear_schema_cache` to keep the Rust side tidy.
 */
export function pushSchemaToLspCache(schema: Schema): void {
  const isEmpty =
    Object.keys(schema.tables).length === 0 &&
    Object.keys(schema.references).length === 0 &&
    Object.keys(schema.primaryKeys).length === 0;
  if (isEmpty) {
    invoke("lsp_clear_schema_cache").catch((e) =>
      console.error("lsp_clear_schema_cache failed:", e),
    );
    return;
  }
  invoke("lsp_set_schema_cache", {
    tables: schema.tables,
    references: schema.references,
    primaryKeys: schema.primaryKeys,
  }).catch((e) => console.error("lsp_set_schema_cache failed:", e));
}

/**
 * Joiner-side: forward an "execute these queries against this node" request to
 * the host via an `exec-requests/<id>` doc entry. The host's syncBridge picks
 * it up, runs against the host's DB, and propagates the result node + rows
 * back via the normal doc/results sync.
 */
export async function requestRemoteExecution(nodeId: string, queries: string[]): Promise<void> {
  const requestId = nanoid(8);
  const payload: ExecRequestPayload = { nodeId, queries };
  await invoke("mp_doc_put", {
    key: execRequestKey(requestId),
    valueB64: bytesToB64(new TextEncoder().encode(JSON.stringify(payload))),
  });
}

export async function handleExecRequest(key: string, value: Uint8Array): Promise<void> {
  const store = getDefaultStore();
  const canvas = store.get(canvasApiAtom);
  if (!canvas) {
    return;
  }

  let payload: ExecRequestPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(value)) as ExecRequestPayload;
  } catch (e) {
    console.error("multiplayer: bad exec-request payload:", e);
    invoke("mp_doc_del", { key }).catch(() => {});
    return;
  }

  const sourceNode = canvas.getNode(payload.nodeId) as AppNode | undefined;
  if (!sourceNode) {
    console.warn("multiplayer: exec-request for unknown node", payload.nodeId);
    invoke("mp_doc_del", { key }).catch(() => {});
    return;
  }

  const setResults = (
    updater:
      | Record<string, DatabaseResult>
      | ((prev: Record<string, DatabaseResult>) => Record<string, DatabaseResult>),
  ) => {
    // Delegating directly to the store avoids needing a hook context here;
    // the wrapped resultsAtom still notifies our outbound listener.
    store.set(resultsAtom, updater);
  };

  try {
    await executeQueries({ canvas, setResults, sourceNode, queries: payload.queries });
  } catch (e) {
    console.error("multiplayer: exec-request execution failed:", e);
  } finally {
    invoke("mp_doc_del", { key }).catch(() => {});
  }
}
