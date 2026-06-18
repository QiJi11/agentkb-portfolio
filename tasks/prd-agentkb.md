# PRD: AgentKB 知识库问答作品集

## Introduction

AgentKB 是一个用于求职展示的轻量 AI 知识库问答平台。用户上传文档后，系统完成解析、分块、embedding、检索、Agent 编排和流式回答。公开 Demo 支持游客试用、面试官优先通道、每日预算保护和临时 RAG 数据清理，避免服务端 API Key 被滥用或资料长期留存。

## Goals

- 在 2C2G 云服务器上稳定运行可演示的 RAG 问答链路。
- 让面试官 3 分钟内理解项目价值、技术链路和安全边界。
- 支持游客免费试用，同时限制公开预算、队列容量、上传大小和内容长度。
- 支持面试官访问码登录，获得更高额度和优先队列。
- 确保服务端 API Key 不暴露给前端、导出配置、日志或浏览器 Network。
- 上传原文件解析后删除，临时向量索引 2 小时过期，对话摘要只在浏览器本地保存 24 小时。

## User Stories

### US-001: 上传文档并建立临时知识库
**Description:** As a 游客或面试官, I want 上传 TXT、Markdown、PDF 文档 so that 我可以基于自己的资料提问。

**Acceptance Criteria:**
- [ ] 用户可以通过前端上传入口选择 TXT、MD、PDF 文件。
- [ ] 超过 5 MiB 的游客文件会被拒绝并显示明确错误。
- [ ] 前端展示解析、分块、向量化、可检索四个状态。
- [ ] 后端解析后删除原始上传文件。
- [ ] 分块文本和向量索引按 session 隔离。
- [ ] 文档和向量索引 2 小时后自动清理。
- [ ] Typecheck/lint passes。
- [ ] Verify in browser using available Codex browser tooling。

### US-002: 基于知识库进行流式问答
**Description:** As a 用户, I want 输入问题并看到流式回答 so that 我能快速确认系统是否理解上传资料。

**Acceptance Criteria:**
- [ ] 用户提交问题后创建 chat run。
- [ ] SSE 返回 `queued`、`running`、`agent_step`、`token`、`done`、`error` 事件。
- [ ] 回答内容支持 Markdown 展示。
- [ ] 回答展示引用来源片段或文档名。
- [ ] 检索为空时回答“知识库中没有足够信息”，不得胡编。
- [ ] Typecheck/lint passes。
- [ ] Verify in browser using available Codex browser tooling。

### US-003: 展示固定流程 Agent 轨迹
**Description:** As a 面试官, I want 看到 Agent 执行轨迹 so that 我能理解系统不是简单调用一次模型。

**Acceptance Criteria:**
- [ ] 前端展示 Planner、Retriever、Answer、Verifier 四个节点。
- [ ] 每个节点展示等待、执行中、成功、失败状态。
- [ ] 每个节点失败时展示可读错误和兜底结果。
- [ ] Agent 状态通过 SSE 事件驱动更新。
- [ ] Typecheck/lint passes。
- [ ] Verify in browser using available Codex browser tooling。

### US-004: 游客限额和排队
**Description:** As a 项目拥有者, I want 限制游客免费使用 so that 公开 Demo 不会刷爆 API 预算。

**Acceptance Criteria:**
- [ ] 游客受公开每日预算、全局队列容量和问题长度限制。
- [ ] 游客单会话最多 1 个运行中任务，超出并发后进入队列。
- [ ] 前端显示当前账号在游客池的排队位置和预计等待时间。
- [ ] 游客超限后无法继续消耗服务端 API Key。
- [ ] 游客排队时前端展示队列位置和预计等待时间。
- [ ] 预计等待时间按前方任务数和最近 20 次平均耗时计算。
- [ ] Typecheck/lint passes。
- [ ] Verify in browser using available Codex browser tooling。

### US-005: 面试官优先通道
**Description:** As a 面试官, I want 使用访问码获得优先队列 so that 我在演示时不被游客排队阻塞。

**Acceptance Criteria:**
- [ ] 前端提供面试官访问码入口。
- [ ] 后端只保存访问码哈希，不保存明文访问码。
- [ ] 登录成功后写入 HttpOnly Cookie。
- [ ] 面试官可绕过游客队列容量限制，仍受全局安全预算保护。
- [ ] 面试官任务优先级高于游客任务。
- [ ] 面试官任务进入独立优先池，不占用游客池。
- [ ] 前端显示当前账号在优先池的排队位置和预计等待时间。
- [ ] 访问码校验失败时返回通用错误，不暴露校验细节。
- [ ] Typecheck/lint passes。
- [ ] Verify in browser using available Codex browser tooling。

### US-006: 配置导入导出
**Description:** As a 用户, I want 导入导出配置 so that 我能复现实验参数但不泄露敏感信息。

