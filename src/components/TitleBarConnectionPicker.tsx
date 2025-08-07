import React, { useEffect, useState } from "react";
import { Button, Modal, Text } from "@mantine/core";
import { useAtom, useAtomValue } from "jotai";
import { activeConnectionAtom } from "../Connection/state";
import { schemaAtom } from "../state";
import { WorkspacePanel } from "../Connection/WorkspacePanel";
import { invoke } from "@tauri-apps/api/core";
import "./TitleBarConnectionPicker.css";

export const TitleBarConnectionPicker: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [, setSchema] = useAtom(schemaAtom);
  const [, setIsConnecting] = useState(false);
  const activeConnection = useAtomValue(activeConnectionAtom);

  const fetchSchema = async () => {
    const response = (await invoke("get_schema")) as string;
    return JSON.parse(response);
  };

  useEffect(() => {
    if (activeConnection) {
      setConnection(activeConnection.connection.url);
    }
    fetchSchema().then(setSchema);
  }, [activeConnection]);

  const setConnection = async (url: string) => {
    setIsConnecting(true);

    try {
      await invoke("set_connection", { connectionString: url });

      const response = (await invoke("get_schema")) as string;
      const schema = JSON.parse(response);

      setSchema(schema);
      setShowModal(false);
    } catch {
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Modal
        size="lg"
        opened={showModal}
        onClose={() => setShowModal(false)}
        title="Workspaces"
      >
        <WorkspacePanel />
      </Modal>

      <div className="titlebar-connection-picker">
        {activeConnection ? (
          <button
            onClick={() => setShowModal(true)}
            className="connection-button"
            style={{
              backgroundColor: `color-mix(in srgb, ${activeConnection.connection.color} 20%, 100% transparent)`,
            }}
          >
            <div
              className="connection-indicator"
              style={{ backgroundColor: activeConnection.connection.color }}
            />
            <Text size="xs" className="connection-text">
              {activeConnection.connection.name} (
              {activeConnection.workspaceName})
            </Text>
          </button>
        ) : (
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setShowModal(true)}
            className="connection-button no-connection"
          >
            <Text size="xs" className="connection-text">
              No connection
            </Text>
          </Button>
        )}
      </div>
    </>
  );
};
