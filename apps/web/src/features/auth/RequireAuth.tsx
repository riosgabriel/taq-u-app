import { Navigate, Outlet, useLocation, useSearchParams } from "react-router"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentCustomer } from "./use-auth"

export function RequireAuth() {
  const location = useLocation()
  const { customer, status, isError } = useCurrentCustomer()

  if (status !== "authenticated" || isError) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    const reason = status === "expired" ? "&expired=1" : ""
    return <Navigate to={`/login?redirect=${redirect}${reason}`} replace />
  }

  if (!customer) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return <Outlet />
}

export function RedirectIfAuthenticated() {
  const { status } = useCurrentCustomer()
  const [searchParams] = useSearchParams()
  return status === "authenticated" ? <Navigate to={safeRedirect(searchParams.get("redirect"))} replace /> : <Outlet />
}

function safeRedirect(target: string | null): string {
  return target?.startsWith("/") && !target.startsWith("//") ? target : "/orders"
}
