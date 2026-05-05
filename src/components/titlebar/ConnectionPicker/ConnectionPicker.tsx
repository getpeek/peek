import React, { useEffect, useState } from "react";
import { Popover, Text } from "@mantine/core";
import { useAtom, useAtomValue } from "jotai";
import { activeConnectionAtom } from "../../../Connection/state";
import { schemaAtom } from "../../../state";
import { invoke } from "@tauri-apps/api/core";
import "./ConnectionPicker.css";
import { WorkspacePopover } from "../../../Connection/WorkspacePopover";
import type { Connection } from "../../../Connection/types";
import { useHotkey } from "../../../app/useHotkey";
import { IconChevronDown } from "@tabler/icons-react";

export const ConnectionPicker: React.FC = () => {
  const [, setSchema] = useAtom(schemaAtom);
  const [, setIsConnecting] = useState(false);
  const activeConnection = useAtomValue(activeConnectionAtom);
  const [showPopover, setShowPopover] = useState(false);
  useHotkey("p", () => {
    setShowPopover(!showPopover);
  });
  useHotkey("escape", () => {
    setShowPopover(false);
  });

  const fetchSchema = async () => {
    const response = (await invoke("get_schema")) as string;
    return JSON.parse(response);
  };

  useEffect(() => {
    if (activeConnection) {
      setConnection(activeConnection.connection);
    }
    fetchSchema().then(setSchema);
  }, [activeConnection]);

  const setConnection = async (connection: Connection) => {
    setIsConnecting(true);

    try {
      await invoke("set_connection", {
        connectionString: connection.url,
        sshTunnel: connection.ssh_tunnel ?? null,
      });

      const schema = await fetchSchema();
      setSchema(schema);
    } catch {
    } finally {
      setIsConnecting(false);
    }
  };

  const connectionButton = (
    <button
      className='connection-button'
      style={{ "--pk-active-color": activeConnection?.connection.color } as React.CSSProperties}
    >
      <div className='connection-indicator' />
      <Text size='xs' className='connection-text'>
        {activeConnection?.workspaceName}
        <Text span c='var(--pk-fg-subtle)'>
          {" "}
          /{" "}
        </Text>
        <Text span c='inherit'>
          {activeConnection?.connection.name}
        </Text>
      </Text>
      <IconChevronDown size={8} />
    </button>
  );

  const noConnectionButton = (
    <button className='connection-button no-connection'>
      <Text size='xs' className='connection-text'>
        No connection
      </Text>
    </button>
  );

  return (
    <Popover radius='lg' trapFocus closeOnEscape opened={showPopover} onChange={setShowPopover}>
      <Popover.Target>
        <div
          className='titlebar-connection-picker'
          onClick={() => {
            setShowPopover(!showPopover);
          }}
        >
          {activeConnection ? connectionButton : noConnectionButton}
        </div>
      </Popover.Target>
      <Popover.Dropdown
        bg='transparent'
        bd='none'
        my={8}
        ml={-8}
        p={0}
        style={{ backdropFilter: "blur(10px)" }}
      >
        <WorkspacePopover onClose={() => setShowPopover(false)} />
      </Popover.Dropdown>
    </Popover>
  );
};
