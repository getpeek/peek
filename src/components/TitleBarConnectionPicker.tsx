import React, { useEffect, useState } from "react";
import { Popover, Text } from "@mantine/core";
import { useAtom, useAtomValue } from "jotai";
import { activeConnectionAtom } from "../Connection/state";
import { schemaAtom } from "../state";
import { invoke } from "@tauri-apps/api/core";
import "./TitleBarConnectionPicker.css";
import { WorkspacePopover } from "../Connection/WorkspacePopover";

export const TitleBarConnectionPicker: React.FC = () => {
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

      const schema = await fetchSchema();
      setSchema(schema);
    } catch {
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Popover radius="lg" trapFocus>
      <Popover.Target>
        <div className="titlebar-connection-picker">
          {activeConnection ? (
            <button
              className="connection-button"
              style={{
                backgroundColor: `color-mix(in srgb, ${activeConnection.connection.color} 40%, 100% transparent)`,
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
            <button className="connection-button no-connection">
              <Text size="xs" className="connection-text">
                No connection
              </Text>
            </button>
          )}
        </div>
      </Popover.Target>
      <Popover.Dropdown
        bg="transparent"
        bd="none"
        p={0}
        style={{ backdropFilter: "blur(10px)" }}
      >
        <WorkspacePopover />
      </Popover.Dropdown>
    </Popover>
  );
};
