import type { Config } from "../types/agentkb";
import { exportSafeConfig } from "./mockAgentkb";

export const downloadSafeConfig = (config: Config) => {
  const blob = new Blob([JSON.stringify(exportSafeConfig(config), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "agentkb-config.json";
  anchor.click();
  URL.revokeObjectURL(url);
};
