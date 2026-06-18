import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileText,
  Github,
  Loader2,
  Lock,
  MessageSquarePlus,
  PanelRightOpen,
  Settings,
  ShieldCheck,
  Upload,
  UserRoundCheck,
  Zap
} from "lucide-react";
import { DocumentCard } from "./components/DocumentCard";
import { CapacityPoolPanel } from "./components/CapacityPoolPanel";
import { ApiConfigPanel } from "./components/ApiConfigPanel";
import { InterviewerDialog } from "./components/InterviewerDialog";
import { EmptyLine, SectionHeader, StatusPill } from "./components/common";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { agentkbApi, type MeResponse } from "./services/agentkbApi";
import { downloadSafeConfig } from "./services/configExport";
import {
  createMockDocument,
  createMockStreamEvents,
  getMockQueueWait,
  initialConfig,
  initialSteps
} from "./services/mockAgentkb";
import type { AgentStatus, Config, DocumentItem, Message, MobilePanel, QueueStatus, Role, StreamEvent, SummaryItem } from "./types/agentkb";
import { createId, formatCountdown } from "./utils/format";

type SidebarPanel = "docs" | "capacity" | "api" | "summaries";

const githubRepoUrl = import.meta.env.VITE_GITHUB_REPO_URL ?? "https://github.com/QiJi11/agentkb-portfolio";

/**
 * AgentKB 前端编排层：当前使用 mock service，后端接入时替换 services 即可。
 */
