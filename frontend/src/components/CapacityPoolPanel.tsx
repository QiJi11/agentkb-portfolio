import { Activity, Gauge, KeyRound, RefreshCw, Server, ShieldCheck, UsersRound } from "lucide-react";
import type { MeResponse, PoolState } from "../services/agentkbApi";
import type { Config, Role } from "../types/agentkb";

type CapacityPoolPanelProps = {
  config: Config;
  identity: MeResponse | null;
  role: Role;
  updatedAt: number | null;
  onExport: () => void;
  onRefresh: () => void;
  onOpenInterviewer: () => void;
  variant?: "wide" | "sidebar";
};

type PoolKey = "priority" | "guest" | "byok";

type PoolCardView = {
  key: PoolKey;
  title: string;
  description: string;
  badge: string;
  tone: "normal" | "tight" | "unavailable" | "local";
  active: boolean;
  icon: "guest" | "priority" | "byok";
  rows: Array<{ label: string; value: string }>;
  meter?: number;
  action?: "interviewer";
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const queuePercent = (state: PoolState) => clampPercent((state.queued / Math.max(1, state.max_queue)) * 100);

const budgetPercent = (state: PoolState) =>
  clampPercent((state.estimated_used_rmb / Math.max(0.01, state.daily_budget_rmb)) * 100);

const budgetLabel = (state: PoolState) => {
  if (state.budget_status === "exhausted") return "不可用";
  if (state.budget_status === "tight") return "资源紧张";
  return "正常";
};

const statusTone = (state: PoolState): PoolCardView["tone"] => {
  if (state.budget_status === "exhausted" || state.queued >= state.max_queue) return "unavailable";
  if (state.budget_status === "tight" || state.queued / Math.max(1, state.max_queue) >= 0.8) return "tight";
  return "normal";
};

const formatTime = (value: number | null) => {
  if (!value) return "尚未同步";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const iconFor = (icon: PoolCardView["icon"]) => {
  if (icon === "priority") return <ShieldCheck size={18} />;
  if (icon === "byok") return <Server size={18} />;
  return <UsersRound size={18} />;
};

const poolName = (pool: PoolKey) => {
  if (pool === "priority") return "优先池";
  if (pool === "byok") return "客户 API 硬件池";
  return "游客池";
};

const resolveCurrentPool = (config: Config, identity: MeResponse | null, role: Role): PoolKey => {
  if (config.byokEnabled) return "byok";
  if (identity?.current_pool) return identity.current_pool;
  return role === "interviewer" ? "priority" : "guest";
};

const currentRunText = (identity: MeResponse | null, currentPool: PoolKey, config: Config) => {
  if (currentPool === "byok" && !config.userApiKey.trim()) return "等待本地密钥";
  if (!identity?.current_run) return currentPool === "byok" ? "硬件池空闲" : "暂无排队";
  if (identity.current_run.status === "running") return currentPool === "byok" ? "硬件池执行中" : "执行中";
  return `排队第 ${identity.current_run.queue_position} 位`;
};

const currentWaitText = (identity: MeResponse | null, currentPool: PoolKey, config: Config) => {
  if (currentPool === "byok" && !config.userApiKey.trim()) return "填写 Key 后可用";
  if (!identity?.current_run) return "无需等待";
  if (identity.current_run.status === "running") return "正在执行";
  return `预计 ${identity.current_run.estimated_wait_seconds}s`;
};

/**
 * Shows the active dispatch pool first, then separates priority, guest, and BYOK hardware capacity.
 */
export function CapacityPoolPanel({
  config,
  identity,
  role,
  updatedAt,
  onExport,
  onRefresh,
  onOpenInterviewer,
  variant = "wide"
}: CapacityPoolPanelProps) {
  const guest = identity?.pools.guest;
  const priority = identity?.pools.priority;
  const currentPool = resolveCurrentPool(config, identity, role);

  const cards: PoolCardView[] = [];
  if (priority) {
    cards.push({
      key: "priority",
      title: "优先池",
      description: role === "interviewer" ? "当前账号已启用优先调度" : "访问码登录后启用，不占游客池",
      badge: role === "interviewer" ? "当前可用" : "待登录",
      tone: statusTone(priority),
      active: currentPool === "priority",
      icon: "priority",
      meter: queuePercent(priority),
      action: role === "interviewer" ? undefined : "interviewer",
      rows: [
        { label: "运行", value: `${priority.running}/${priority.max_running}` },
        { label: "排队", value: `${priority.queued}/${priority.max_queue}` },
        { label: "预算剩余", value: `${Math.max(0, priority.daily_budget_rmb - priority.estimated_used_rmb).toFixed(1)} 元` },
        { label: "预算使用", value: `${Math.round(budgetPercent(priority))}%` }
      ]
    });
  }
  if (guest) {
    cards.push({
      key: "guest",
      title: "游客池",
      description: "公开预算与匿名访问共享，不做固定每日 5 次限制",
      badge: budgetLabel(guest),
      tone: statusTone(guest),
      active: currentPool === "guest",
      icon: "guest",
      meter: queuePercent(guest),
      rows: [
        { label: "运行", value: `${guest.running}/${guest.max_running}` },
        { label: "排队", value: `${guest.queued}/${guest.max_queue}` },
        { label: "预算剩余", value: `${Math.max(0, guest.daily_budget_rmb - guest.estimated_used_rmb).toFixed(1)} 元` },
        { label: "预算使用", value: `${Math.round(budgetPercent(guest))}%` }
      ]
    });
  }
  cards.push({
      key: "byok",
      title: "客户 API 硬件池",
      description: "不消耗游客池或优先池额度，只受服务器硬件并发限制",
      badge: config.byokEnabled ? (config.userApiKey.trim() ? "已启用" : "等待密钥") : "未启用",
      tone: "local",
      active: currentPool === "byok",
      icon: "byok",
      rows: [
        { label: "当前状态", value: currentPool === "byok" ? currentRunText(identity, currentPool, config) : "空闲" },
        { label: "等待时间", value: currentPool === "byok" ? currentWaitText(identity, currentPool, config) : "无需等待" },
        { label: "公开额度", value: "不消耗" },
        { label: "密钥保存", value: config.userApiKey.trim() ? "浏览器本地" : "未填写" }
      ]
    });

  const activeCard = cards.find((card) => card.key === currentPool);
  const defaultOrder: PoolKey[] = ["priority", "guest", "byok"];
  const otherCards = cards
    .filter((card) => card.key !== currentPool)
    .sort((a, b) => defaultOrder.indexOf(a.key) - defaultOrder.indexOf(b.key));
  const orderedCards = activeCard ? [activeCard, ...otherCards] : cards;

  const renderCurrentBoard = () => (
    <div className="capacity-current-board">
      <div className="capacity-current-icon">
        <Activity size={18} />
      </div>
      <div>
        <span>当前账号</span>
        <strong>{poolName(currentPool)}</strong>
      </div>
      <div>
        <span>排队位置</span>
        <strong>{currentRunText(identity, currentPool, config)}</strong>
      </div>
      <div>
        <span>预计等待</span>
        <strong>{currentWaitText(identity, currentPool, config)}</strong>
      </div>
    </div>
  );

  const renderPoolOverview = () => {
    const guestText = guest ? `排队 ${guest.queued}/${guest.max_queue}` : "未同步";
    const priorityText = priority ? `排队 ${priority.queued}/${priority.max_queue}` : "未同步";
    const byokText = currentPool === "byok" ? currentRunText(identity, currentPool, config) : config.byokEnabled ? "硬件空闲" : "关闭";
    const byokMeter = !config.byokEnabled || !config.userApiKey.trim() ? 0 : identity?.current_pool === "byok" && identity.current_run ? 65 : 20;
    const overviewRows = [
      {
        key: "priority",
        icon: <ShieldCheck size={15} />,
        label: "优先池",
        value: priorityText,
        meter: priority ? queuePercent(priority) : 0
      },
      {
        key: "guest",
        icon: <UsersRound size={15} />,
        label: "游客池",
        value: guestText,
        meter: guest ? queuePercent(guest) : 0
      },
      {
        key: "byok",
        icon: <Server size={15} />,
        label: "客户 API",
        value: byokText,
        meter: byokMeter
      }
    ];

    return (
      <div className="capacity-overview">
        {overviewRows.map((row) => (
          <div className={`capacity-overview-row ${row.key}`} key={row.key}>
            <div className="capacity-overview-line">
              {row.icon}
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
            <div className="meter mini">
              <i style={{ width: `${row.meter}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCard = (card: PoolCardView) => (
    <article className={`capacity-card ${card.tone} ${card.active ? "active" : ""}`} key={card.key}>
      <div className="capacity-card-head">
        <div className="capacity-card-icon">{iconFor(card.icon)}</div>
        <div>
          <strong>{card.title}</strong>
          <span>{card.description}</span>
        </div>
        <small>{card.badge}</small>
      </div>
      {typeof card.meter === "number" && (
        <div className="capacity-card-meter">
          <div>
            <span>队列占用</span>
            <span>{Math.round(card.meter)}%</span>
          </div>
          <div className="meter">
            <i style={{ width: `${card.meter}%` }} />
          </div>
        </div>
      )}
      <div className="capacity-stat-grid">
        {card.rows.map((row) => (
          <div key={`${card.key}-${row.label}`}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </div>
        ))}
      </div>
      {card.action === "interviewer" && (
        <button className="capacity-inline-button" type="button" onClick={onOpenInterviewer}>
          <KeyRound size={15} />
          输入访问码
        </button>
      )}
    </article>
  );

  const renderCompactCard = (card: PoolCardView) => {
    const primaryRows = card.key === "guest" ? card.rows.slice(0, 3) : card.rows.slice(0, 2);
    const byokHardwareState = currentPool === "byok" ? currentRunText(identity, currentPool, config) : "空闲";
    const compactRows =
      card.key === "byok"
        ? [
            { label: "公开额度", value: "不消耗" },
            { label: "硬件状态", value: byokHardwareState }
          ]
        : primaryRows;

    return (
      <article className={`capacity-compact-card ${card.tone} ${card.active ? "active" : ""}`} key={card.key}>
        <div className="capacity-compact-head">
          <div className="capacity-compact-icon">{iconFor(card.icon)}</div>
          <div>
            <strong>{card.title}</strong>
            <span>{card.description}</span>
          </div>
          <small>{card.badge}</small>
        </div>
        {typeof card.meter === "number" && (
          <div className="meter mini">
            <i style={{ width: `${card.meter}%` }} />
          </div>
        )}
        <div className="capacity-compact-lines">
          {compactRows.map((row) => (
            <div key={`${card.key}-compact-${row.label}`}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
        {card.action === "interviewer" && (
          <button className="capacity-inline-button" type="button" onClick={onOpenInterviewer}>
            <KeyRound size={15} />
            输入访问码
          </button>
        )}
      </article>
    );
  };

  if (variant === "sidebar") {
    return (
      <section className="capacity-panel sidebar-mode">
        <div className="capacity-side-head">
          <div>
            <strong>容量调度</strong>
            <span>更新于 {formatTime(updatedAt)}</span>
          </div>
          <button type="button" onClick={onRefresh} aria-label="刷新容量池">
            <RefreshCw size={15} />
          </button>
        </div>

        {renderCurrentBoard()}
        {renderPoolOverview()}

        <div className="capacity-list">
          {activeCard && <span className="capacity-group-label">当前使用</span>}
          {activeCard && renderCompactCard(activeCard)}
          {!!otherCards.length && <span className="capacity-group-label">其他容量</span>}
          {otherCards.map(renderCompactCard)}
        </div>
      </section>
    );
  }

  return (
    <section className="capacity-panel">
      <div className="capacity-head">
        <div className="capacity-title">
          <div className="capacity-icon">
            <Gauge size={20} />
          </div>
          <div>
            <strong>容量调度看板</strong>
            <span>当前账号位置独立展示，池子容量与 API 配置分离</span>
          </div>
        </div>
        <div className="capacity-actions">
          <span>更新于 {formatTime(updatedAt)}</span>
          <button type="button" onClick={onRefresh}>
            <RefreshCw size={16} />
            刷新
          </button>
          <button type="button" onClick={onExport}>导出安全配置</button>
        </div>
      </div>

      {renderCurrentBoard()}

      <div className="capacity-grid">
        {orderedCards.map(renderCard)}
      </div>
    </section>
  );
}
