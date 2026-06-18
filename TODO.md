# AgentKB TODO

生成日期：2026-06-18

## 项目目标

- 做一个可部署、可截图、可放简历的 AI 知识库问答系统。
- 用户可上传文档，系统完成 RAG（检索增强生成）问答。
- 界面参考 Gemini 聊天界面，要求简洁、漂亮、有动态效果。
- 支持稳定 Agent（智能体）执行轨迹，不追求复杂自由 Agent。
- 支持配置导入导出。
- 默认使用你的服务端 API Key，用户也可以使用自己的 API Key。
- 你的服务端 API Key 不暴露给前端、不写入日志、不进入导出配置。
- 用户 API Key 只保存在浏览器本地，不上传到你的后端。
- 公开 Demo 支持游客试用和面试官优先通道。
- 游客有免费对话次数、上传大小、并发和排队限制。
- 面试官通过访问码登录后可获得更高额度和优先队列。
- RAG 文档和临时向量索引默认 2 小时自动过期。
- 对话总结默认只保存在浏览器本地 24 小时。

## MVP 范围

### 前端

- [x] Gemini 风格聊天界面
- [x] 左侧会话 / 知识库列表
- [x] 中间聊天消息流
- [x] 右侧 Agent 执行轨迹
- [x] 文档上传入口
- [x] 模型配置面板
- [x] 游客剩余额度展示
- [x] 排队状态和预计等待时间展示
- [x] 面试官访问码登录入口
- [x] 面试官优先通道状态展示
- [x] 对话总结本地 24 小时保存
- [x] 用户 API Key 本地保存
- [x] 配置导入导出
- [x] 流式回答展示
- [x] 加载、错误、空状态
- [x] 动态效果和页面过渡

### 后端

- [ ] 文档上传接口
- [ ] TXT / PDF / Markdown / DOCX 文档解析
- [ ] 文档分块
- [ ] embedding 向量化
- [ ] ChromaDB 入库
- [ ] TopK 检索
- [ ] rerank
- [ ] Prompt 注入
- [ ] SSE 流式回答
- [ ] 固定流程 Agent 编排
- [ ] 游客 / 面试官 / 管理员角色识别
- [ ] 面试官访问码登录
- [ ] 任务队列和优先级调度
- [ ] 游客对话次数限制
- [ ] 每日 token 预算限制
- [ ] RAG 临时索引 2 小时 TTL 清理
- [ ] 健康检查接口
- [ ] 文件大小限制
- [ ] 请求错误兜底

### 部署

- [ ] Dockerfile
- [ ] docker-compose.yml
- [ ] .env.example
- [ ] Nginx 反向代理
- [ ] HTTPS
- [ ] 云服务器部署
- [ ] README 放在线 Demo 地址
- [ ] README 放截图和架构图

## 技术栈

- 前端：React、Vite、TypeScript、Tailwind CSS、Framer Motion。
- 后端：Python、FastAPI、SQLite、ChromaDB、SentenceTransformers、SSE。
- 数据：SQLite 存任务、额度、会话摘要元数据；ChromaDB 存临时向量索引。
- Agent：固定流程状态图，不做完全自由规划。
- 模型：OpenAI-compatible API，兼容 DeepSeek、Qwen、SiliconFlow、阿里云百炼、OpenAI 等。
- 向量化：默认使用外部 embedding API，不在 2C2G 服务器本地跑重模型。
- 部署：阿里云轻量应用服务器 2C2G / 40GiB / Ubuntu 24.04、Docker Compose、Nginx、HTTPS。

## 推荐目录结构

```text
agentkb-portfolio/
  TODO.md
  README.md
  .env.example
  docker-compose.yml
  frontend/
    src/
      components/
      pages/
      stores/
      services/
      styles/
  backend/
    app/
      api/
      core/
      services/
      stores/
      agents/
      schemas/
    tests/
```

## 开发 TODO

### 1. 初始化项目

- [x] 初始化 `frontend`：React + Vite + TypeScript。
- [x] 初始化 `backend`：FastAPI。
- [x] 增加统一 `.env.example`。
- [x] 增加 `README.md` 初稿。
- [ ] 增加基础 `docker-compose.yml`。
- [x] 增加 SQLite 数据库初始化脚本。
- [ ] 增加 ChromaDB 持久化目录。
- [ ] 增加定时清理任务。

