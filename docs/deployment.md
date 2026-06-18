# AgentKB 部署规划

## 服务器

- 云厂商：阿里云轻量应用服务器。
- 系统：Ubuntu 24.04。
- 配置：2 vCPU、2 GiB RAM、40 GiB ESSD。
- 用途：公开作品集 Demo。

## 基础软件

- Docker Engine。
- Docker Compose plugin。
- Nginx。
- Certbot 或云厂商免费证书。
- UFW 或安全组规则。

## 端口

- `22`: SSH，仅允许必要来源或使用强密码/密钥。
- `80`: HTTP，用于站点访问和证书签发。
- `443`: HTTPS。
- 后端和 ChromaDB 容器端口不直接暴露公网。

## Swap

2 GiB 内存需要增加 swap。

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## Docker Compose 服务

- `frontend`: 构建 React 静态文件，或由 Nginx 直接服务 `dist`。
- `backend`: FastAPI。
- `chromadb`: 临时向量库。
- `nginx`: 反向代理和静态文件服务。

## 环境变量

`.env` 必须包含：

```text
APP_ENV=production
PUBLIC_BASE_URL=

LLM_PROVIDER=SiliconFlow
LLM_BASE_URL=
LLM_MODEL=DeepSeek-V4-Flash
LLM_API_KEY=

EMBEDDING_PROVIDER=SiliconFlow
EMBEDDING_BASE_URL=
EMBEDDING_MODEL=text-embedding-v4
EMBEDDING_API_KEY=

INTERVIEWER_CODE_HASH=
DAILY_TOKEN_BUDGET_RMB=3

MAX_UPLOAD_MB=5
MAX_SESSION_CHARS=300000
RAG_TTL_SECONDS=7200
SUMMARY_TTL_SECONDS=86400

MAX_GLOBAL_RUNNING=2
MAX_GUEST_RUNNING=1
MAX_INTERVIEWER_RUNNING=1
```

## Nginx 规则

- `/` 指向前端静态文件。
- `/api/` 反向代理到 FastAPI。
- SSE 路由关闭 proxy buffering。
- 上传大小限制设为 5 MiB 或略高于后端限制。
- 日志不记录 Authorization 和 Cookie 明文。

## 数据目录

- SQLite: `./data/sqlite/agentkb.db`
- ChromaDB: `./data/chroma/`
- 临时上传: `./data/uploads/tmp/`
- 日志: `./data/logs/`

## 清理策略

- 原始上传文件解析完成后立即删除。
- 后台任务每 5 分钟扫描过期 session 数据。
- 文档片段和向量索引 2 小时过期。
- 前端摘要只在 IndexedDB 保存 24 小时，后端不长期保存。

## 上线检查

- `GET /api/v1/health` 返回 ok。
- 上传测试文档后能完成分块和检索。
- 游客提问能看到排队和流式回答。
- 面试官访问码能进入优先通道。
- 达到预算后游客服务暂停。
- 前端源码、Network、导出配置不出现服务端 API Key。
- Docker 重启后服务能自动恢复。
