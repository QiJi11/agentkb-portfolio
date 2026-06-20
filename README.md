# AgentKB

AgentKB 是一个轻量 RAG 知识库问答系统，用于展示临时文档索引、固定流程 Agent、SSE 流式回答、游客容量控制、面试官优先通道和 API Key 安全边界。

## 功能概览

- 上传 TXT / MD / PDF 文档后生成临时知识库。
- 文档分块、检索索引和上传数据按 TTL 自动清理。
- 聊天回答支持流式输出，并展示可追溯来源。
- 游客使用公开体验池，受队列、预算和内容长度限制。
- 面试官可通过访问码进入优先池。
- 客户可使用自己的 OpenAI-compatible API Key，不消耗公开预算。
- 服务端支持多个模型 API endpoint，按顺序 fallback。
- 模型服务异常时前端显示自动重试和友好降级，不暴露技术错误。
- 对话结束后生成摘要，摘要按 24 小时生命周期保存。

## 架构亮点

- **前端**：React + Vite + TypeScript，三栏工作台布局。
- **后端**：FastAPI + SQLite，提供身份、文档、检索、聊天和健康检查接口。
- **RAG**：当前采用轻量词法检索，适合低成本服务器部署。
- **Agent 流程**：Planner、Retriever、Answer、Verifier 固定轨迹，便于演示和排查。
- **容量池**：游客池、优先池、客户 API 硬件池分离展示。
- **安全边界**：服务端密钥、访问码、上传原文和导出配置相互隔离。

## 本地运行

前端：

```powershell
cd C:\Users\tianh\Projects\agentkb-portfolio\frontend
npm install
npm run dev
```

后端：

```powershell
cd C:\Users\tianh\Projects\agentkb-portfolio\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts\generate_interviewer_code.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

环境变量参考 `.env.example`。真实 `.env` 不应提交到仓库。

## 配置说明

服务端模型 API 使用 OpenAI-compatible 格式：

```env
LLM_PROVIDER=Agnes
LLM_BASE_URL=https://apihub.agnes-ai.com/v1
LLM_MODEL=agnes-2.0-flash
LLM_API_KEY=
```

也可以通过 `LLM_ENDPOINTS_JSON` 配置多个 endpoint，系统会按数组顺序调用，前面的不可用时再尝试后面的。

## 安全边界

- 服务端 API Key 只放在 `.env`，不进入前端、导出配置或 Git。
- 用户自带 API Key 只保存在当前浏览器本地。
- 面试官访问码后端只保存哈希。
- 上传原文解析后删除，临时索引按 2 小时 TTL 清理。
- 对话摘要按 24 小时生命周期保存。
- 导出配置不包含 API Key、访问码、上传原文、向量数据或聊天记录。

## 项目状态

当前仓库保留公开展示版本，包含前后端主体代码、接口契约、架构说明、部署规划和路线图。后续开发会继续围绕 UI 视觉、真实 embedding、模型可观测性、部署自动化和访问控制完善。