### 2. 前端界面

- [x] 实现 Gemini 风格主界面。
- [x] 实现响应式布局，保证移动端不重叠。
- [x] 实现聊天输入框。
- [x] 实现消息列表。
- [x] 实现 Markdown 渲染。
- [x] 实现文档上传组件。
- [x] 实现知识库文档列表。
- [x] 实现 Agent 执行轨迹面板。
- [x] 实现模型配置抽屉或弹窗。
- [x] 实现游客额度提示。
- [x] 实现排队位置和预计等待时间提示。
- [x] 实现面试官访问码登录弹窗。
- [x] 实现面试官优先通道标识。
- [x] 实现本地对话总结列表。
- [x] 实现导入配置按钮。
- [x] 实现导出配置按钮。
- [x] 实现错误提示和空状态。
- [x] 使用 Framer Motion 增加消息进入、节点高亮、面板切换动画。
- [ ] 删除所有调试用 `console.log`。

### 3. 密钥策略

- [x] 默认模式：后端从环境变量读取 `LLM_API_KEY`。
- [x] 后端永远不把 `LLM_API_KEY` 返回给前端。
- [ ] 后端日志过滤 Authorization、API Key、token 等敏感字段。
- [x] `.env` 增加 `LLM_PROVIDER`、`LLM_BASE_URL`、`LLM_MODEL`。
- [x] `.env` 增加 `EMBEDDING_PROVIDER`、`EMBEDDING_BASE_URL`、`EMBEDDING_MODEL`。
- [x] `.env` 增加 `INTERVIEWER_CODE_HASH`，只保存访问码哈希。
- [x] `.env` 增加 `DAILY_TOKEN_BUDGET_RMB`。
- [x] BYOK（用户自带密钥）模式：用户 API Key 只保存到浏览器 localStorage，后续可升级 IndexedDB。
- [x] 用户 API Key 不上传到后端。
- [x] BYOK 不受游客池或优先池预算、队列容量限制。
- [x] BYOK 仍受服务器硬件并发、单会话活跃任务、上传大小和问题长度限制。
- [x] 导出配置时不包含任何 API Key。
- [x] 导入配置后，如果需要用户 API Key，提示用户重新填写。

## 低成本 API TODO

### Provider 策略

- [x] 默认使用 OpenAI-compatible 客户端封装 LLM 调用。
- [x] 支持 `SiliconFlow`。
- [x] 支持 `DeepSeek`。
- [x] 支持 `阿里云百炼`。
- [x] 支持 `Gemini` 作为可选免费额度方案。
- [x] 支持一键切换 `provider`、`base_url`、`model`。
- [ ] 在 README 说明不同 Provider 的成本取舍。

### 推荐默认模型

- [ ] LLM 默认优先选择低价模型，例如 `qwen-flash`、`DeepSeek-V4-Flash` 或同级别模型。
- [ ] embedding 默认使用外部 API，例如 `text-embedding-v4` 或 SiliconFlow embedding。
- [x] 默认关闭付费 rerank，先使用向量相似度 TopK。
- [x] 通过 `ENABLE_RERANK=true` 开启 rerank。
- [ ] 免费 / 低价 API 调用失败时展示可读错误，不暴露密钥。

### 预算控制

- [x] 设置每日人民币预算，例如 `DAILY_TOKEN_BUDGET_RMB=3`。
- [ ] 记录每次 LLM 输入 token、输出 token、预估费用。
- [ ] 记录每次 embedding token 和预估费用。
- [x] 达到预算后暂停游客服务。
- [x] 达到预算后仍允许面试官访问码用户使用预留额度。
- [ ] README 说明公开 Demo 的每日预算保护。

## 角色、额度和排队 TODO

### 角色

- [x] `guest`：匿名游客。
- [x] `interviewer`：面试官访问码用户。
- [ ] `admin`：本地管理或后续后台用户。
- [x] 后端通过 HttpOnly Cookie 识别角色。
- [x] 前端通过 `GET /api/v1/me` 获取角色和额度状态。

### 游客限制

- [x] 游客不做固定每日次数限制，受公开每日预算保护。
- [x] 每个游客会话最多 1 个运行中任务，超出并发后进入队列。
- [x] 全局游客队列默认最多 20 个等待任务。
- [x] 页面显示当前账号在游客池的排队位置和预计等待时间。
- [x] 单文件最大 5 MiB。
- [x] 单会话最多保留 300k 字符进入分块。
- [x] 超出公开预算、队列容量或问题长度时给出明确提示。

