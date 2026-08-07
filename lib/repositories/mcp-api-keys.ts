import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import type { IssuedMcpApiKey, McpApiKey, McpApiKeyList } from "@/types/mcp";

const MCP_API_KEYS_PATH = "/api/mcp/keys";

/** 로그인 사용자가 발급한 MCP API Key의 안전한 관리 정보만 조회한다. */
export function fetchMcpApiKeys(signal?: AbortSignal): Promise<McpApiKeyList> {
  return apiGet<McpApiKeyList>(MCP_API_KEYS_PATH, { signal });
}

/** 개인 Wiki 읽기 전용 MCP API Key를 발급하고 1회용 원문을 반환한다. */
export function createMcpApiKey(name: string): Promise<IssuedMcpApiKey> {
  return apiPost<IssuedMcpApiKey>(MCP_API_KEYS_PATH, { name });
}

/** 지정한 사용자 소유 MCP API Key를 영구 폐기한다. */
export function revokeMcpApiKey(keyId: string): Promise<McpApiKey> {
  return apiDelete<McpApiKey>(`${MCP_API_KEYS_PATH}/${encodeURIComponent(keyId)}`);
}
