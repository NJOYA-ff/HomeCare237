/**
 * QueryClientProvider.tsx
 *
 * React Query provider for server state management
 * Handles caching, synchronization, and background updates
 */

import React from "react";
import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from "@tanstack/react-query";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data becomes stale after 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache data for 10 minutes (gcTime replaced cacheTime in newer versions)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations 2 times
      retry: 2,
    },
  },
});

export const QueryClientProvider: React.FC<{ children: any }> = ({ children }) => {
  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
};

export default queryClient;