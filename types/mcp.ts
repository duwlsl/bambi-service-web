/** MCP Personal Access Token 관리 API 계약. 원문은 발급 응답에만 존재한다. */
export type McpApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: "active" | "revoked" | "expired";
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export type McpApiKeyList = {
  items: McpApiKey[];
};

export type IssuedMcpApiKey = McpApiKey & {
  apiKey: string;
  tokenType: "Bearer" | string;
};
