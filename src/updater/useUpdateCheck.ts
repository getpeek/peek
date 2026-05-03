import { useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type InstallState = "idle" | "downloading" | "installing" | "error";

interface UseUpdateCheckResult {
  update: Update | null;
  installState: InstallState;
  progress: number;
  errorMessage: string | null;
  dismiss: () => void;
  install: () => Promise<void>;
}

export function useUpdateCheck(): UseUpdateCheckResult {
  const [update, setUpdate] = useState<Update | null>(null);
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // StrictMode runs effects twice in dev; the network check is harmless to
  // repeat but the ref keeps logs clean.
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) {
      return;
    }
    checkedRef.current = true;

    check()
      .then(result => {
        if (result) {
          setUpdate(result);
        }
      })
      .catch((e: unknown) => {
        // Updater failures must never block app launch.
        console.warn("updater: check failed", e);
      });
  }, []);

  const dismiss = () => setUpdate(null);

  const install = async () => {
    if (!update) {
      return;
    }
    setInstallState("downloading");
    setErrorMessage(null);
    setProgress(0);
    let total = 0;
    let downloaded = 0;
    try {
      await update.downloadAndInstall(event => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
          downloaded = 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setProgress(downloaded / total);
          }
        } else if (event.event === "Finished") {
          setInstallState("installing");
        }
      });
      await relaunch();
    } catch (e: unknown) {
      setInstallState("error");
      setErrorMessage(e instanceof Error ? e.message : String(e));
    }
  };

  return { update, installState, progress, errorMessage, dismiss, install };
}
