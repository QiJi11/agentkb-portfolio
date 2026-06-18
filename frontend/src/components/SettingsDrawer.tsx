import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { Config } from "../types/agentkb";

type SettingsDrawerProps = {
  config: Config;
  setConfig: (value: Config) => void;
  onClose: () => void;
};

export function SettingsDrawer({ config, setConfig, onClose }: SettingsDrawerProps) {
  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.aside className="drawer" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: "spring", damping: 28 }}>
        <div className="drawer-head">
          <div>
            <strong>模型配置</strong>
            <span>只导出安全字段，不包含任何密钥</span>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭设置">
            <X size={18} />
          </button>
        </div>

        <label>
          Embedding Model
          <input value={config.embeddingModel} onChange={(event) => setConfig({ ...config, embeddingModel: event.target.value })} />
        </label>
        <label>
          TopK: {config.topK}
          <input type="range" min="3" max="12" value={config.topK} onChange={(event) => setConfig({ ...config, topK: Number(event.target.value) })} />
        </label>
        <label>
          Temperature: {config.temperature}
          <input type="range" min="0" max="1" step="0.1" value={config.temperature} onChange={(event) => setConfig({ ...config, temperature: Number(event.target.value) })} />
        </label>
        <label className="toggle-row">
          <input type="checkbox" checked={config.useRerank} onChange={(event) => setConfig({ ...config, useRerank: event.target.checked })} />
          开启 rerank
        </label>
        <span>Provider、Base URL、Model 和 API Key 请在左侧 API 页配置。</span>
      </motion.aside>
    </motion.div>
  );
}
