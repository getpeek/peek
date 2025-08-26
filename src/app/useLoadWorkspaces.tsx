import { invoke } from "@tauri-apps/api/core";
import { Workspace } from "../Connection/types";
import { useSetAtom } from "jotai";
import { workspacesAtom } from "../Connection/state";
import { useEffect } from "react";

export const useLoadWorkspaces = () => {
  const setWorkspaces = useSetAtom(workspacesAtom);

  useEffect(() => {
    invoke("get_workspaces").then((workspaces) => {
      const config = JSON.parse(workspaces as string) as {
        workspaces: Workspace[];
      };
      setWorkspaces(config.workspaces);
    });
  }, []);
};
