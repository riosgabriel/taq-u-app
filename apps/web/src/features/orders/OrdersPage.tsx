import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Package as PackageIcon, Plus } from "lucide-react"
import { Link, useSearchParams } from "react-router"
import { EmptyState, ErrorState, PageHeader } from "@/components/page"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, humanize, shortId } from "@/lib/format"
import { orderApi } from "@/lib/api/endpoints"
import type { Order, OrderStatus } from "@/lib/api/types"
import { queryKeys } from "@/lib/query"

const ACTIVE: OrderStatus[] = ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"]

const FILTERS = {
  all: { label: "All", match: () => true },
  active: { label: "Active", match: (o: Order) => ACTIVE.includes(o.status) },
  completed: { label: "Completed", match: (o: Order) => o.status === "COMPLETED" },
  cancelled: { label: "Cancelled", match: (o: Order) => o.status === "CANCELLED" },
}
type FilterKey = keyof typeof FILTERS

function isFilterKey(value: string | null): value is FilterKey {
  return value !== null && value in FILTERS
}

export function OrdersPage() {
  const [params, setParams] = useSearchParams()
  const statusParam = params.get("status")
  const filter: FilterKey = isFilterKey(statusParam) ? statusParam : "all"
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.myOrders,
    queryFn: orderApi.listMine,
  })

  const sorted = data ? [...data].sort((a, b) => Date.parse(b.pickupDate) - Date.parse(a.pickupDate)) : []
  const visible = sorted.filter(FILTERS[filter].match)

  function selectFilter(value: string) {
    setParams(value === "all" ? {} : { status: value }, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="My orders"
        description="Everything you've shipped with us."
        actions={
          <Button asChild>
            <Link to="/ship">
              <Plus /> Ship a package
            </Link>
          </Button>
        }
      />

      {isPending && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}
      {isError && <ErrorState error={error} onRetry={() => void refetch()} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No orders yet"
          description="Ship your first package and it will show up here."
          action={
            <Button asChild>
              <Link to="/ship">Ship a package</Link>
            </Button>
          }
        />
      )}

      {data && data.length > 0 && (
        <div className="space-y-4">
          <Tabs value={filter} onValueChange={selectFilter}>
            <TabsList className="max-w-full overflow-x-auto">
              {(Object.keys(FILTERS) as FilterKey[]).map((key) => (
                <TabsTrigger key={key} value={key}>
                  {FILTERS[key].label} ({data.filter(FILTERS[key].match).length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {visible.length === 0 ? (
            <EmptyState title={`No ${FILTERS[filter].label.toLowerCase()} orders`} />
          ) : (
            <ul className="space-y-3">
              {visible.map((order) => (
                <li key={order.id}>
                  <OrderRow order={order} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  const first = order.packages[0]
  const extra = order.packages.length - 1
  return (
    <Link
      to={`/orders/${order.id}`}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-medium">#{shortId(order.id)}</span>
        <StatusBadge status={order.status} />
        <span className="text-xs text-muted-foreground">{humanize(order.priority)} priority</span>
        <span className="ml-auto text-xs text-muted-foreground">Pickup {formatDate(order.pickupDate)}</span>
      </div>
      <div className="mt-3 flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
        <span className="min-w-0 truncate">{order.pickupAddress}</span>
        <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
        <span className="min-w-0 truncate">{order.deliveryAddress}</span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <PackageIcon className="size-3.5" />
        {order.packages.length} {order.packages.length === 1 ? "package" : "packages"}
        {first && (
          <>
            <span>·</span>
            <span className="font-mono">{first.trackingNumber}</span>
            {extra > 0 && <span>+{extra} more</span>}
          </>
        )}
      </div>
    </Link>
  )
}
