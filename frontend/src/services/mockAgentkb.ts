import type { AgentStep, Config, DocumentItem, Role, StreamEvent } from "../types/agentkb";
import { createId } from "../utils/format";

export const initialSteps: AgentStep[] = [
  { id: "planner", name: "Planner", detail: "判断是否需要检索知识库", status: "waiting" },
  { id: "retriever", name: "Retriever", detail: "执行 TopK 检索并整理来源", status: "waiting" },
  { id: "answer", name: "Answer", detail: "结合上下文生成回答", status: "waiting" },
  { id: "verifier", name: "Verifier", detail: "校验回答是否脱离资料", status: "waiting" }
];

export const initialConfig: Config = {
  provider: "OpenAI Compatible",
  baseUrl: "",
  model: "DeepSeek-V4-Flash",
  embeddingModel: "text-embedding-v4",
  userApiKey: "",
  topK: 8,
  temperature: 0.3,
  useRerank: false,
  byokEnabled: false
};

const demoAnswer =
  "基于当前上传的资料，AgentKB 会先判断问题是否需要检索，再从临时知识库中取出相关片段，最后生成带来源的回答。当前演示环境采用游客限额和面试官优先队列，上传的文档与向量索引会在 2 小时后清理。";

export const createMockDocument = (file: File): DocumentItem => ({
  id: createId(),
  name: file.name,
  size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
  chunks: Math.max(6, Math.round(file.size / 1400)),
  expiresAt: Date.now() + 2 * 60 * 60 * 1000,
  status: "parsing"
});

export const getMockQueueWait = (role: Role, readyDocumentCount: number) => {
  if (role === "interviewer") return 0;
  return readyDocumentCount > 0 ? 28 : 16;
};

export const exportSafeConfig = (config: Config) => ({
  version: "agentkb-config.v1",
  provider: config.provider,
  base_url: config.baseUrl,
  model: config.model,
  embedding_model: config.embeddingModel,
  top_k: config.topK,
  temperature: config.temperature,
  rerank_enabled: config.useRerank,
  theme: "light",
  ui_layout: "three-column"
});

export const createMockStreamEvents = (
  userQuestion: string,
  activeDocuments: DocumentItem[]
): Array<{ delay: number; event: StreamEvent }> => {
  const sources = activeDocuments.length ? activeDocuments.slice(0, 2).map((doc) => doc.name) : ["demo-context.md"];
  const answer = `${demoAnswer}\n\n**问题摘要**：${userQuestion}\n\n**来源**：${activeDocuments[0]?.name ?? "演示知识库片段"}`;
  const chars = answer.split("");
  const events: Array<{ delay: number; event: StreamEvent }> = [
    { delay: 0, event: { type: "running" } },
    { delay: 100, event: { type: "agent_step", stepId: "planner", status: "running" } },
    { delay: 800, event: { type: "agent_step", stepId: "planner", status: "success", duration: "0.8s" } },
    { delay: 900, event: { type: "agent_step", stepId: "retriever", status: "running" } },
    { delay: 1700, event: { type: "agent_step", stepId: "retriever", status: "success", duration: "1.7s" } },
    { delay: 1800, event: { type: "agent_step", stepId: "answer", status: "running" } },
    { delay: 4200, event: { type: "agent_step", stepId: "answer", status: "success", duration: "4.2s" } },
    { delay: 4300, event: { type: "agent_step", stepId: "verifier", status: "running" } },
    { delay: 5000, event: { type: "agent_step", stepId: "verifier", status: "success", duration: "5s" } }
  ];

  for (let index = 3; index <= chars.length + 3; index += 3) {
    events.push({
      delay: 1850 + index * 28,
      event: { type: "token", text: chars.slice(0, index).join(""), sources }
    });
  }

  events.push({
    delay: 1850 + chars.length * 28 + 120,
    event: {
      type: "done",
      summary: {
        id: createId(),
        title: userQuestion.slice(0, 18) || "新对话摘要",
        detail: "已生成本地摘要，24 小时后自动删除。",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }
    }
  });

  return events;
};
