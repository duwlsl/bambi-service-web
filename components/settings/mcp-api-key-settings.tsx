import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { resolveErrorMessage } from "@/constants/errors";
import type { useMcpApiKeys } from "@/hooks/use-mcp-api-keys";
import type { useOAuthConnections } from "@/hooks/use-oauth-connections";
import { ApiError } from "@/lib/api-client";
import { createMcpApiKey, revokeMcpApiKey } from "@/lib/repositories/mcp-api-keys";
import { revokeOAuthConnection } from "@/lib/repositories/oauth";
import type { IssuedMcpApiKey, McpApiKey } from "@/types/mcp";
import type { OAuthConnection } from "@/types/oauth";

/** MCP 서버 URL — 빌드 시 주입되는 환경값. 본문·rail 이 같은 값을 보도록 여기 한 곳에서만 읽는다. */
export const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim() ?? "";

/**
 * MCP UI OAuth 안내와 개발자용 Personal Access Token 발급·목록·폐기 UI.
 *
 * 조회 상태(`keys`·`connections`)는 **상위(SettingsView)가 소유**하고 여기로 내려준다.
 * 우측 rail 이 같은 값을 요약해야 하는데, 양쪽이 각자 훅을 부르면 같은 API 를 두 번 치고
 * 두 화면의 값이 서로 어긋날 수 있다. 발급·폐기·해제 후 `refetch` 는 여기서 그대로 부르며,
 * 같은 훅 인스턴스라 본문과 rail 이 함께 갱신된다.
 */
export function McpApiKeySettings({
  mcpConfigured,
  keys,
  connections,
}: {
  mcpConfigured: boolean;
  keys: ReturnType<typeof useMcpApiKeys>;
  connections: ReturnType<typeof useOAuthConnections>;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [issued, setIssued] = useState<IssuedMcpApiKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!mcpConfigured || !normalizedName || submitting || issued !== null) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const created = await createMcpApiKey(normalizedName);
      setIssued(created);
      setName("");
      setFormOpen(false);
      keys.refetch();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(key: McpApiKey) {
    if (revokingId || !window.confirm(`“${key.name}” 연결 키를 폐기할까요? 폐기 후에는 되돌릴 수 없어요.`)) {
      return;
    }
    setRevokingId(key.id);
    setMessage(null);
    try {
      await revokeMcpApiKey(key.id);
      keys.refetch();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setRevokingId(null);
    }
  }

  async function handleDisconnect(connection: OAuthConnection) {
    if (
      disconnectingId ||
      !window.confirm(`“${connection.clientName}” OAuth 연결을 해제할까요?`)
    ) {
      return;
    }
    setDisconnectingId(connection.id);
    setMessage(null);
    try {
      await revokeOAuthConnection(connection.id);
      connections.refetch();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setDisconnectingId(null);
    }
  }

  async function copy(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(success);
    } catch {
      setCopyMessage("복사하지 못했어요. 값을 직접 선택해 복사해 주세요.");
    }
  }

  return (
    <section className="mb-3.5 rounded-2xl border border-border bg-card px-[22px] py-1.5">
      <div className="flex flex-wrap items-start justify-between gap-3 pt-4 pb-2">
        <div>
          <h2 className="text-[14.5px] font-bold text-foreground">외부 AI 연결</h2>
          <p className="mt-1 text-[12px] leading-[1.55] text-muted-foreground">
            Claude·ChatGPT UI는 서비스 로그인으로, Codex·직접 연동은 개발자 키로 연결해요.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={!mcpConfigured || issued !== null}
          title={issued ? "현재 원문 키를 보관하고 닫은 뒤 새 키를 발급할 수 있어요." : undefined}
          onClick={() => setFormOpen((open) => !open)}
        >
          {issued ? "원문 키 보관 필요" : formOpen ? "취소" : "개발자 키 발급"}
        </Button>
      </div>

      <div className="border-t border-border py-4">
        <div className="text-[12px] font-semibold text-foreground">MCP 서버 URL</div>
        {MCP_SERVER_URL ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-background px-3 py-2 text-[11.5px] text-foreground">
              {MCP_SERVER_URL}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(MCP_SERVER_URL, "서버 URL을 복사했어요.")}>
              복사
            </Button>
          </div>
        ) : (
          <p className="mt-1 text-[12px] text-destructive">
            MCP 서버가 준비되지 않아 새 키를 발급할 수 없어요. 운영 환경 설정을 확인해 주세요.
          </p>
        )}
        <p className="mt-2 text-[11.5px] leading-[1.55] text-muted-foreground">
          Claude·ChatGPT UI에는 이 URL만 등록하세요. 기존 계정 로그인과 읽기 권한 승인 화면이
          자동으로 열립니다. API Key 입력란이 있는 개발자용 client만 아래 키를 사용하세요.
        </p>
      </div>

      <div className="border-t border-border py-4">
        <div className="text-[12px] font-semibold text-foreground">서비스 로그인 연결</div>
        <p className="mt-1 text-[11.5px] leading-[1.55] text-muted-foreground">
          Claude·ChatGPT UI에서 로그인해 승인한 연결입니다. 해제하면 access token과 refresh
          token을 모두 더 이상 사용할 수 없습니다.
        </p>
        {mcpConfigured ? (
          <OAuthConnectionList
            connections={connections}
            disconnectingId={disconnectingId}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <p className="mt-3 text-[12px] text-muted-foreground">
            MCP 서버 설정이 완료되면 승인한 연결을 확인할 수 있어요.
          </p>
        )}
      </div>

      {formOpen && issued === null && (
        <form onSubmit={handleCreate} className="border-t border-border py-4">
          <label htmlFor="mcp-key-name" className="text-[12px] font-semibold text-foreground">
            개발자 키 이름
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="mcp-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={64}
              placeholder="예: 개인 Codex 연결"
              autoComplete="off"
              className="focus-ring h-8 min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 text-[12px] text-foreground placeholder:text-muted-foreground"
            />
            <Button type="submit" size="sm" disabled={!name.trim() || submitting}>
              {submitting ? "발급 중…" : "발급하기"}
            </Button>
          </div>
        </form>
      )}

      {issued && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4" role="status">
          <div className="text-[13px] font-bold text-foreground">지금 키를 복사해 안전한 곳에 보관하세요</div>
          <p className="mt-1 text-[11.5px] leading-[1.55] text-muted-foreground">
            보안을 위해 이 원문 키는 닫은 뒤 다시 확인할 수 없어요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-card px-3 py-2 text-[11.5px] text-foreground">
              {issued.apiKey}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => copy(issued.apiKey, "API 키를 복사했어요.")}>
              키 복사
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setIssued(null)}
            className="focus-ring mt-3 text-[11.5px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            복사했어요. 원문 닫기
          </button>
        </div>
      )}

      {(message || copyMessage) && (
        <p className={`mb-3 text-[12px] ${message ? "text-destructive" : "text-muted-foreground"}`} role={message ? "alert" : "status"}>
          {message ?? copyMessage}
        </p>
      )}

      <div className="border-t border-border py-2">
        {!mcpConfigured && (
          <p className="py-3 text-[12px] text-muted-foreground">
            MCP 서버 설정이 완료되면 발급한 키 목록을 확인할 수 있어요.
          </p>
        )}
        {keys.status === "loading" && <p className="py-3 text-[12px] text-muted-foreground">발급한 키를 불러오는 중…</p>}
        {keys.status === "error" && (
          <div className="flex flex-wrap items-center justify-between gap-2 py-3" role="alert">
            <p className="text-[12px] text-destructive">키 목록을 불러오지 못했어요.</p>
            <Button type="button" variant="outline" size="sm" onClick={keys.refetch}>다시 시도</Button>
          </div>
        )}
        {keys.status === "success" && keys.data.items.length === 0 && (
          <p className="py-3 text-[12px] text-muted-foreground">아직 발급한 연결 키가 없어요.</p>
        )}
        {keys.status === "success" && keys.data.items.map((key) => (
          <KeyRow key={key.id} apiKey={key} revoking={revokingId === key.id} onRevoke={handleRevoke} />
        ))}
      </div>
    </section>
  );
}

