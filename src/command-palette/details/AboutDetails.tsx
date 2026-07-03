import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";

export const AboutDetails = () => {
  const [version, setVersion] = useState<string>();

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <div className='cp-strip'>
      <span className='cp-strip-tag cp-strip-tag--quiet'>PEEK</span>
      <span className='cp-strip-desc'>Local-first database canvas</span>
      <span className='cp-strip-meta'>
        <span className='m-dim'>version</span>
        <span className='m-strong'>{version ?? "…"}</span>
      </span>
    </div>
  );
};