### 面试官权限

- [x] 面试官通过访问码登录。
- [x] 服务端只保存访问码哈希，不保存明文访问码。
- [x] 面试官可绕过游客队列容量限制，仍受全局安全预算保护。
- [x] 面试官使用高优先级队列。
- [x] 面试官使用独立优先池，不占用游客池并发和队列名额。
- [x] 页面显示当前账号在优先池的排队位置和预计等待时间。
- [x] 面试官上传限制可高于游客，但仍受全局预算保护。

### 队列调度

- [x] 增加任务表，记录 `run_id`、`session_id`、`role`、`priority`、`status`、`created_at`。
- [x] 游客 `priority=10`。
- [x] 面试官 `priority=100`。
- [x] `MAX_GUEST_RUNNING=1`。
- [x] `MAX_INTERVIEWER_RUNNING=1`。
- [x] `MAX_PRIORITY_QUEUE=5`。
- [x] `MAX_GLOBAL_RUNNING=2`。
- [x] 队列按游客池和优先池分别计算位置。
- [x] 当前账号排队位置 = 当前 session 活跃任务在所属池内的位置。
- [x] 预计等待时间 = 所属池前方任务数 * 最近 20 次平均耗时。
- [x] 默认平均耗时为 45 秒。
- [x] SSE 返回 `queued`、`running`、`agent_step`、`token`、`done`、`error` 事件。

## 会话摘要和本地保存 TODO

- [x] 对话结束后生成简短摘要。
- [x] 摘要默认只返回给前端，不在后端长期保存。
- [x] 前端使用内存状态保存摘要 24 小时，后续可升级 IndexedDB 持久化。
- [x] 摘要到期后前端自动清理。
- [x] 导出配置不包含对话摘要。
- [x] 页面明确提示：上传文档和临时索引 2 小时过期，对话摘要仅本机保存 24 小时。

## 配置导入导出 TODO

### 配置文件

- [ ] 文件名：`agentkb-config.json`
- [ ] 配置版本：`agentkb-config.v1`
- [ ] 导出格式使用 JSON。
- [ ] 导出时自动下载文件。
- [ ] 导入时校验 JSON 格式。
- [ ] 导入时校验 `version`。
- [ ] 导入时校验字段范围。
- [ ] 导入失败时展示明确错误。

### 可导出的字段

- [ ] `provider`
- [ ] `base_url`
- [ ] `model`
- [ ] `temperature`
- [ ] `top_k`
- [ ] `chunk_size`
- [ ] `chunk_overlap`
- [ ] `rerank_top_n`
- [ ] `agent_nodes`
- [ ] `theme`
- [ ] `ui_layout`
- [ ] `queue_preferences`

### 禁止导出的字段

- [ ] 你的服务端 API Key
- [ ] 用户 API Key
- [ ] 上传文档原文
- [ ] 向量库数据
- [ ] 用户聊天记录
- [ ] 对话摘要
- [ ] 面试官访问码
- [ ] Authorization Header

## 后端接口 TODO

### `GET /api/v1/health`

- [ ] 返回服务状态。
- [ ] 返回向量库状态。
- [ ] 返回队列状态。
- [ ] 返回预算状态，但不返回密钥和精确费用敏感细节。
- [ ] 不返回密钥、模型凭证、服务器敏感路径。

### `GET /api/v1/me`

- [ ] 返回当前角色。
- [ ] 返回游客剩余对话次数。
- [ ] 返回是否为面试官优先通道。
- [ ] 返回当前队列概况。
- [ ] 不返回任何 API Key。

### `POST /api/v1/auth/interviewer`

- [ ] 接收面试官访问码。
- [ ] 使用哈希校验访问码。
- [ ] 校验成功后写入 HttpOnly Cookie。
- [ ] 校验失败时返回通用错误，不泄露访问码是否接近正确。

### `POST /api/v1/chat/runs`

- [ ] 创建对话任务。
- [ ] 校验角色额度。
- [ ] 校验全局预算。
- [ ] 返回 `run_id`、角色、队列位置、预计等待时间。

### `GET /api/v1/chat/runs/{run_id}/stream`