**Acceptance Criteria:**
- [ ] 导出文件名为 `agentkb-config.json`。
- [ ] 导出 JSON 包含 `version=agentkb-config.v1`。
- [ ] 导出字段包含 provider、base_url、model、temperature、top_k、chunk_size、chunk_overlap、rerank_top_n、theme、ui_layout。
- [ ] 导出不包含服务端 API Key、用户 API Key、访问码、上传原文、向量数据、聊天记录、摘要、Authorization Header。
- [ ] BYOK 模式不占用游客池或优先池预算和队列容量。
- [ ] BYOK 模式仍受服务器硬件并发、上传大小和问题长度限制。
- [ ] 导入时校验 JSON 格式、version 和字段范围。
- [ ] 导入失败时展示明确错误。
- [ ] Typecheck/lint passes。
- [ ] Verify in browser using available Codex browser tooling。

### US-007: 本地摘要保存
**Description:** As a 用户, I want 对话结束后保留短摘要 so that 我能在本机短时间回看演示结果。

**Acceptance Criteria:**
- [ ] 对话完成后生成简短摘要。
- [ ] 摘要只返回给前端，不在后端长期保存。
- [ ] 前端使用 IndexedDB 保存摘要 24 小时。
- [ ] 摘要过期后自动清理。
- [ ] 页面明确说明摘要只保存在本机。
- [ ] Typecheck/lint passes。
- [ ] Verify in browser using available Codex browser tooling。

### US-008: 部署到低成本服务器
**Description:** As a 项目拥有者, I want 在阿里云轻量服务器部署 so that 我能用低成本长期展示作品集。

**Acceptance Criteria:**
- [ ] Docker Compose 一键启动前端、后端和 ChromaDB。
- [ ] Nginx 反向代理前端和 `/api`。
- [ ] Ubuntu 24.04 上配置 1-2 GiB swap。
- [ ] `.env` 包含模型、embedding、预算、访问码哈希配置。
- [ ] 健康检查不返回密钥、服务器敏感路径或模型凭证。
- [ ] 前端源码和浏览器 Network 不出现服务端 API Key。

## Functional Requirements

- FR-1: 系统必须允许用户上传 TXT、MD、PDF 文档。
- FR-2: 系统必须限制游客单文件最大 5 MiB。
- FR-3: 系统必须将文档解析为文本并按默认 512 字符、50 overlap 分块。
- FR-4: 系统必须调用外部 embedding API 生成向量。
- FR-5: 系统必须按 session 隔离 ChromaDB 临时 collection。
- FR-6: 系统必须在 2 小时后清理文档片段和向量索引。
- FR-7: 系统必须支持 TopK 检索，默认 TopK 为 8。
- FR-8: 系统必须支持可选 rerank，默认关闭。
- FR-9: 系统必须通过 SSE 流式返回 Agent 步骤和回答 token。
- FR-10: 系统必须实现游客、面试官、管理员三类角色。
- FR-11: 系统必须支持面试官访问码登录和高优先级队列。
- FR-12: 系统必须记录公开预算、运行中任务、排队任务和内容长度限制。
- FR-13: 系统必须记录每日 token 和预估人民币成本。
- FR-14: 系统必须在达到每日预算后暂停游客服务。
- FR-15: 系统必须保证服务端 API Key 不返回给前端。
- FR-16: 系统必须支持配置导入导出并排除敏感字段。
- FR-17: 系统必须在浏览器本地保存对话摘要 24 小时。

## Non-Goals

- 不做完整商业化后台管理系统。
- 不做拖拽式 Agent 工作流编辑器。
- 不做长期企业知识库和多租户付费系统。
- 不在 2C2G 服务器本地运行大语言模型或重 embedding 模型。
- 不承诺前端代码防复制，只做密钥、预算和资料安全保护。
- 不支持任意大文件和无限并发。

## Design Considerations

- 首屏直接进入三栏工作台，不做营销首页。
- 桌面端为左侧会话和知识库、中间聊天、右侧 Agent 轨迹。
- 移动端使用底部 Tab 或抽屉，避免文字和控件重叠。
- 视觉风格参考 Gemini：白底、细分割线、轻阴影、蓝绿点缀。
- 动效用于消息进入、Agent 节点切换、上传进度和队列状态，不影响阅读。

## Technical Considerations

- 前端使用 React、Vite、TypeScript、Framer Motion、lucide-react。
- 后端使用 FastAPI、SQLite、ChromaDB、SSE。
- 模型调用使用 OpenAI-compatible client，支持 SiliconFlow、DeepSeek、阿里云百炼、Gemini。
- 默认外部 embedding API，不本地加载大模型。
- 任务队列用 SQLite 表和后台 worker 实现，MVP 不引入 Redis。
- 部署目标为阿里云轻量应用服务器 2 vCPU、2 GiB RAM、40 GiB SSD、Ubuntu 24.04。

## Success Metrics

- 面试官能在 3 分钟内完成上传、提问、查看 Agent 轨迹和理解安全设计。
- 单个小文档上传到可检索在 10 秒内完成。
- 游客高并发时能看到排队位置和预计等待时间。
- 达到公开预算、队列容量或内容长度限制后不再消耗服务端 API Key。
- 前端 Network 和导出配置中 0 次出现服务端 API Key。
- Docker Compose 可在新服务器 15 分钟内完成部署。

## Open Questions

- 面试官访问码是否需要设置有效期和备注名称。
- 免费域名方案最终使用备案域名、临时 IP，还是后续购买正式域名。
- v1 是否保留 DOCX 解析，还是延后到 v1.1。
