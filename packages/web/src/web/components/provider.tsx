import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => {
        const code = (error as { code?: string }).code;
        return (
          count < 2 &&
          !["UNAUTHORIZED", "FORBIDDEN", "BAD_REQUEST", "NOT_FOUND"].includes(code || "")
        );
      },
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 3000),
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});

interface ProviderProps {
  children: React.ReactNode;
}

// App-level providers — add theme/context providers here, wrapping children.
// QueryClientProvider must stay (all API calls run through TanStack Query).
export function Provider({ children }: ProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
