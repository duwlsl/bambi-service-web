"use client";

import { useCallback } from "react";

import { useAsyncData } from "@/hooks/use-async-data";
import { fetchOAuthConnections } from "@/lib/repositories/oauth";

export function useOAuthConnections() {
  const fetcher = useCallback((signal: AbortSignal) => fetchOAuthConnections(signal), []);
  return useAsyncData(fetcher, true);
}
