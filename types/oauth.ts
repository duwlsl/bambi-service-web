export type OAuthAuthorizationRequest = {
  requestId: string;
  clientName: string;
  clientOrigin: string;
  scope: string;
  resource: string;
  expiresAt: string;
};

export type OAuthConnection = {
  id: string;
  clientName: string;
  scope: string;
  status: "active" | "expired" | "revoked";
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

export type OAuthAuthorizationDecision = {
  redirectUrl: string;
};
