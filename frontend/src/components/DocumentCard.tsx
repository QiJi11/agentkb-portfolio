import { FileText } from "lucide-react";
import type { DocumentItem } from "../types/agentkb";
import { formatCountdown } from "../utils/format";

export function DocumentCard({ item }: { item: DocumentItem }) {
  const statusText = {
    parsing: "解析中",
    chunking: "分块中",
    embedding: "向量化中",
    ready: "可检索"
  }[item.status];

  return (
    <div className={`doc-card ${item.status}`}>
      <FileText size={18} />
      <div>
        <strong>{item.name}</strong>
        <span>{item.size} / {item.chunks} chunks</span>
        <small>{statusText}，{formatCountdown(item.expiresAt)} 后清理</small>
      </div>
    </div>
  );
}
