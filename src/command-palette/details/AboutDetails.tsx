import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";

export const AboutDetails = () => {
  const [version, setVersion] = useState<string>();

  useEffect(() => {
    getVersion().then(setVersion);
  }, []);

  return (
    <div className='details-about'>
      <div className='details-eyebrow'>Peek</div>
      <div className='details-title'>{version ? `Version ${version}` : "…"}</div>
    </div>
  );
};
