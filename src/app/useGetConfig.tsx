import { invoke } from "@tauri-apps/api/core";
import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { Config, configAtom } from "../state";

export const useGetConfig = () => {
  const setConfig = useSetAtom(configAtom);

  useEffect(() => {
    invoke("get_config").then((configString) => {
      const config = JSON.parse(configString as string) as Config;
      setConfig(config);
    });
  }, []);
};
