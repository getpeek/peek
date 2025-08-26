import { TLEditorSnapshot } from "tldraw";
import { Connection } from "../Connection/types";

const DB_NAME = "PeekDatabase";
const DB_VERSION = 1;

// Store names
const WORKSPACES_STORE = "workspaces";
const CONNECTIONS_STORE = "connections";
const DOCUMENTS_STORE = "documents";
const SETTINGS_STORE = "settings";

export interface DocumentRecord {
  id: string; // Composite key: `${workspaceName}:${connectionUrl}`
  workspaceName: string;
  connectionUrl: string;
  document: TLEditorSnapshot;
  updatedAt: number;
}

export interface ConnectionRecord {
  id: string; // Same as connection URL
  workspaceName: string;
  connection: Connection;
}

export interface SettingsRecord {
  key: string;
  value: any;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create workspaces store
        if (!db.objectStoreNames.contains(WORKSPACES_STORE)) {
          db.createObjectStore(WORKSPACES_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
        }

        // Create connections store (for active connection)
        if (!db.objectStoreNames.contains(CONNECTIONS_STORE)) {
          const connectionsStore = db.createObjectStore(CONNECTIONS_STORE, {
            keyPath: "id",
          });
          connectionsStore.createIndex("workspaceName", "workspaceName", {
            unique: false,
          });
        }

        // Create documents store with composite key
        if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
          const documentsStore = db.createObjectStore(DOCUMENTS_STORE, {
            keyPath: "id",
          });
          documentsStore.createIndex("workspaceName", "workspaceName", {
            unique: false,
          });
          documentsStore.createIndex("connectionUrl", "connectionUrl", {
            unique: false,
          });
          documentsStore.createIndex("updatedAt", "updatedAt", {
            unique: false,
          });
        }

        // Create settings store for misc settings
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error("Failed to initialize IndexedDB");
    }
    return this.db;
  }

  // Active connection operations
  async getActiveConnection(): Promise<
    { connection: Connection; workspaceName: string } | undefined
  > {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SETTINGS_STORE], "readonly");
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get("activeConnection");

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async saveActiveConnection(
    activeConnection:
      | { connection: Connection; workspaceName: string }
      | undefined,
  ): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SETTINGS_STORE], "readwrite");
      const store = transaction.objectStore(SETTINGS_STORE);

      if (activeConnection) {
        store.put({ key: "activeConnection", value: activeConnection });
      } else {
        store.delete("activeConnection");
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Document (snapshot) operations
  async getDocument(
    connectionUrl: string,
    workspaceName?: string,
  ): Promise<TLEditorSnapshot | undefined> {
    const db = await this.ensureDB();
    const id = workspaceName
      ? `${workspaceName}:${connectionUrl}`
      : connectionUrl;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], "readonly");
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as DocumentRecord | undefined;
        resolve(record?.document);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveDocument(
    connectionUrl: string,
    document: TLEditorSnapshot,
    workspaceName?: string,
  ): Promise<void> {
    const db = await this.ensureDB();
    const id = workspaceName
      ? `${workspaceName}:${connectionUrl}`
      : connectionUrl;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], "readwrite");
      const store = transaction.objectStore(DOCUMENTS_STORE);

      const record: DocumentRecord = {
        id,
        workspaceName: workspaceName || "",
        connectionUrl,
        document,
        updatedAt: Date.now(),
      };

      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDocuments(): Promise<Record<string, TLEditorSnapshot>> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], "readonly");
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result as DocumentRecord[];
        const snapshots: Record<string, TLEditorSnapshot> = {};

        records.forEach((record) => {
          // Use the connection URL as the key for backward compatibility
          snapshots[record.connectionUrl] = record.document;
        });

        resolve(snapshots);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(
    connectionUrl: string,
    workspaceName?: string,
  ): Promise<void> {
    const db = await this.ensureDB();
    const id = workspaceName
      ? `${workspaceName}:${connectionUrl}`
      : connectionUrl;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DOCUMENTS_STORE], "readwrite");
      const store = transaction.objectStore(DOCUMENTS_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const indexedDBService = new IndexedDBService();
