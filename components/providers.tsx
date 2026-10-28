"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { makeStore, restoreSession, type AppStore } from "@/lib/store";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const [store] = useState<AppStore>(() => makeStore());
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } } }));
  useEffect(() => {
    const token = localStorage.getItem("sociality_token");
    let user: Record<string, unknown> | null = null;
    try { user = JSON.parse(localStorage.getItem("sociality_user") || "null"); } catch { user = null; }
    store.dispatch(restoreSession({ token, user }));
  }, [store]);
  return <Provider store={store}><QueryClientProvider client={queryClient}>{children}</QueryClientProvider></Provider>;
}
