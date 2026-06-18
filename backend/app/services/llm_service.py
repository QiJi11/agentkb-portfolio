import json
from dataclasses import dataclass
from collections.abc import AsyncIterator

import httpx

from app.core.config import settings
from app.schemas.retrieve import RetrieveMatch


class LlmConfigurationError(RuntimeError):
    """Raised when server-side LLM settings are incomplete."""


@dataclass(frozen=True)
class LlmEndpoint:
    """One OpenAI-compatible model endpoint."""

    name: str
    base_url: str
    model: str
    api_key: str


class LlmEndpointError(RuntimeError):
    """Raised when one endpoint fails and the pool should try another."""


def build_answer_messages(question: str, matches: list[RetrieveMatch]) -> list[dict[str, str]]:
    """Build a bounded RAG prompt for OpenAI-compatible chat APIs."""
    context = "\n\n".join(
        f"[{index + 1}] 文件：{match.filename}\n片段：{match.text}"
        for index, match in enumerate(matches[:5])
    )
    if not context:
        context = "当前会话没有检索到可用知识库片段。"

    return [
        {
            "role": "system",
            "content": (
                "你是 AgentKB 的知识库问答助手。优先基于给定资料回答。"
                "如果资料不足，要明确说明知识库中没有足够信息，不要编造来源。"
                "回答要简洁、直接，并在相关内容后注明来源文件名。"
            ),
        },
        {
            "role": "user",
            "content": f"用户问题：{question}\n\n可用资料：\n{context}",
        },
    ]


def get_llm_endpoints() -> list[LlmEndpoint]:
    """Parse configured LLM endpoints, falling back to the legacy single endpoint."""
    endpoints: list[LlmEndpoint] = []
    raw = settings.llm_endpoints_json.strip()
    if raw:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as error:
            raise LlmConfigurationError("LLM_ENDPOINTS_JSON 不是有效 JSON") from error
        if not isinstance(parsed, list):
            raise LlmConfigurationError("LLM_ENDPOINTS_JSON 必须是数组")
        for index, item in enumerate(parsed):
            if not isinstance(item, dict):
                continue
            if item.get("enabled", True) is False:
                continue
            endpoint = LlmEndpoint(
                name=str(item.get("name") or f"endpoint-{index + 1}"),
                base_url=str(item.get("base_url") or "").strip().rstrip("/"),
                model=str(item.get("model") or "").strip(),
                api_key=str(item.get("api_key") or "").strip(),
            )
            if endpoint.base_url and endpoint.model and endpoint.api_key:
                endpoints.append(endpoint)
        if not endpoints:
            raise LlmConfigurationError("LLM_ENDPOINTS_JSON 没有可用 endpoint")
        return endpoints

    if not settings.llm_api_key.strip():
        raise LlmConfigurationError("后端未配置 LLM_API_KEY")
    if not settings.llm_base_url.strip():
        raise LlmConfigurationError("后端未配置 LLM_BASE_URL")
    if not settings.llm_model.strip():
        raise LlmConfigurationError("后端未配置 LLM_MODEL")
    return [
        LlmEndpoint(
            name=settings.llm_provider or "default",
            base_url=settings.llm_base_url.strip().rstrip("/"),
            model=settings.llm_model.strip(),
            api_key=settings.llm_api_key.strip(),
        )
    ]


async def stream_chat_completion(question: str, matches: list[RetrieveMatch]) -> AsyncIterator[str]:
    """Stream answer text from an OpenAI-compatible chat completion API."""
    endpoints = get_llm_endpoints()
    payload = {
        "messages": build_answer_messages(question, matches),
        "temperature": 0.3,
        "stream": True,
    }
    failures: list[str] = []
    for endpoint in endpoints:
        try:
            emitted = False
            async for text in stream_endpoint_completion(endpoint, payload):
                emitted = True
                yield text
            if emitted:
                return
            failures.append(f"{endpoint.name}: empty stream")
        except LlmEndpointError as error:
            failures.append(f"{endpoint.name}: {error}")

    raise RuntimeError(f"模型服务不可用，已尝试 {len(endpoints)} 个 API")


async def stream_endpoint_completion(endpoint: LlmEndpoint, payload: dict[str, object]) -> AsyncIterator[str]:
    """Stream tokens from a single endpoint."""
    request_payload = {**payload, "model": endpoint.model}
    headers = {
        "Authorization": f"Bearer {endpoint.api_key}",
        "Content-Type": "application/json",
    }

    timeout = httpx.Timeout(connect=10.0, read=60.0, write=20.0, pool=10.0)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", f"{endpoint.base_url}/chat/completions", headers=headers, json=request_payload) as response:
                if response.status_code in {401, 403}:
                    raise LlmEndpointError(f"认证失败 HTTP {response.status_code}")
                if response.status_code == 429 or response.status_code >= 500:
                    raise LlmEndpointError(f"临时不可用 HTTP {response.status_code}")
                if response.status_code >= 400:
                    raise LlmEndpointError(f"请求失败 HTTP {response.status_code}")
                async for line in response.aiter_lines():
                    text = parse_stream_line(line)
                    if text:
                        yield text
    except (httpx.ConnectError, httpx.ReadTimeout, httpx.ConnectTimeout, httpx.RemoteProtocolError) as error:
        raise LlmEndpointError("连接或读取超时") from error


def parse_stream_line(line: str) -> str:
    """Parse one OpenAI-compatible SSE line into content text."""
    if not line.startswith("data:"):
        return ""
    data = line.removeprefix("data:").strip()
    if data == "[DONE]":
        return ""
    try:
        event = json.loads(data)
    except json.JSONDecodeError:
        return ""
    delta = event.get("choices", [{}])[0].get("delta", {})
    text = delta.get("content")
    return text if isinstance(text, str) else ""
