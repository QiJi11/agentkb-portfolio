import type { SectionHeaderProps, StatusPillProps } from "../types/agentkb";

export function StatusPill({ icon, text, strong = false }: StatusPillProps) {
  return (
    <span className={`status-pill ${strong ? "strong" : ""}`}>
      {icon}
      {text}
    </span>
  );
}

export function SectionHeader({ icon, title, action }: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div>
        {icon}
        <strong>{title}</strong>
      </div>
      <span>{action}</span>
    </div>
  );
}

export function EmptyLine({ text }: { text: string }) {
  return <div className="empty-line">{text}</div>;
}
