import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { resolveErrorMessage } from "@/constants/errors";
import { useMcpApiKeys } from "@/hooks/use-mcp-api-keys";
import { ApiError } from "@/lib/api-client";
import { createMcpApiKey, revokeMcpApiKey } from "@/lib/repositories/mcp-api-keys";
import type { IssuedMcpApiKey, McpApiKey } from "@/types/mcp";

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL?.trim() ?? "";

/** 설정 화면의 MCP Personal Access Token 발급·목록·폐기 UI. */
export function McpApiKeySettings() {
  const keys = useMcpApiKeys();
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [issued, setIssued] = useState<IssuedMcpApiKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName || submitting) return;
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
            Claude, ChatGPT, Codex에서 내 LLM Wiki를 검색할 수 있는 읽기 전용 키예요.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setFormOpen((open) => !open)}>
          {formOpen ? "취소" : "새 키 발급"}
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
            MCP 서버 URL이 아직 설정되지 않았어요. 운영 환경 설정을 확인해 주세요.
          </p>
        )}
        <p className="mt-2 text-[11.5px] leading-[1.55] text-muted-foreground">
          클라이언트의 인증 방식은 Bearer Token으로 선택하고 아래에서 발급한 키를 입력하세요.
        </p>
      </div>

      {formOpen && (
        <form onSubmit={handleCreate} className="border-t border-border py-4">
          <label htmlFor="mcp-key-name" className="text-[12px] font-semibold text-foreground">
            키 이름
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              id="mcp-key-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={64}
              placeholder="예: 개인 Claude 연결"
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
