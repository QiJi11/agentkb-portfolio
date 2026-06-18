import { KeyRound, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Config, Role } from "../types/agentkb";

type ApiConfigPanelProps = {
  config: Config;
  role: Role;
  onConfigChange: (config: Config) => void;
  onOpenInterviewer: () => void;
};

const providerPresets = [
  { name: "OpenAI Compatible", baseUrl: "" },
  { name: "SiliconFlow", baseUrl: "https://api.siliconflow.cn/v1" },
  { name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { name: "阿里云百炼", baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { name: "Gemini", baseUrl: "" }
];

type ModelListResponse = {
  data?: Array<{ id?: string }>;
};

/**
 * API source configuration. Secrets stay in the browser and are never exported.
 */
export function ApiConfigPanel({ config, role, onConfigChange, onOpenInterviewer }: ApiConfigPanelProps) {
  const [models, setModels] = useState<string[]>([]);
  const [modelStatus, setModelStatus] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);

  const applyProviderPreset = (providerName: string) => {
    const preset = providerPresets.find((item) => item.name === providerName);
    onConfigChange({
      ...config,
      provider: providerName,
      baseUrl: config.baseUrl || preset?.baseUrl || ""
    });
  };

  const detectModels = async () => {
    if (!config.baseUrl.trim() || !config.userApiKey.trim()) return;
    setLoadingModels(true);
    setModelStatus("检测中...");
    try {
      const baseUrl = config.baseUrl.replace(/\/+$/, "");
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${config.userApiKey}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = (await response.json()) as ModelListResponse;
      const detected = (payload.data ?? [])
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));
      setModels(detected);
      setModelStatus(detected.length ? `检测到 ${detected.length} 个模型` : "未返回模型列表，可手动输入");
      if (!config.model && detected[0]) {
        onConfigChange({ ...config, model: detected[0] });
      }
    } catch (error) {
      setModelStatus(error instanceof Error ? `检测失败：${error.message}` : "检测失败");
    } finally {
      setLoadingModels(false);
    }
  };

  return (
    <div className="api-config-panel">
      <section className="api-config-section">
        <div className="api-config-head">
          <Server size={18} />
          <div>
            <strong>服务端默认 API</strong>
            <span>由服务端托管，前端不暴露 Key</span>
          </div>
        </div>
        <p>游客使用公开预算池，面试官登录后使用优先池。</p>
      </section>

      <section className="api-config-section">
        <div className="api-config-head">
          <KeyRound size={18} />
          <div>
            <strong>客户 API</strong>
            <span>不占用游客池或优先池额度</span>
          </div>
        </div>
        <label className="capacity-toggle">
          <input
            type="checkbox"
            checked={config.byokEnabled}
            onChange={(event) => onConfigChange({ ...config, byokEnabled: event.target.checked })}
          />
          启用客户 API 模式
        </label>
        <div className="api-fields">
          <label>
            Provider 下拉预设
            <select value={providerPresets.some((item) => item.name === config.provider) ? config.provider : ""} onChange={(event) => applyProviderPreset(event.target.value)}>
              <option value="">自定义</option>
              {providerPresets.map((preset) => (
                <option value={preset.name} key={preset.name}>{preset.name}</option>
              ))}
            </select>
          </label>
          <label>
            Provider 手动输入
            <input value={config.provider} onChange={(event) => onConfigChange({ ...config, provider: event.target.value })} />
          </label>
          <label>
            Base URL 手动输入
            <input value={config.baseUrl} onChange={(event) => onConfigChange({ ...config, baseUrl: event.target.value })} placeholder="https://api.example.com/v1" />
          </label>
          <label>
            Model 下拉检测
            <div className="model-detect-row">
              <select
                value={models.includes(config.model) ? config.model : ""}
                onChange={(event) => onConfigChange({ ...config, model: event.target.value })}
                disabled={!models.length}
              >
                <option value="">{models.length ? "选择检测到的模型" : "未检测"}</option>
                {models.map((model) => (
                  <option value={model} key={model}>{model}</option>
                ))}
              </select>
              <button type="button" onClick={detectModels} disabled={!config.baseUrl.trim() || !config.userApiKey.trim() || loadingModels}>
                <RefreshCw size={14} />
                {loadingModels ? "检测中" : "检测模型"}
              </button>
            </div>
            {modelStatus && <span>{modelStatus}</span>}
          </label>
          <label>
            Model 手动输入
            <input value={config.model} onChange={(event) => onConfigChange({ ...config, model: event.target.value })} />
          </label>
          <label>
            API Key
            <input
              type="password"
              value={config.userApiKey}
              onChange={(event) => onConfigChange({ ...config, userApiKey: event.target.value })}
              placeholder="仅保存在当前浏览器"
            />
          </label>
        </div>
        <p>API Key 不上传后端，不进入导出配置。</p>
      </section>

      <section className="api-config-section">
        <div className="api-config-head">
          <ShieldCheck size={18} />
          <div>
            <strong>优先账户</strong>
            <span>{role === "interviewer" ? "已启用优先池" : "访问码登录后使用优先池"}</span>
          </div>
        </div>
        <button className="capacity-inline-button" type="button" onClick={onOpenInterviewer}>
          <KeyRound size={15} />
          {role === "interviewer" ? "重新输入访问码" : "输入访问码"}
        </button>
      </section>
    </div>
  );
}
