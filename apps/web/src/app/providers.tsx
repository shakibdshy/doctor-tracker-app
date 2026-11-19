"use client";

import { Toaster } from "@doctor-tracker-app/ui/components/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

/**
 * App-root providers: TanStack Query cache, theme (class strategy), toasts.
 * Lives with the root layout — this is application wiring, not feature UI.
 * `nonce` threads the CSP nonce (src/proxy.ts) into next-themes' inline
 * theme script, the one inline script Next does not stamp itself.
 */
export default function Providers({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Portal lists are cheap to refetch; avoid serving stale data.
            staleTime: 15_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        nonce={nonce}
      >
        {children}
        <Toaster richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/** Thin typed wrapper around next-themes' provider (class strategy). */
function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