function OAuthConnectionList({
  connections,
  disconnectingId,
  onDisconnect,
}: {
  connections: ReturnType<typeof useOAuthConnections>;
  disconnectingId: string | null;
  onDisconnect: (connection: OAuthConnection) => void;
}) {
  if (connections.status === "loading" || connections.status === "idle") {
    return <p className="mt-3 text-[12px] text-muted-foreground">OAuth 연결을 불러오는 중…</p>;
  }
  if (connections.status === "error") {
    return (
      <div className="mt-3 flex items-center justify-between gap-2" role="alert">
        <p className="text-[12px] text-destructive">OAuth 연결을 불러오지 못했어요.</p>
        <Button type="button" variant="outline" size="sm" onClick={connections.refetch}>
          다시 시도
        </Button>
      </div>
    );
  }
  if (connections.data.length === 0) {
    return <p className="mt-3 text-[12px] text-muted-foreground">아직 승인한 UI 연결이 없어요.</p>;
  }
  return (
    <div className="mt-3">
      {connections.data.map((connection) => (
        <div
          key={connection.id}
          className="flex flex-wrap items-center gap-3 border-t border-border py-3 first:border-t-0"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-foreground">{connection.clientName}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {connection.status === "active" ? "연결됨" : connection.status === "expired" ? "만료됨" : "해제됨"}
              {" · 승인 "}{formatDate(connection.createdAt)}
            </div>
          </div>
          {connection.status === "active" && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={disconnectingId !== null}
              onClick={() => onDisconnect(connection)}
            >
              {disconnectingId === connection.id ? "해제 중…" : "연결 해제"}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function KeyRow({ apiKey, revoking, onRevoke }: { apiKey: McpApiKey; revoking: boolean; onRevoke: (key: McpApiKey) => void }) {
  const active = apiKey.status === "active";
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground">{apiKey.name}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            {statusLabel(apiKey.status)}
          </span>
        </div>
        <div className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{apiKey.keyPrefix}••••••••</div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          발급 {formatDate(apiKey.createdAt)} · 마지막 사용 {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : "없음"}
        </div>
      </div>
      {active && (
        <Button type="button" variant="destructive" size="sm" disabled={revoking} onClick={() => onRevoke(apiKey)}>
          {revoking ? "폐기 중…" : "폐기"}
        </Button>
      )}
    </div>
  );
}

function statusLabel(status: McpApiKey["status"]): string {
  if (status === "active") return "사용 중";
  if (status === "expired") return "만료됨";
  return "폐기됨";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "알 수 없음";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function errorMessage(error: unknown): string {
  return resolveErrorMessage(error instanceof ApiError ? error.rawCode : null);
}
