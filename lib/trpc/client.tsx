"use client";

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState, type ReactNode } from "react";
import superjson from "superjson";
import type { AppRouter } from "@/server/trpc/router";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();

function isUnauthorized(error: unknown) {
  return error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED";
}

function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: async (error) => {
        // A stale session cookie got past the proxy: clear it and go to login.
        if (isUnauthorized(error)) {
          const { signOut } = await import("@/lib/auth-client");
          await signOut();
          // Full reload on purpose: drops all cached data from the dead session.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        }
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => !isUnauthorized(error) && count < 2,
      },
    },
  });
}

export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
