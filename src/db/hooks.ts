import { useCallback, useEffect, useState } from "react";
import { indexedDBService } from "./IndexedDBService";
import { TLEditorSnapshot } from "tldraw";
import { Connection, Workspace } from "../Connection/types";

export function useIndexedDB() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    indexedDBService
      .init()
      .then(() => setIsReady(true))
      .catch((err) => {
        setError(err);
        console.error("Failed to initialize IndexedDB:", err);
      });
  }, []);

  return { isReady, error };
}

export function useDocument(
  connectionUrl: string | undefined,
  workspaceName?: string,
) {
  const [document, setDocument] = useState<TLEditorSnapshot | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!connectionUrl) {
      setDocument(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    indexedDBService
      .getDocument(connectionUrl, workspaceName)
      .then((doc) => {
        setDocument(doc);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [connectionUrl, workspaceName]);

  const saveDocument = useCallback(
    async (snapshot: TLEditorSnapshot) => {
      if (!connectionUrl) return;

      try {
        await indexedDBService.saveDocument(
          connectionUrl,
          snapshot,
          workspaceName,
        );
        setDocument(snapshot);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [connectionUrl, workspaceName],
  );

  const deleteDocument = useCallback(async () => {
    if (!connectionUrl) return;

    try {
      await indexedDBService.deleteDocument(connectionUrl, workspaceName);
      setDocument(undefined);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [connectionUrl, workspaceName]);

  return {
    document,
    isLoading,
    error,
    saveDocument,
    deleteDocument,
  };
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await indexedDBService.getWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const saveWorkspaces = useCallback(async (newWorkspaces: Workspace[]) => {
    try {
      await indexedDBService.saveWorkspaces(newWorkspaces);
      setWorkspaces(newWorkspaces);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    workspaces,
    isLoading,
    error,
    saveWorkspaces,
    refetch: loadWorkspaces,
  };
}

export function useActiveConnection() {
  const [activeConnection, setActiveConnection] = useState<
    { connection: Connection; workspaceName: string } | undefined
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    indexedDBService
      .getActiveConnection()
      .then((conn) => {
        setActiveConnection(conn);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, []);

  const saveActiveConnection = useCallback(
    async (
      connection: { connection: Connection; workspaceName: string } | undefined,
    ) => {
      try {
        await indexedDBService.saveActiveConnection(connection);
        setActiveConnection(connection);
      } catch (err) {
        setError(err as Error);
        throw err;
      }
    },
    [],
  );

  return {
    activeConnection,
    isLoading,
    error,
    saveActiveConnection,
  };
}
