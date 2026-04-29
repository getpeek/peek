import { Connection } from "../Connection/types";

const DB_NAME = "PeekDatabase";
const DB_VERSION = 1;

const WORKSPACES_STORE = "workspaces";
const CONNECTIONS_STORE = "connections";
const SETTINGS_STORE = "settings";

export interface ConnectionRecord {
  id: string;
  workspaceName: string;
  connection: Connection;
}

export interface SettingsRecord {
  key: string;
  value: unknown;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  init(): Promise<void> {
    if (this.db) {
      return Promise.resolve();
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.addEventListener("error", () => {
        console.error("Failed to open IndexedDB:", request.error);
        reject(request.error);
      });

      request.addEventListener("success", () => {
        this.db = request.result;
        resolve();
      });

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(WORKSPACES_STORE)) {
          db.createObjectStore(WORKSPACES_STORE, {
            keyPath: "id",
            autoIncrement: true,
          });
        }

        if (!db.objectStoreNames.contains(CONNECTIONS_STORE)) {
          const connectionsStore = db.createObjectStore(CONNECTIONS_STORE, {
            keyPath: "id",
          });
          connectionsStore.createIndex("workspaceName", "workspaceName", {
            unique: false,
          });
        }

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

  async getActiveConnection(): Promise<
    { connection: Connection; workspaceName: string } | undefined
  > {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SETTINGS_STORE], "readonly");
      const store = transaction.objectStore(SETTINGS_STORE);
      const request = store.get("activeConnection");

      request.addEventListener("success", () => resolve(request.result?.value));
      request.addEventListener("error", () => reject(request.error));
    });
  }

  async saveActiveConnection(
    activeConnection: { connection: Connection; workspaceName: string } | undefined,
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

      transaction.addEventListener("complete", () => resolve());
      transaction.addEventListener("error", () => reject(transaction.error));
    });
  }
}

export const indexedDBService = new IndexedDBService();
