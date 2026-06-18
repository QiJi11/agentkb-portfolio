# AgentKB API 契约

## 通用约定

- Base path: `/api/v1`
- 所有 JSON 响应使用 `application/json`。
- SSE 响应使用 `text/event-stream`。
- 服务端不在任何响应中返回 API Key、访问码明文、Authorization Header。
- 错误格式：

```json
{
  "error": {
    "code": "rate_limited",
    "message": "今日公开体验额度已用完"
  }
}
```

## GET /health

返回服务、数据库、向量库和预算状态。

Response:

```json
{
  "status": "ok",
  "database": "ok",
  "vector_store": "ok",
  "queue": {
    "running": 1,
    "queued": 2
  },
  "budget": {
    "guest_available": true
  }
}
```

## GET /me

返回当前角色、预算、队列和限制。

Response:

```json
{
  "role": "guest",
  "is_priority": false,
  "current_pool": "guest",
  "current_run": null,
  "pools": {
    "guest": {
      "running": 0,
      "queued": 0,
      "max_running": 1,
      "max_queue": 20,
      "daily_budget_rmb": 10,
      "estimated_used_rmb": 0,
      "budget_status": "available"
    },
    "priority": {
      "running": 0,
      "queued": 0,
      "max_running": 1,
      "max_queue": 5,
      "daily_budget_rmb": 20,
      "estimated_used_rmb": 0,
      "budget_status": "available"
    }
  },
  "queue": {
    "running": 0,
    "queued": 0,
    "estimated_wait_seconds": 0
  },
  "budget": {
    "daily_budget_rmb": 10,
    "estimated_used_rmb": 0,
    "status": "available"
  },
  "limits": {
    "max_question_chars": 2000,
    "max_upload_mb": 5,
    "max_session_chars": 300000,
    "max_guest_queue": 20,
    "max_priority_queue": 5
  }
}
```

## POST /auth/interviewer

使用面试官访问码登录。

Request:

```json
{
  "code": "demo-code"
}
```

Response:

```json
{
  "role": "interviewer",
  "is_priority": true
}
```

## POST /documents/upload

上传文档并创建临时 RAG 索引。

Request:

- `multipart/form-data`
- field: `file`

Response:

```json
{
  "document_id": "doc_123",
  "filename": "resume.md",
  "size_bytes": 20480,
  "chunk_count": 28,
  "status": "ready",
  "expires_at": "2026-06-18T12:00:00Z"
}
```

## POST /retrieve

供 BYOK 或调试模式检索片段。

Request:

```json
{
  "query": "这个项目的技术栈是什么",
  "top_k": 8,
  "rerank_top_n": 3
}
```

Response:

```json
{
  "matches": [
    {
      "document_id": "doc_123",
      "filename": "resume.md",
      "chunk_id": "chunk_01",
      "score": 0.82,
      "text": "项目使用 FastAPI、React、ChromaDB..."
    }
  ]
}
```

## POST /chat/runs

创建对话任务。

Request:

```json
{
  "question": "根据文档总结项目亮点",
  "top_k": 8,
  "temperature": 0.3,
  "use_rerank": false,
  "execution_mode": "server_key"
}
```

Response:

```json
{
  "run_id": "run_123",
  "role": "guest",
  "pool": "guest",
  "status": "queued",
  "queue_position": 2,
  "estimated_wait_seconds": 90,
  "is_existing_active_run": false
}
```

`execution_mode="byok"` 时任务进入硬件池，不占用游客池或优先池额度；仍受服务器并发、问题长度和单会话活跃任务限制。

## GET /chat/runs/{run_id}/stream

通过 SSE 返回队列、Agent 和回答事件。

Event: `queued`

```json
{
  "queue_position": 2,
  "estimated_wait_seconds": 90
}
```

Event: `running`

```json
{
  "run_id": "run_123"
}
```

Event: `agent_step`

```json
{
  "step": "retriever",
  "status": "success",
  "detail": "召回 8 个片段"
}
```

Event: `token`

```json
{
  "text": "根据资料，"
}
```

Event: `done`

```json
{
  "answer_id": "msg_123",
  "sources": [
    {
      "filename": "resume.md",
      "chunk_id": "chunk_01"
    }
  ],
  "summary": {
    "title": "项目亮点总结",
    "detail": "用户询问项目亮点，系统基于上传文档完成回答。"
  }
}
```

Event: `error`

```json
{
  "code": "model_timeout",
  "message": "模型响应超时，请稍后重试"
}
```
