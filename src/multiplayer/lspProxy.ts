// Host side of the web-guest LSP proxy: browser guests have no language
// server, so they put `lsp-requests/<nonce>/<kind>/<modelId>` entries carrying
// the query text, and the host mirrors its local LSP's answer onto the
// matching `lsp-responses/` key. Keys are stable per guest editor — iroh-docs
// deletes are author-scoped, so instead of unique keys + deletes each side
// overwrites its own key and LWW prunes the superseded version; correlation is
// the requestId echoed in the payload. Desktop joiners never take this path —
// they run the LSP locally against the synced schema.

import { invoke } from "@tauri-apps/api/core";
import { LSP_REQUESTS_PREFIX, lspResponseKey } from "./keys";
import { pushOperation } from "./syncBridgeUtils";
import type { LspCompletionItem, LspDiagnostic } from "../canvas/nodes/Query/Editor/lspTypes";

interface LspRequestPayload {
  requestId: string;
  uri: string;
  text: string;
  line?: number;
  character?: number;
}

function respond(key: string, body: Record<string, unknown>): void {
  pushOperation({ kind: "put", key, value: new TextEncoder().encode(JSON.stringify(body)) });
}

export async function handleLspRequest(key: string, value: Uint8Array): Promise<void> {
  const [nonce, kind, modelId] = key.slice(LSP_REQUESTS_PREFIX.length).split("/");
  if (!nonce || !modelId || (kind !== "completion" && kind !== "diagnostics")) {
    return;
  }

  let payload: LspRequestPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(value)) as LspRequestPayload;
  } catch (e) {
    console.error("multiplayer: bad lsp-request payload:", e);
    return;
  }

  const responseKey = lspResponseKey(nonce, kind, modelId);
  try {
    if (kind === "completion") {
      const items = await invoke<LspCompletionItem[]>("lsp_completion", {
        uri: payload.uri,
        text: payload.text,
        line: payload.line ?? 0,
        character: payload.character ?? 0,
      });
      respond(responseKey, { requestId: payload.requestId, items });
    } else {
      const diagnostics = await invoke<LspDiagnostic[]>("lsp_did_change", {
        uri: payload.uri,
        text: payload.text,
      });
      respond(responseKey, { requestId: payload.requestId, diagnostics });
    }
  } catch (e) {
    console.error("multiplayer: lsp-request failed:", e);
    // Settle the guest's pending request now rather than letting it time out.
    respond(
      responseKey,
      kind === "completion"
        ? { requestId: payload.requestId, items: [] }
        : { requestId: payload.requestId, diagnostics: [] },
    );
  }
}
