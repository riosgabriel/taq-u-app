import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { authApi } from "@/lib/api/endpoints"
import type { AuthResponse } from "@/lib/api/types"
import { queryKeys } from "@/lib/query"
import { session, useSession } from "@/lib/session"

export function useCurrentCustomer() {
  const { status } = useSession()
  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: status === "authenticated",
    staleTime: Infinity,
  })
  return { ...query, customer: status === "authenticated" ? query.data : undefined, status }
}

function useStartSession() {
  const queryClient = useQueryClient()
  return ({ token, customer }: AuthResponse) => {
    queryClient.clear()
    queryClient.setQueryData(queryKeys.me, customer)
    session.signIn(token)
  }
}

export function useLogin() {
  const startSession = useStartSession()
  return useMutation({ mutationFn: authApi.login, onSuccess: startSession })
}

export function useRegister() {
  const startSession = useStartSession()
  return useMutation({ mutationFn: authApi.register, onSuccess: startSession })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return () => {
    session.signOut()
    queryClient.clear()
  }
}
