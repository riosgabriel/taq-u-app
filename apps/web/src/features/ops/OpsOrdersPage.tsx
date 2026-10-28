import { Fragment, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, PageHeader } from "@/components/page"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { driverApi, orderApi } from "@/lib/api/endpoints"
import type { Order, OrderStatus } from "@/lib/api/types"
import { formatDate, humanize, shortId } from "@/lib/format"
import { errorMessage, queryKeys } from "@/lib/query"
import { AssignDriverDialog, ConfirmDialog } from "./ops-dialogs"

const STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

type Action = "confirm" | "assign" | "pickup" | "deliver" | "cancel"

const allowedActions: Record<OrderStatus, Action[]> = {
  PENDING: ["confirm", "assign", "cancel"],
  CONFIRMED: ["assign", "cancel"],
  ASSIGNED: ["pickup", "cancel"],
  IN_PROGRESS: ["deliver", "cancel"],
  COMPLETED: [],
  CANCELLED: [],
}

const actionLabels: Record<Action, string> = {
  confirm: "Confirm",
  assign: "Assign driver",
  pickup: "Mark picked up",
  deliver: "Mark delivered",
  cancel: "Cancel order",
}

export function OpsOrdersPage() {
  const queryClient = useQueryClient()
  const orders = useQuery({ queryKey: queryKeys.allOrders, queryFn: orderApi.listAll })
  const drivers = useQuery({ queryKey: queryKeys.drivers, queryFn: driverApi.list })

  const [status, setStatus] = useState("ALL")
  const [search, setSearch] = useState("")
  const [assignTarget, setAssignTarget] = useState<Order | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null)

  const driverList = drivers.data ?? []
  const driverName = (id?: string) => (id ? (driverList.find((d) => d.id === id)?.name ?? shortId(id)) : null)

  const onSettled = () => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.drivers })
  }

  const simple = useMutation({
    mutationFn: ({ order, action }: { order: Order; action: "confirm" | "pickup" | "deliver" }) =>
      orderApi[action](order.id),
    onSuccess: (_data, { action }) => toast.success(`Order ${action === "confirm" ? "confirmed" : "updated"}`),
    onError: (error) => toast.error(errorMessage(error)),
    onSettled,
  })

  const assign = useMutation({
    mutationFn: ({ order, driverId }: { order: Order; driverId: string }) => orderApi.assignDriver(order.id, driverId),
    onSuccess: () => {
      toast.success("Driver assigned")
      setAssignTarget(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled,
  })

  const cancel = useMutation({
    mutationFn: (order: Order) => orderApi.cancel(order.id),
    onSuccess: () => {
      toast.success("Order cancelled")
      setCancelTarget(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled,
  })

  const run = (order: Order, action: Action) => {
    if (action === "assign") setAssignTarget(order)
    else if (action === "cancel") setCancelTarget(order)
    else simple.mutate({ order, action })
  }

  const needle = search.trim().toLowerCase()
  const filtered = (orders.data ?? []).filter((order) => {
    if (status !== "ALL" && order.status !== status) return false
    if (!needle) return true
    return (
      order.pickupAddress.toLowerCase().includes(needle) ||
      order.deliveryAddress.toLowerCase().includes(needle) ||
      order.packages.some((p) => p.trackingNumber.toLowerCase().includes(needle))
    )
  })

  return (
    <div>
      <PageHeader title="Dispatch" description="All orders and the actions available for their current status." />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          aria-label="Search orders"
          placeholder="Search address or tracking number"
          className="w-full sm:w-72"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Filter by status" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {humanize(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {orders.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={orders.data.length ? "Try a different filter or search." : "Orders will show up here."}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Pickup date</TableHead>
                <TableHead className="text-right">Pkgs</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => {
                const actions = allowedActions[order.status]
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{shortId(order.id)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>{humanize(order.priority)}</TableCell>
                    <TableCell className="min-w-64 whitespace-normal">
                      <span className="block">{order.pickupAddress}</span>
                      <span className="block text-muted-foreground">→ {order.deliveryAddress}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(order.pickupDate)}</TableCell>
                    <TableCell className="text-right">{order.packages.length}</TableCell>
                    <TableCell>
                      {driverName(order.driverId) ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {actions.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for order ${shortId(order.id)}`}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {actions.map((action) => (
                              <Fragment key={action}>
                                {action === "cancel" && <DropdownMenuSeparator />}
                                <DropdownMenuItem
                                  variant={action === "cancel" ? "destructive" : "default"}
                                  disabled={simple.isPending}
                                  onSelect={() => run(order, action)}
                                >
                                  {actionLabels[action]}
                                </DropdownMenuItem>
                              </Fragment>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {assignTarget && (
        <AssignDriverDialog
          open
          onOpenChange={(open) => !open && setAssignTarget(null)}
          title={`Assign driver to order ${shortId(assignTarget.id)}`}
          drivers={driverList}
          pending={assign.isPending}
          onSubmit={(driverId) => assign.mutate({ order: assignTarget, driverId })}
        />
      )}
      {cancelTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setCancelTarget(null)}
          title={`Cancel order ${shortId(cancelTarget.id)}?`}
          description="This can't be undone."
          confirmLabel="Cancel order"
          pending={cancel.isPending}
          onConfirm={() => cancel.mutate(cancelTarget)}
        />
      )}
    </div>
  )
}
