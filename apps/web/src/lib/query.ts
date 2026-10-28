import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "@/lib/api/client"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
})

export const queryKeys = {
  me: ["me"] as const,
  addresses: ["addresses"] as const,
  myOrders: ["orders", "mine"] as const,
  allOrders: ["orders", "all"] as const,
  order: (id: string) => ["orders", "detail", id] as const,
  tracking: (trackingNumber: string) => ["tracking", trackingNumber] as const,
  estimate: (input: unknown, serviceLevel: string) => ["estimate", input, serviceLevel] as const,
  drivers: ["drivers"] as const,
  deliveries: ["deliveries"] as const,
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Something went wrong"
}
