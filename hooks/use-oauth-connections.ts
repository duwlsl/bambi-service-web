"use client";

import { useCallback } from "react";

import { useAsyncData } from "@/hooks/use-async-data";
import { fetchOAuthConnections } from "@/lib/repositories/oauth";

/** MCP 기능이 구성된 경우에만 승인한 OAuth 연결을 조회한다. */
export function useOAuthConnections(enabled = true) {
  const fetcher = useCallback((signal: AbortSignal) => fetchOAuthConnections(signal), []);
  return useAsyncData(fetcher, enabled);
}
