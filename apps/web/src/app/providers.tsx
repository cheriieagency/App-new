'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Suspense, useState } from 'react';
import { Toaster } from 'sonner';
import { LanguageProvider } from '@/lib/i18n';
import { GlobalLanguageMenu } from '@/components/GlobalLanguageMenu';
import { MobileBottomNav, MobileBottomNavSpacer } from '@/components/MobileBottomNav';

// Create a client that persists across re-renders
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep admin tab switches instant — avoid refetch on remount/focus.
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  // Initialize query client once
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <Suspense fallback={children}>
          <MobileBottomNavSpacer>{children}</MobileBottomNavSpacer>
          <MobileBottomNav />
        </Suspense>
        <GlobalLanguageMenu />
        <Toaster position="bottom-right" />
      </LanguageProvider>
    </QueryClientProvider>
  );
}
