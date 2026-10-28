import { useState } from "react"
import type { FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { PackageSearch, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/page"
import { useCurrentCustomer } from "@/features/auth/use-auth"
import { ApiError } from "@/lib/api/client"
import { trackingApi } from "@/lib/api/endpoints"
import { queryKeys } from "@/lib/query"
import { TrackingResultCard } from "./TrackingResultCard"

export function TrackPage() {
  const { trackingNumber } = useParams()
  const navigate = useNavigate()
  const { status } = useCurrentCustomer()
  const current = trackingNumber?.trim() ?? ""
  const [draft, setDraft] = useState(current)

  const query = useQuery({
    queryKey: queryKeys.tracking(current),
    queryFn: () => trackingApi.track(current),
    enabled: current.length > 0,
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const value = draft.trim()
    if (value) navigate(`/track/${encodeURIComponent(value)}`)
  }

  const notFound = query.error instanceof ApiError && query.error.status === 404

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className={current ? "space-y-1" : "space-y-3 py-8 text-center sm:py-14"}>
        {!current && <PackageSearch className="mx-auto size-10 text-muted-foreground" />}
        <h1 className={current ? "text-2xl font-semibold tracking-tight" : "text-3xl font-semibold tracking-tight"}>
          Track a package
        </h1>
        <p className="text-sm text-muted-foreground">Enter a tracking number to see where your package is.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <Label htmlFor="tracking-number">Tracking number</Label>
        <div className="flex gap-2">
          <Input
            id="tracking-number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste your tracking number"
            required
            autoComplete="off"
          />
          <Button type="submit">
            <Search /> Track
          </Button>
        </div>
      </form>

      {!current && status === "authenticated" && (
        <p className="text-center text-sm text-muted-foreground">
          Looking for your shipments?{" "}
          <Link to="/orders" className="font-medium text-foreground underline underline-offset-4">
            My orders
          </Link>
        </p>
      )}

      {current && query.isPending && <Skeleton className="h-72 w-full" />}
      {current && notFound && (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="font-medium">No package found with that tracking number</p>
          <p className="mt-1 text-sm text-muted-foreground">Check for typos in "{current}" and try again.</p>
        </div>
      )}
      {current && query.isError && !notFound && <ErrorState error={query.error} onRetry={() => query.refetch()} />}
      {current && query.data && <TrackingResultCard result={query.data} />}
    </div>
  )
}
