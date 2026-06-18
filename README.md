# AgentKB

轻量 AI 知识库问答作品集，目标是在低成本 2C2G 云服务器上展示 RAG、固定流程 Agent、SSE 流式回答、游客限额、面试官优先通道和密钥安全设计。

## 当前状态

- 前端原型已完成，并拆分为 `components`、`services`、`types`、`utils`。
- 前端默认使用 mock fallback，后端未启动时也能演示上传、排队、流式回答和面试官入口。
- 后端 FastAPI 骨架已创建，包含配置、SQLite 初始化、`GET /api/v1/health`、`GET /api/v1/me`。
- 面试官访问码、游客额度、任务队列和 mock SSE 流已接入真实后端。
- TXT、Markdown、PDF 上传已接入真实后端。
- 后端已支持临时分块索引、轻量检索、2 小时 TTL 清理和基于检索片段的 SSE 回答。
- 当前检索是 SQLite 轻量词法检索，不依赖本地大模型；真实 embedding API 留到下一阶段。
- 面试官访问码使用脚本随机生成，后端只读取 `INTERVIEWER_CODE_HASH`，不接受固定默认明文码。
- 游客池和优先池已隔离，页面会显示当前账号所在池、当前账号排队位置和双池概况。
- BYOK 本地密钥模式不占用游客池或优先池额度，但仍受服务器硬件并发和内容大小限制。
- PRD、架构、路线图、接口契约和部署规划已放在 `tasks/` 和 `docs/`。

## 本地前端

```powershell
cd C:\Users\tianh\Projects\agentkb-portfolio\frontend
npm install
npm run dev
```

构建检查：

```powershell
cd C:\Users\tianh\Projects\agentkb-portfolio\frontend
npm run build
```

## 本地后端

当前机器没有可用 Python，仅有 Microsoft Store 占位符。安装 Python 3.12 后运行：

```powershell
cd C:\Users\tianh\Projects\agentkb-portfolio\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe scripts\generate_interviewer_code.py
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

生成访问码后，把输出的 `INTERVIEWER_CODE_HASH` 写入 `backend\.env`。明文 `INTERVIEWER_CODE` 只发给面试官，不提交到仓库。

健康检查：

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:8000/api/v1/health -UseBasicParsing
```

创建一次 mock 流式问答：

```powershell
$body = @{ question='测试 SSE'; top_k=8; temperature=0.3; use_rerank=$false } | ConvertTo-Json
$run = Invoke-RestMethod -Uri http://127.0.0.1:8000/api/v1/chat/runs -Method Post -Body $body -ContentType 'application/json'
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/v1/chat/runs/$($run.run_id)/stream" -UseBasicParsing
```

上传并检索测试文档：

```powershell
$sample = "C:\Users\tianh\Projects\agentkb-portfolio\backend\sample-rag.txt"
Set-Content -LiteralPath $sample -Value "AgentKB 的亮点是固定流程 Agent、临时 RAG 索引、面试官优先队列和服务端密钥隔离。" -Encoding UTF8
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/v1/me -WebSession $session
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/v1/documents/upload -Method Post -Form @{ file = Get-Item -LiteralPath $sample } -WebSession $session
$body = @{ query="AgentKB 的亮点是什么"; top_k=3 } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/v1/retrieve -Method Post -Body $body -ContentType "application/json" -WebSession $session
Remove-Item -LiteralPath $sample
```

## 安全边界

- 服务端 API Key 只放 `.env`，不进入前端、导出配置和日志。
- 用户 BYOK Key 只保存在浏览器本地。
- 面试官访问码后端只保存哈希。
- 上传原文解析后删除，临时向量索引 2 小时清理。
- 对话摘要只在浏览器本地保存 24 小时。
