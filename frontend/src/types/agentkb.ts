import type { ReactNode } from "react";

export type Role = "guest" | "interviewer";

export type AgentStatus = "waiting" | "running" | "success" | "error";

export type QueueStatus = "idle" | "queued" | "running" | "done" | "error";

export type MobilePanel = "chat" | "docs" | "agent";

export type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: string[];
};

export type DocumentItem = {
  id: string;
  name: string;
  size: string;
  chunks: number;
  expiresAt: number;
  status: "parsing" | "chunking" | "embedding" | "ready";
};

export type AgentStep = {
  id: string;
  name: string;
  detail: string;
  status: AgentStatus;
  duration?: string;
};

export type SummaryItem = {
  id: string;
  title: string;
  detail: string;
  expiresAt: number;
};

export type Config = {
  provider: string;
  baseUrl: string;
  model: string;
  embeddingModel: string;
  userApiKey: string;
  topK: number;
  temperature: number;
  useRerank: boolean;
  byokEnabled: boolean;
};

export type QueueSnapshot = {
  status: QueueStatus;
  position: number;
  estimatedWait: number;
};

export type StreamEvent =
  | { type: "queued"; position: number; estimatedWait: number }
  | { type: "running" }
  | { type: "agent_step"; stepId: string; status: AgentStatus; duration?: string }
  | { type: "token"; text: string; sources?: string[]; append?: boolean }
  | { type: "done"; summary: SummaryItem }
  | { type: "error"; message: string; code?: string };

export type StatusPillProps = {
  icon: ReactNode;
  text: string;
  strong?: boolean;
};

export type SectionHeaderProps = {
  icon: ReactNode;
  title: string;
  action: string;
};
