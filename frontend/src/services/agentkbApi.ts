import type { AgentStatus, Config, StreamEvent, SummaryItem } from "../types/agentkb";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export type MeResponse = {
  role: "guest" | "interviewer";
  is_priority: boolean;
  current_pool: "guest" | "priority" | "byok";
  current_run: {
    run_id: string;
    status: string;
    pool: "guest" | "priority" | "byok";
    queue_position: number;
    estimated_wait_seconds: number;
  } | null;
  pools: {
    guest: PoolState;
    priority: PoolState;
  };
  queue: {
    running: number;
    queued: number;
    estimated_wait_seconds: number;
  };
  budget: {
    daily_budget_rmb: number;
    estimated_used_rmb: number;
    status: "available" | "tight" | "exhausted";
  };
  limits: {
    max_question_chars: number;
    max_upload_mb: number;
    max_session_chars: number;
    max_guest_queue: number;
    max_priority_queue: number;
  };
};

export type PoolState = {
  running: number;
  queued: number;
  max_running: number;
  max_queue: number;
  daily_budget_rmb: number;
  estimated_used_rmb: number;
  budget_status: "available" | "tight" | "exhausted";
};

type ChatRunRequest = {
  question: string;
  top_k: number;
  temperature: number;
  use_rerank: boolean;
  execution_mode: "server_key" | "byok";
};

type ChatRunResponse = {
  run_id: string;
  role: "guest" | "interviewer";
  pool: "guest" | "priority" | "byok";
  status: "queued" | "running";
  queue_position: number;
  estimated_wait_seconds: number;
  is_existing_active_run: boolean;
};

type DocumentUploadResponse = {
  document_id: string;
  filename: string;
  size_bytes: number;
  chunk_count: number;
  status: string;
  expires_at: string;
};

type SseHandlers = {
  onEvent: (event: StreamEvent) => void;
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const agentkbApi = {
  getMe: () => requestJson<MeResponse>("/me"),

  loginInterviewer: (code: string) =>
    requestJson<MeResponse>("/auth/interviewer", {
      method: "POST",
      body: JSON.stringify({ code })
    }),

  createChatRun: (question: string, config: Config) =>
    requestJson<ChatRunResponse>("/chat/runs", {
      method: "POST",
      body: JSON.stringify({
        question,
        top_k: config.topK,
        temperature: config.temperature,
        use_rerank: config.useRerank,
        execution_mode: config.byokEnabled ? "byok" : "server_key"
      } satisfies ChatRunRequest)
    }),

  streamChatRun: async (runId: string, handlers: SseHandlers) => {
    const response = await fetch(`${API_BASE}/chat/runs/${runId}/stream`, {
      credentials: "include"
    });
    if (!response.ok || !response.body) {
      throw new Error(`Stream failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      events.forEach((raw) => {
        const event = parseSse(raw);
        if (event) handlers.onEvent(event);
      });
    }
  },

  uploadDocument: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(`${API_BASE}/documents/upload`, {
      method: "POST",
      credentials: "include",
      body: form
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    return response.json() as Promise<DocumentUploadResponse>;
  }
};

const parseSse = (raw: string): StreamEvent | null => {
  const eventName = raw.split("\n").find((line) => line.startsWith("event:"))?.slice(6).trim();
  const dataLine = raw.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
  if (!eventName || !dataLine) return null;
  const data = JSON.parse(dataLine) as Record<string, unknown>;

  if (eventName === "queued") {
    return {
      type: "queued",
      position: Number(data.queue_position ?? 0),
      estimatedWait: Number(data.estimated_wait_seconds ?? 0)
    };
  }
  if (eventName === "running") return { type: "running" };
  if (eventName === "agent_step") {
    return {
      type: "agent_step",
      stepId: String(data.step),
      status: String(data.status) as AgentStatus,
      duration: data.duration ? String(data.duration) : undefined
    };
  }
  if (eventName === "token") {
    return { type: "token", text: String(data.text ?? ""), append: true };
  }
  if (eventName === "done") {
    const summaryData = data.summary as Partial<SummaryItem> | undefined;
    return {
      type: "done",
      summary: {
        id: `sum_${Date.now()}`,
        title: summaryData?.title ?? "新对话摘要",
        detail: summaryData?.detail ?? "已生成本地摘要，24 小时后自动删除。",
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      }
    };
  }
  if (eventName === "error") {
    return {
      type: "error",
      message: String(data.message ?? "当前服务繁忙，请稍后再试"),
      code: data.code ? String(data.code) : undefined
    };
  }
  return null;
};
