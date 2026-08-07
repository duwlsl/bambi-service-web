import { apiDelete, apiGet, apiPost } from "@/lib/api-client";
import type {
  OAuthAuthorizationDecision,
  OAuthAuthorizationRequest,
  OAuthConnection,
} from "@/types/oauth";

const OAUTH_ENDPOINT = "/api/oauth/authorization-requests";

export function getOAuthAuthorizationRequest(
  requestId: string,
  signal?: AbortSignal,
): Promise<OAuthAuthorizationRequest> {
  return apiGet<OAuthAuthorizationRequest>(`${OAUTH_ENDPOINT}/${encodeURIComponent(requestId)}`, {
    signal,
  });
}

export function decideOAuthAuthorization(
  requestId: string,
  approved: boolean,
): Promise<OAuthAuthorizationDecision> {
  return apiPost<OAuthAuthorizationDecision>(
    `${OAUTH_ENDPOINT}/${encodeURIComponent(requestId)}/decision`,
    { approved },
  );
}

export function fetchOAuthConnections(signal?: AbortSignal): Promise<OAuthConnection[]> {
  return apiGet<OAuthConnection[]>("/api/oauth/connections", { signal });
}

export function revokeOAuthConnection(connectionId: string): Promise<OAuthConnection> {
  return apiDelete<OAuthConnection>(
    `/api/oauth/connections/${encodeURIComponent(connectionId)}`,
  );
}
