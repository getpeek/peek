import React, { useState } from "react";
import { Button, Modal, Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { activeConnectionAtom } from "../Connection/state";
import { WorkspacePanel } from "../Connection/WorkspacePanel";
import "./TitleBarConnectionPicker.css";

export const TitleBarConnectionPicker: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const activeConnection = useAtomValue(activeConnectionAtom);

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
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setShowModal(true)}
            className="connection-button"
            style={{
              backgroundColor: `${activeConnection.connection.color}30`,
              borderColor: `${activeConnection.connection.color}60`,
              border: `1px solid ${activeConnection.connection.color}60`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${activeConnection.connection.color}45`;
              e.currentTarget.style.borderColor = `${activeConnection.connection.color}80`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${activeConnection.connection.color}30`;
              e.currentTarget.style.borderColor = `${activeConnection.connection.color}60`;
            }}
            leftSection={
              <div
                className="connection-indicator"
                style={{ backgroundColor: activeConnection.connection.color }}
              />
            }
          >
            <Text size="xs" className="connection-text">
              {activeConnection.connection.name} (
              {activeConnection.workspaceName})
            </Text>
          </Button>
        ) : (
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setShowModal(true)}
            className="connection-button"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderColor: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
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