- [ ] 通过 SSE 返回队列状态。
- [ ] 通过 SSE 返回 Agent 步骤。
- [ ] 通过 SSE 返回最终回答。
- [ ] 通过 SSE 返回对话摘要。
- [ ] 异常时返回可读错误事件。

### `POST /api/v1/documents/upload`

- [ ] 接收文档。
- [ ] 限制文件大小。
- [ ] 校验文件类型。
- [ ] 解析文本。
- [ ] 分块。
- [ ] embedding。
- [ ] 写入 ChromaDB。
- [ ] 返回文档 ID、文件名、分块数量。
- [ ] 原始上传文件解析后立刻删除。
- [ ] 分块文本和向量索引按 session 隔离。
- [ ] 文档片段和向量索引 2 小时后清理。

### `POST /api/v1/retrieve`

- [ ] 接收 query。
- [ ] 执行向量检索。
- [ ] 执行 rerank。
- [ ] 返回 TopN 文档片段。
- [ ] 供前端 BYOK 模式使用。

### `POST /api/v1/agent/stream`

- [ ] 接收用户问题和知识库配置。
- [ ] 使用服务端 API Key。
- [ ] 进入任务队列后执行。
- [ ] 面试官任务优先于游客任务。
- [ ] 通过 SSE 返回 Agent 步骤。
- [ ] 通过 SSE 返回最终回答。
- [ ] 异常时返回可读错误事件。

## Agent 流程 TODO

### 固定流程

- [ ] Planner Agent：判断是否需要检索知识库。
- [ ] Retriever Agent：调用检索工具获取上下文。
- [ ] Answer Agent：结合上下文生成回答。
- [ ] Verifier Agent：检查回答是否脱离资料、是否需要补充免责声明。

### 稳定性要求

- [ ] 每一步都有最大耗时。
- [ ] 每一步都有失败兜底。
- [ ] 检索为空时不胡编。
- [ ] 模型超时时给出重试建议。
- [ ] Agent 步骤以结构化事件返回。
- [ ] 前端展示每一步状态：等待、执行中、成功、失败。

## RAG TODO

- [ ] 默认分块大小：512 字符。
- [ ] 默认 overlap：50 字符。
- [ ] 默认 TopK：8。
- [ ] 默认 rerank 后取 Top3。
- [ ] 默认单文件最大 5 MiB。
- [ ] 默认单会话最多处理 300k 字符。
- [ ] 默认 RAG 临时索引 2 小时过期。
- [ ] 默认原始上传文件解析后立刻删除。
- [ ] 支持空召回兜底。
- [ ] 支持文档片段来源展示。
- [ ] Prompt 中明确要求优先基于资料回答。
- [ ] 不确定时提示“知识库中没有足够信息”。

## 部署 TODO

- [ ] 购买海外 / 香港云服务器。
- [ ] 安装 Docker 和 Docker Compose。
- [ ] 配置 `.env`。
- [ ] 设置 `LLM_API_KEY`。
- [ ] 设置 `EMBEDDING_API_KEY`。
- [ ] 设置 `INTERVIEWER_CODE_HASH`。
- [ ] 设置 `DAILY_TOKEN_BUDGET_RMB`。
- [ ] 配置 Nginx。
- [ ] 配置 HTTPS。
- [ ] 阿里云 2C2G 服务器增加 1-2 GiB swap。
- [ ] 设置上传文件大小限制。
- [ ] 设置请求频率限制。
- [ ] 设置每日 token 预算。
- [ ] 设置游客并发限制。
- [ ] 设置面试官优先队列。
- [ ] 设置 2 小时 RAG 清理定时任务。
- [ ] 开启后端健康检查。
- [ ] 用测试文档跑完整链路。
- [ ] 检查前端源码和 Network，不出现你的 `LLM_API_KEY`。

## 简历包装 TODO

- [ ] README 顶部放在线 Demo 地址。
- [ ] README 放项目截图。
- [ ] README 放架构图。
- [ ] README 放启动命令。
- [ ] README 放接口说明。
- [ ] README 说明密钥安全设计。
- [ ] README 说明游客限制、队列和面试官优先通道。
- [ ] README 说明每日预算保护。
- [ ] README 说明 RAG 临时索引 2 小时过期。
- [ ] README 说明对话摘要本地保存 24 小时。
- [ ] README 说明免费 / 低价 API Provider 选择。
- [ ] README 说明 Agent 状态图。
- [ ] README 说明配置导入导出。
- [ ] 录制 1 分钟演示视频。
- [ ] 截取首页、上传、问答、Agent 轨迹、配置页图片。

