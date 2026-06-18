# AgentKB 整体架构

## 目标架构

AgentKB 采用单机 Docker Compose 部署，适配阿里云轻量应用服务器 `2 vCPU / 2 GiB / 40 GiB / Ubuntu 24.04`。系统由 React 前端、FastAPI 后端、SQLite、ChromaDB 和 Nginx 组成。LLM 和 embedding 默认使用外部 OpenAI-compatible API，避免本地大模型占用内存。

```text
Browser
  |
  | HTTPS / HTTP
  v
Nginx
  |-- /              -> React static build
  |-- /api/*         -> FastAPI
  |-- /api/*/stream  -> FastAPI SSE

FastAPI
  |-- SQLite         -> sessions, runs, budgets, temporary chunks
  |-- Vector adapter -> future session-scoped vectors
  |-- Provider API   -> LLM and embedding
```

## 前端

- React + Vite + TypeScript 实现单页工作台。
- 三栏布局：知识库和摘要、聊天主区、Agent 轨迹。
- 状态通过 service 层对接 API，当前原型可用 mock 行为演示。
- IndexedDB 只保存用户 API Key、配置草稿和 24 小时摘要。
- 导出配置只包含安全字段，不包含密钥、文档、向量和聊天记录。

## 后端

- FastAPI 提供文档上传、检索、任务创建、SSE 流、角色识别、健康检查。
- SQLite 保存轻量状态：session、chat run、budget、document metadata 和临时 chunks。
- v1 先用 SQLite 轻量词法检索，保留向量库适配边界，后续可替换为 ChromaDB。
- 后台清理任务定期删除超过 2 小时的文档片段、向量索引和临时文件。
- 日志中必须脱敏 Authorization、Cookie、token、api_key、LLM_API_KEY。

## RAG 数据流

1. 用户上传 TXT、MD、PDF。
2. 后端校验大小和类型。
3. 后端解析文本，原始文件解析后立即删除。
4. 文本按默认 512 字符、50 overlap 分块。
5. v1 将 chunks 写入 SQLite，使用轻量词法检索。
6. 后续接入外部 embedding API 后，可写入 session-scoped 向量索引。
7. 用户提问后检索 TopK，默认 8。
8. 可选 rerank，默认关闭。
9. Prompt 注入上下文，要求优先基于资料回答。
10. SSE 返回 Agent 步骤和最终回答。

## 队列和权限

- 角色：`guest`、`interviewer`、`admin`。
- 游客不按固定每日次数限制，改用公开每日预算、游客池队列容量和问题长度限制。
- 面试官通过访问码登录，服务端只保存访问码哈希，登录成功后写入 HttpOnly Cookie。
- 游客任务进入游客池，面试官任务进入独立优先池，两个池的队列位置、并发和容量分别计算。
- 全局并发默认 2，游客并发默认 1，面试官并发默认 1。
- 当前账号排队位置来自当前 session 的活跃任务在所属池内的位置。
- 预计等待时间 = 所属池前方任务数 * 最近 20 次平均耗时，默认平均耗时 45 秒。

## 成本和预算

- 默认使用低成本 OpenAI-compatible Provider。
- LLM 推荐 `qwen-flash`、`DeepSeek-V4-Flash` 或同级低价模型。
- Embedding 推荐外部 API，例如 `text-embedding-v4` 或 SiliconFlow embedding。
- 每次调用记录输入 token、输出 token、embedding token 和预估费用。
- 每日公开预算默认 `DAILY_TOKEN_BUDGET_RMB=10`。
- 优先池预算默认 `PRIORITY_DAILY_TOKEN_BUDGET_RMB=20`。
- 达到游客预算后暂停游客池服务，面试官仍可使用独立优先池预算。

## 安全边界

- 服务端 API Key 只存在 `.env` 和服务端进程内。
- 服务端 API Key 不返回给前端、不写日志、不进入导出配置。
- 用户 BYOK Key 只保存在浏览器 IndexedDB，不上传后端。
- BYOK 模式不占用游客池或优先池额度，但仍受服务器硬件并发和内容大小限制。
- 访问码只保存哈希，不保存明文。
- 上传原文件解析后立即删除。
- 临时向量索引 2 小时过期。
- 对话摘要只在浏览器本地保存 24 小时。

## 资源约束

- 2 GiB 内存不适合本地跑重 embedding 模型。
- 必须配置 1-2 GiB swap，防止构建或峰值请求 OOM。
- 单文件默认限制 5 MiB。
- 单会话最多处理 300k 字符进入分块。
- RAG 临时数据建议控制在 5-10 GiB 内。
