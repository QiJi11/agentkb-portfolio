# AgentKB 整体路线图

## Phase 0: 文档和项目基线

- 完成 PRD、架构文档、接口契约、部署文档。
- 保留现有前端原型作为 UI 基线。
- 明确 MVP 不做后台管理、拖拽工作流和长期企业知识库。

## Phase 1: 前端真实接口化

- 将当前 `App.tsx` 中的 mock 行为抽到 service 层。
- 定义前端类型：role、quota、document、run、agent_step、summary、config。
- 接入真实 API 后保留本地 mock fallback，方便离线演示。
- 完成配置导入导出和 IndexedDB 摘要保存。
- 验证桌面、平板、手机视口。

## Phase 2: 后端基础能力

- 初始化 FastAPI 项目结构。
- 增加 SQLite 初始化和数据访问层。
- 增加健康检查、角色识别、访问码登录、quota 和 budget。
- 实现任务表和简单后台 worker。
- 实现 SSE 基础事件流。

## Phase 3: RAG 链路

- 实现 TXT、MD、PDF 解析。
- 实现分块、外部 embedding、ChromaDB 写入。
- 实现 session 隔离和 2 小时清理。
- 实现 TopK 检索和空召回兜底。
- 接入 Answer Agent，返回带来源回答。

## Phase 4: Agent 和队列

- 完成 Planner、Retriever、Answer、Verifier 固定流程。
- 每个节点增加超时、失败兜底和结构化事件。
- 实现游客排队、预计等待时间和面试官优先队列。
- 实现每日预算耗尽后的游客暂停。

## Phase 5: 部署和安全

- 增加 Dockerfile、docker-compose.yml、`.env.example`。
- 配置 Nginx 反向代理和上传大小限制。
- 配置服务器 swap、Docker、日志轮转。
- 检查前端源码、Network、导出配置不包含服务端 API Key。
- 添加 README、截图、架构图和 1 分钟演示说明。

## Phase 6: 面试包装

- README 顶部放 Demo 地址和测试账号说明。
- README 说明 RAG 链路、Agent 状态图、安全设计、成本控制。
- 准备 5 张截图：首页、上传、问答、Agent 轨迹、配置页。
- 录制 1 分钟演示视频。
- 准备简历项目描述和面试讲解稿。