## 简历项目描述草稿

项目名：AgentKB - 多 Agent 知识库问答平台

描述：

> 基于 FastAPI、React、ChromaDB 和 OpenAI-compatible API 实现的知识库问答平台，支持文档上传、文本分块、向量检索、rerank、Prompt 注入、SSE 流式回答和固定流程 Agent 编排。项目提供 Gemini 风格聊天界面、Agent 执行轨迹、配置导入导出、服务端密钥隔离和浏览器本地 BYOK 能力，并通过 Docker Compose 部署到云服务器。

可写进简历的亮点：

- [ ] 设计 RAG 链路：文档解析、分块、embedding、TopK 检索、rerank、上下文注入。
- [ ] 实现固定流程 Agent：规划、检索、回答、校验，降低自由 Agent 不稳定问题。
- [ ] 使用 SSE 推送 Agent 步骤和模型回答，提升前端交互体验。
- [ ] 支持 OpenAI-compatible API，兼容 DeepSeek、Qwen、OpenAI 等模型服务。
- [ ] 实现服务端密钥隔离和浏览器本地 BYOK，避免默认密钥泄露。
- [ ] 实现游客限额、任务队列、预计等待时间和面试官优先通道。
- [ ] 实现每日 token 预算和低成本模型 Provider 切换。
- [ ] 实现 2 小时临时 RAG 索引清理和 24 小时本地摘要保存。
- [ ] 支持配置导入导出，便于复现实验参数和演示环境。
- [ ] 使用 Docker Compose 和 Nginx 部署到云服务器，并提供在线 Demo。

## 竞品对比 TODO

- [ ] 对比 Dify：功能全，但平台重；本项目更适合作品集展示手写工程链路。
- [ ] 对比 RAGFlow：检索能力强；本项目聚焦轻量部署、漂亮 UI 和稳定演示。
- [ ] 对比 AnythingLLM：偏本地知识库和 Agent；本项目强调 Web 部署和简历展示。
- [ ] 对比 MaxKB：偏企业级平台；本项目强调个人可独立实现和面试可解释。

## 验收标准

- [ ] 能上传一份文档。
- [ ] 能基于文档回答问题。
- [ ] 能展示 Agent 执行轨迹。
- [ ] 能导出配置。
- [ ] 能导入配置。
- [ ] 导出配置不包含任何 API Key。
- [ ] 你的服务端 API Key 不出现在前端源码和浏览器 Network。
- [ ] 用户 API Key 不发送到你的后端。
- [ ] 游客达到公开预算或队列容量限制后不能继续消耗服务端 API Key。
- [ ] 游客高并发时进入队列并看到预计等待时间。
- [ ] 面试官访问码用户可以优先进入对话。
- [ ] 达到每日预算后游客服务暂停。
- [ ] 上传文档和向量索引 2 小时后自动清理。
- [ ] 对话摘要只保存在浏览器本地 24 小时。
- [ ] Docker Compose 可以一键启动。
- [ ] 云服务器 HTTPS 可访问。
- [ ] README 能让面试官 3 分钟看懂项目价值。

## 风险与取舍

- BYOK 只保存在浏览器本地更安全，但部分模型服务可能不支持浏览器跨域请求。
- 可视化工作流 v1 只做展示和配置，不做完整拖拽编排，避免开发周期失控。
- 多 Agent 采用固定流程，牺牲自由度，换取稳定性和可演示性。
- 默认服务端密钥必须做频率限制和预算限制，否则公开 Demo 可能被刷 token。
- 免费 / 低价 API 稳定性可能波动，需要支持 Provider 快速切换。
- 2C2G 服务器不适合本地运行大 embedding 模型，默认走外部 embedding API。
- 公开匿名 Demo 必须限制公开预算、队列容量、上传大小和内容长度，否则容易超预算。
- 面试官优先通道提升演示稳定性，但访问码泄露后需要支持快速轮换。
- 项目目标是求职作品集，不是对标 Dify、RAGFlow、AnythingLLM、MaxKB 的完整商业平台。

