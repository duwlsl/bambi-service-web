"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link2, ShieldCheck } from "lucide-react";

import { useAuth } from "@/components/auth/use-auth";
import { Orb } from "@/components/brand/orb";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import {
  decideOAuthAuthorization,
  getOAuthAuthorizationRequest,
} from "@/lib/repositories/oauth";
import type { OAuthAuthorizationRequest } from "@/types/oauth";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; request: OAuthAuthorizationRequest }
  | { kind: "error"; message: string };

const REQUEST_ID_PATTERN = /^bmb_auth_[A-Za-z0-9_-]{20,80}$/;

export function OAuthAuthorizeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user } = useAuth();
  const requestId = searchParams.get("request_id");
  const requestIdIsValid = requestId !== null && REQUEST_ID_PATTERN.test(requestId);
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [deciding, setDeciding] = useState<"approve" | "deny" | null>(null);

  useEffect(() => {
    if (!requestIdIsValid || !requestId) return;
    if (status === "guest") {
      const returnTo = `/oauth/authorize?request_id=${encodeURIComponent(requestId)}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (status !== "authenticated") return;

    const controller = new AbortController();
    getOAuthAuthorizationRequest(requestId, controller.signal)
      .then((request) => setLoadState({ kind: "ready", request }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof ApiError && error.status === 404
            ? "연결 요청을 찾을 수 없습니다. AI 서비스에서 다시 연결해 주세요."
            : "연결 요청을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setLoadState({ kind: "error", message });
      });
    return () => controller.abort();
  }, [requestId, requestIdIsValid, router, status]);

  async function decide(approved: boolean) {
    if (!requestId || deciding !== null) return;
    setDeciding(approved ? "approve" : "deny");
    try {
      const result = await decideOAuthAuthorization(requestId, approved);
      window.location.assign(result.redirectUrl);
    } catch {
      setLoadState({
        kind: "error",
        message: "승인 결과를 처리하지 못했습니다. AI 서비스에서 다시 연결해 주세요.",
      });
      setDeciding(null);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-[480px] rounded-[24px] border border-border bg-card p-7 shadow-sm sm:p-9">
        <div className="mb-7 flex items-center justify-center gap-3">
          <Orb size={42} />
          <Link2 className="size-5 text-muted-foreground" aria-hidden="true" />
          <div className="flex size-[42px] items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
        </div>

        {!requestIdIsValid ? (
          <Status title="연결할 수 없어요" description="올바르지 않은 연결 요청입니다." />
        ) : status === "loading" || status === "guest" || loadState.kind === "loading" ? (
          <Status title="연결 요청을 확인하고 있어요" description="잠시만 기다려 주세요." />
        ) : status === "error" ? (
          <Status
            title="로그인 상태를 확인하지 못했어요"
            description="네트워크를 확인한 뒤 페이지를 새로고침해 주세요."
          />
        ) : loadState.kind === "error" ? (
          <Status title="연결할 수 없어요" description={loadState.message} />
        ) : (
          <>
            <div className="text-center">
              <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                MCP 연결 승인
              </p>
              <h1 className="text-[24px] font-bold tracking-[-0.02em] text-foreground">
                {loadState.request.clientName}에서
                <br />내 LLM Wiki를 사용하도록 허용할까요?
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {user?.email} 계정으로 연결합니다.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                요청 출처: {loadState.request.clientOrigin}
              </p>
            </div>

            <div className="my-7 rounded-2xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">허용되는 권한</p>
              <div className="mt-3 flex gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">개인 LLM Wiki 읽기</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    저장된 문서를 검색하고 선택한 문서의 본문과 출처를 읽을 수 있습니다.
                    문서 수정·삭제 권한은 포함되지 않습니다.
                  </p>
                </div>
              </div>
            </div>

            <p className="mb-5 text-center text-xs leading-5 text-muted-foreground">
              연결 후에도 설정에서 개발자용 API 키를 별도로 관리할 수 있습니다.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                disabled={deciding !== null}
                onClick={() => void decide(false)}
              >
                {deciding === "deny" ? "거부 중…" : "거부"}
              </Button>
              <Button
                type="button"
                className="h-11 rounded-xl"
                disabled={deciding !== null}
                onClick={() => void decide(true)}
              >
                {deciding === "approve" ? "연결 중…" : "허용하고 연결"}
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Status({ title, description }: { title: string; description: string }) {
  return (
    <div className="py-8 text-center" role="status">
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
