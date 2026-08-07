"use client";

import { useCallback } from "react";

import { useAsyncData } from "@/hooks/use-async-data";
import { fetchMcpApiKeys } from "@/lib/repositories/mcp-api-keys";

/** 설정 화면에서 MCP API Key 목록을 조회하고 재조회 경계를 제공한다. */
export function useMcpApiKeys(enabled = true) {
  const fetcher = useCallback((signal: AbortSignal) => fetchMcpApiKeys(signal), []);
  return useAsyncData(fetcher, enabled);
}