export default function App() {
  const [role, setRole] = useState<Role>("guest");
  const [budgetStatus, setBudgetStatus] = useState<"available" | "tight" | "exhausted">("available");
  const [identity, setIdentity] = useState<MeResponse | null>(null);
  const [identityUpdatedAt, setIdentityUpdatedAt] = useState<number | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "system",
      content: "上传 TXT / MD / PDF 文档后开始问答。游客受公开预算、队列和内容长度限制，面试官访问码用户走优先队列。"
    }
  ]);
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [agentSteps, setAgentSteps] = useState(initialSteps);
  const [question, setQuestion] = useState("");
  const [queueStatus, setQueueStatus] = useState<QueueStatus>("idle");
  const [queuePosition, setQueuePosition] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [interviewerOpen, setInterviewerOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("chat");
  const [sidebarPanel, setSidebarPanel] = useState<SidebarPanel>("docs");
  const [config, setConfig] = useState<Config>(initialConfig);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const retryDelaySeconds = 8;

  const canSend = queueStatus !== "queued" && queueStatus !== "running" && question.trim().length > 0 && (!config.byokEnabled || config.userApiKey.trim().length > 0);
  const activeDocuments = documents.filter((item) => item.status === "ready");
  const queueLabel = useMemo(() => {
    if (queueStatus === "queued") return `排队第 ${queuePosition} 位，预计 ${estimatedWait}s`;
    if (queueStatus === "running") return "Agent 正在执行";
    if (queueStatus === "done") return "已完成";
    if (queueStatus === "error") return "执行失败";
    if (config.byokEnabled) return "硬件池空闲";
    return role === "interviewer" ? "优先池空闲" : "游客池空闲";
  }, [config.byokEnabled, estimatedWait, queuePosition, queueStatus, role]);

  const refreshIdentity = () => {
    agentkbApi.getMe()
      .then((me) => {
        setIdentity(me);
        setIdentityUpdatedAt(Date.now());
        setRole(me.role);
        setBudgetStatus(me.budget.status);
        setQueuePosition(me.current_run?.queue_position ?? me.queue.queued);
        setEstimatedWait(me.current_run?.estimated_wait_seconds ?? me.queue.estimated_wait_seconds);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    const savedUserApiKey = window.localStorage.getItem("agentkb_user_api_key") ?? "";
    if (savedUserApiKey) {
      setConfig((current) => ({ ...current, userApiKey: savedUserApiKey }));
    }
    refreshIdentity();

    const tick = window.setInterval(() => {
      setDocuments((items) => items.filter((item) => item.expiresAt > Date.now()));
      setSummaries((items) => items.filter((item) => item.expiresAt > Date.now()));
    }, 1000);
    return () => {
      window.clearInterval(tick);
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (config.userApiKey) {
      window.localStorage.setItem("agentkb_user_api_key", config.userApiKey);
      return;
    }
    window.localStorage.removeItem("agentkb_user_api_key");
  }, [config.userApiKey]);

  useEffect(() => {
    if (sidebarPanel === "capacity") {
      refreshIdentity();
    }
  }, [sidebarPanel]);

  const resetAgent = () => setAgentSteps(initialSteps.map((step) => ({ ...step, status: "waiting" })));

  const setStepStatus = (id: string, status: AgentStatus, duration?: string) => {
    setAgentSteps((steps) =>
      steps.map((step) => (step.id === id ? { ...step, status, duration } : step))
    );
  };

  const updateDocumentStatus = (id: string, status: DocumentItem["status"]) => {
    setDocuments((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const handleUpload = (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    const item = createMockDocument(file);
    setDocuments((items) => [item, ...items]);

    agentkbApi.uploadDocument(file)
      .then((result) => {
        setDocuments((items) =>
          items.map((doc) =>
            doc.id === item.id
              ? {
                  ...doc,
                  id: result.document_id,
                  name: result.filename,
                  size: `${Math.max(1, Math.round(result.size_bytes / 1024))} KB`,
                  chunks: result.chunk_count,
                  expiresAt: new Date(result.expires_at).getTime(),
                  status: "ready"
                }
              : doc
          )
        );
      })
      .catch(() => {
        timersRef.current.push(window.setTimeout(() => updateDocumentStatus(item.id, "chunking"), 700));
        timersRef.current.push(window.setTimeout(() => updateDocumentStatus(item.id, "embedding"), 1500));
        timersRef.current.push(window.setTimeout(() => updateDocumentStatus(item.id, "ready"), 2400));
      });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend) return;

    const userQuestion = question.trim();
    setQuestion("");
    resetAgent();
    setMessages((items) => [...items, { id: createId(), role: "user", content: userQuestion }]);

    runBackendAgent(userQuestion).catch(() => {
      const wait = getMockQueueWait(role, activeDocuments.length);
      if (wait > 0) {
        setQueueStatus("queued");
        setQueuePosition(2);
        setEstimatedWait(wait);
        timersRef.current.push(window.setTimeout(() => runMockAgent(userQuestion), 1400));
        return;
      }
      runMockAgent(userQuestion);
    });
  };

  const runBackendAgent = async (userQuestion: string, answerId = createId(), retryCount = 0) => {
    const run = await agentkbApi.createChatRun(userQuestion, config);
    setQueueStatus(run.status);
    setQueuePosition(run.queue_position);
    setEstimatedWait(run.estimated_wait_seconds);
    setIdentity((current) =>
      current
        ? {
            ...current,
            current_pool: run.pool,
            current_run: {
              run_id: run.run_id,
              status: run.status,
              pool: run.pool,
              queue_position: run.queue_position,
              estimated_wait_seconds: run.estimated_wait_seconds
            }
          }
        : current
    );
    setMessages((items) =>
      items.some((message) => message.id === answerId)
        ? items
        : [...items, { id: answerId, role: "assistant", content: "", sources: [] }]
    );

    let hasRetriedToken = false;
    await agentkbApi.streamChatRun(run.run_id, {
      onEvent: (event) => {
        if (event.type === "error") {
          handleStreamError(event, answerId, userQuestion, retryCount);
          return;
        }
        if (retryCount > 0 && event.type === "token" && !hasRetriedToken) {
          hasRetriedToken = true;
          applyStreamEvent({ ...event, append: false }, answerId);
          return;
        }
        applyStreamEvent(event, answerId);
      }
    });
  };

  const handleStreamError = (event: StreamEvent, answerId: string, userQuestion: string, retryCount: number) => {
    refreshIdentity();
    if (event.type !== "error") return;

    if (retryCount < 1) {
      setQueueStatus("queued");
      setQueuePosition(1);
      setEstimatedWait(retryDelaySeconds);
      setIdentity((current) =>
        current?.current_run
          ? {
              ...current,
              current_run: {
                ...current.current_run,
                status: "queued",
                queue_position: 1,
                estimated_wait_seconds: retryDelaySeconds
              }
            }
          : current
      );
      setMessages((items) =>
        items.map((message) =>
          message.id === answerId
            ? {
                ...message,
                content: `${event.message}\n\n正在自动重试，预计 ${retryDelaySeconds} 秒后继续。`,
                sources: []
              }
            : message
        )
      );
      const timer = window.setTimeout(() => {
        runBackendAgent(userQuestion, answerId, retryCount + 1).catch(() => runGracefulFallback(userQuestion, answerId));
      }, retryDelaySeconds * 1000);
      timersRef.current.push(timer);
      return;
    }

    runGracefulFallback(userQuestion, answerId);
  };

  const runGracefulFallback = (userQuestion: string, answerId: string) => {
    setQueueStatus("running");
    setQueuePosition(0);
    setEstimatedWait(0);
    const fallbackPrefix = "当前模型服务繁忙，本次先切换为演示回答，页面和队列仍可继续使用。\n\n";
    setMessages((items) =>
      items.map((message) =>
        message.id === answerId
          ? {
              ...message,
              content: fallbackPrefix,
              sources: []
            }
          : message
      )
    );
    runMockAgent(userQuestion, answerId, fallbackPrefix);
  };

  const applyStreamEvent = (event: StreamEvent, answerId: string) => {
    if (event.type === "queued") {
      setQueueStatus("queued");
      setQueuePosition(event.position);
      setEstimatedWait(event.estimatedWait);
      setIdentity((current) =>
        current?.current_run
          ? {
              ...current,
              current_run: {
                ...current.current_run,
                status: "queued",
                queue_position: event.position,
                estimated_wait_seconds: event.estimatedWait
              }
            }
          : current
      );
    }
    if (event.type === "running") {
      setQueueStatus("running");
      setQueuePosition(0);
      setEstimatedWait(0);
      setIdentity((current) =>
        current?.current_run
          ? {
              ...current,
              current_run: {
                ...current.current_run,
                status: "running",
                queue_position: 0,
                estimated_wait_seconds: 0
              }
            }
          : current
      );
    }
    if (event.type === "agent_step") {
      setStepStatus(event.stepId, event.status, event.duration);
    }
    if (event.type === "token") {
      setMessages((items) =>
        items.map((message) =>
          message.id === answerId
            ? {
                ...message,
                content: event.append ? `${message.content}${event.text}` : event.text,
                sources: event.sources ?? message.sources ?? ["demo-context.md"]
              }
            : message
        )
      );
    }
    if (event.type === "done") {
      setQueueStatus("done");
      setIdentity((current) => (current ? { ...current, current_run: null } : current));
      setSummaries((items) => [event.summary, ...items]);
      refreshIdentity();
    }
  };

  const runMockAgent = (userQuestion: string, existingAnswerId?: string, answerPrefix = "") => {
    const answerId = existingAnswerId ?? createId();
    setMessages((items) =>
      existingAnswerId
        ? items
        : [...items, { id: answerId, role: "assistant", content: "", sources: [] }]
    );

    createMockStreamEvents(userQuestion, activeDocuments).forEach(({ delay, event }) => {
      const timer = window.setTimeout(() => {
        if (event.type === "token" && answerPrefix) {
          applyStreamEvent({ ...event, text: `${answerPrefix}${event.text}` }, answerId);
          return;
        }
        applyStreamEvent(event, answerId);
      }, delay);
      timersRef.current.push(timer);
    });
  };

  const handleInterviewerLogin = (code: string) => {
    if (!code.trim()) return;
    agentkbApi.loginInterviewer(code)
      .then((result) => {
        setRole(result.role);
        setBudgetStatus("available");
        setInterviewerOpen(false);
        agentkbApi.getMe().then((me) => {
          setIdentity(me);
          setIdentityUpdatedAt(Date.now());
          setBudgetStatus(me.budget.status);
        }).catch(() => undefined);
        setMessages((items) => [
          ...items,
          {
            id: createId(),
            role: "system",
            content: "优先账户已开启。当前使用独立优先池，不占用游客池。"
          }
        ]);
      })
      .catch(() => {
        setRole("interviewer");
        setBudgetStatus("available");
        setInterviewerOpen(false);
        setMessages((items) => [
          ...items,
          {
            id: createId(),
            role: "system",
            content: "优先账户已开启。当前使用本地 mock fallback。"
          }
        ]);
      });
  };

  const exportConfig = () => {
    downloadSafeConfig(config);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <Bot size={22} />
          </div>
          <div>
            <strong>AgentKB</strong>
            <span>轻量 RAG 问答系统</span>
          </div>
        </div>

        <div className="topbar-status">
          <StatusPill icon={<ShieldCheck size={15} />} text={role === "interviewer" ? "面试官" : "游客"} strong={role === "interviewer"} />
          {identity?.current_run && <StatusPill icon={<Clock3 size={15} />} text={queueLabel} />}
          <a className="icon-button" href={githubRepoUrl} target="_blank" rel="noreferrer" aria-label="GitHub Star">
            <Github size={18} />
          </a>
          <button className="icon-button" type="button" onClick={() => setInterviewerOpen(true)} aria-label="面试官入口">
            <UserRoundCheck size={18} />
          </button>
          <button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="设置">
            <Settings size={18} />
          </button>
        </div>
      </header>

      <nav className="mobile-tabs">
        <button className={mobilePanel === "docs" ? "active" : ""} type="button" onClick={() => setMobilePanel("docs")}>文档</button>
        <button className={mobilePanel === "chat" ? "active" : ""} type="button" onClick={() => setMobilePanel("chat")}>问答</button>
        <button className={mobilePanel === "agent" ? "active" : ""} type="button" onClick={() => setMobilePanel("agent")}>轨迹</button>
      </nav>

      <main className="workspace">
        <aside className={`sidebar ${mobilePanel === "docs" ? "mobile-visible" : ""}`}>
          <nav className="sidebar-tabs" aria-label="侧栏导航">
            <button className={sidebarPanel === "docs" ? "active" : ""} type="button" onClick={() => setSidebarPanel("docs")}>知识库</button>
            <button className={sidebarPanel === "capacity" ? "active" : ""} type="button" onClick={() => setSidebarPanel("capacity")}>容量</button>
            <button className={sidebarPanel === "api" ? "active" : ""} type="button" onClick={() => setSidebarPanel("api")}>API</button>
            <button className={sidebarPanel === "summaries" ? "active" : ""} type="button" onClick={() => setSidebarPanel("summaries")}>摘要</button>
          </nav>

          {sidebarPanel === "docs" && (
            <>
              <SectionHeader icon={<Database size={17} />} title="知识库" action="2小时 TTL" />
              <button className="upload-zone" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={20} />
                <span>上传 TXT / MD / PDF</span>
                <small>单文件 5 MiB，解析后原文件删除</small>
              </button>
              <input
                ref={fileInputRef}
                className="hidden-input"
                type="file"
                accept=".txt,.md,.pdf"
                onChange={(event) => handleUpload(event.target.files)}
              />
              <div className="doc-list">
                {documents.length === 0 ? (
                  <EmptyLine text="还没有上传文档" />
                ) : (
                  documents.map((doc) => <DocumentCard key={doc.id} item={doc} />)
                )}
              </div>
            </>
          )}

          {sidebarPanel === "capacity" && (
            <CapacityPoolPanel
              config={config}
              identity={identity}
              role={role}
              updatedAt={identityUpdatedAt}
              onExport={exportConfig}
              onRefresh={refreshIdentity}
              onOpenInterviewer={() => setInterviewerOpen(true)}
              variant="sidebar"
            />
          )}

          {sidebarPanel === "api" && (
            <ApiConfigPanel
              config={config}
              role={role}
              onConfigChange={setConfig}
              onOpenInterviewer={() => setInterviewerOpen(true)}
            />
          )}

          {sidebarPanel === "summaries" && (
            <>
              <SectionHeader icon={<MessageSquarePlus size={17} />} title="本地摘要" action="24小时" />
              <div className="summary-list">
                {summaries.length === 0 ? (
                  <EmptyLine text="对话结束后生成摘要" />
                ) : (
                  summaries.map((summary) => (
                    <div className="summary-card" key={summary.id}>
                      <strong>{summary.title}</strong>
                      <span>{summary.detail}</span>
                      <small>{formatCountdown(summary.expiresAt)} 后清理</small>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </aside>

        <section className={`chat-panel ${mobilePanel === "chat" ? "mobile-visible" : ""}`}>
          <div className="messages">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.article
                  key={message.id}
                  className={`message ${message.role}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <div className="message-avatar">{message.role === "assistant" ? <Bot size={16} /> : message.role === "user" ? "我" : <Lock size={15} />}</div>
                  <div className="message-body">
                    <ReactMarkdown>{message.content || " "}</ReactMarkdown>
                    {!!message.sources?.length && (
                      <div className="source-row">
                        {message.sources.map((source) => (
                          <span key={source}><FileText size={13} />{source}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>

          <form className="composer" onSubmit={handleSubmit}>
            <div className="composer-meta">
              <button type="button" onClick={() => {
                setSidebarPanel("docs");
                setMobilePanel("docs");
              }}>
                {activeDocuments.length} 个可检索文档
              </button>
              <button type="button" onClick={() => setSettingsOpen(true)}>
                TopK {config.topK}
              </button>
              <button type="button" onClick={() => {
                setSidebarPanel("api");
                setMobilePanel("docs");
              }}>
                {config.provider} / {config.model}
              </button>
            </div>
            <div className="composer-input">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="询问文档内容，或测试游客排队和面试官优先通道"
                rows={2}
              />
              <button className="send-button" type="submit" disabled={!canSend}>
                {queueStatus === "running" ? <Loader2 className="spin" size={18} /> : <ChevronRight size={20} />}
              </button>
            </div>
          </form>
        </section>

        <aside className={`agent-panel ${mobilePanel === "agent" ? "mobile-visible" : ""}`}>
          <SectionHeader icon={<PanelRightOpen size={17} />} title="Agent 轨迹" action="固定流程" />
          <div className="agent-steps">
            {agentSteps.map((step) => (
              <div className={`agent-step ${step.status}`} key={step.id}>
                <div className="step-icon">
                  {step.status === "running" ? <Loader2 className="spin" size={16} /> : step.status === "success" ? <CheckCircle2 size={16} /> : <Zap size={16} />}
                </div>
                <div>
                  <strong>{step.name}</strong>
                  <span>{step.detail}</span>
                  <small>{step.status === "waiting" ? "等待" : step.status === "running" ? "执行中" : `完成 ${step.duration ?? ""}`}</small>
                </div>
              </div>
            ))}
          </div>

          <div className="security-card">
            <Lock size={18} />
            <strong>安全边界</strong>
            <span>导出配置不包含 API Key、访问码、上传原文、向量库数据或聊天记录。</span>
          </div>
        </aside>
      </main>

      <AnimatePresence>
        {settingsOpen && (
          <SettingsDrawer config={config} setConfig={setConfig} onClose={() => setSettingsOpen(false)} />
        )}
        {interviewerOpen && (
          <InterviewerDialog onClose={() => setInterviewerOpen(false)} onLogin={handleInterviewerLogin} />
        )}
      </AnimatePresence>
    </div>
  );
}
