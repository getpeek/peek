import { useCallback, useEffect, useState } from "react";
import { indexedDBService } from "./IndexedDBService";
import { Connection } from "../Connection/types";

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
    async (connection: { connection: Connection; workspaceName: string } | undefined) => {
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
