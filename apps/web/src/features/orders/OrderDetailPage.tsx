import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Check, Copy, Pencil, Search, XCircle } from "lucide-react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { ErrorState, NotYetAvailable, PageHeader } from "@/components/page"
import { StatusBadge } from "@/components/StatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { orderApi } from "@/lib/api/endpoints"
import type { Order, OrderPriority, OrderStatus, OrderUpdateInput, Package } from "@/lib/api/types"
import { formatDate, formatDateTime, humanize, shortId } from "@/lib/format"
import { errorMessage, queryKeys } from "@/lib/query"
import { cn } from "@/lib/utils"

const PRIORITIES: OrderPriority[] = ["LOW", "STANDARD", "HIGH", "URGENT"]
const LIFECYCLE: OrderStatus[] = ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"]
const EDITABLE: OrderStatus[] = ["PENDING", "CONFIRMED"]
const CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED", "ASSIGNED"]

export function OrderDetailPage() {
  const { orderId = "" } = useParams()
  const queryClient = useQueryClient()
  const {
    data: order,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => orderApi.get(orderId),
    initialData: () => queryClient.getQueryData<Order[]>(queryKeys.myOrders)?.find((o) => o.id === orderId),
  })

  const back = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link to="/orders">
        <ArrowLeft /> My orders
      </Link>
    </Button>
  )

  if (isPending) {
    return (
      <div>
        {back}
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div>
          {back}
          <PageHeader title="Order not found" description="It may have been removed, or the link is wrong." />
        </div>
      )
    }
    return (
      <div>
        {back}
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  return (
    <div>
      {back}
      <OrderView order={order} />
    </div>
  )
}

function OrderView({ order }: { order: Order }) {
  const canEdit = EDITABLE.includes(order.status)
  const canCancel = CANCELLABLE.includes(order.status)
  const [editing, setEditing] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Order #${shortId(order.id)}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <span>{humanize(order.priority)} priority</span>
          </span>
        }
        actions={
          <>
            {canEdit && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {canCancel && (
              <Button variant="destructive" onClick={() => setCancelling(true)}>
                <XCircle /> Cancel order
              </Button>
            )}
          </>
        }
      />

      <Timeline status={order.status} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Shipment details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Field label="Pickup address" value={order.pickupAddress} />
              <Field label="Delivery address" value={order.deliveryAddress} />
              <Field label="Pickup date" value={formatDateTime(order.pickupDate)} />
              <Field label="Delivery date" value={order.deliveryDate ? formatDateTime(order.deliveryDate) : "—"} />
              <Field label="Special instructions" value={order.specialInstructions || "—"} className="sm:col-span-2" />
              <Field
                label="Driver"
                value={order.driverId ? `Assigned (${shortId(order.driverId)})` : "Not assigned yet"}
              />
              <Field label="Assigned at" value={order.assignedAt ? formatDateTime(order.assignedAt) : "—"} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <NotYetAvailable>
              Cost and payment details for an order aren't available yet. Use the estimate on the shipping page for a
              quote.
            </NotYetAvailable>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Packages <span className="text-muted-foreground">({order.packages.length})</span>
        </h2>
        <ul className="space-y-3">
          {order.packages.map((pkg) => (
            <li key={pkg.id}>
              <PackageCard pkg={pkg} />
            </li>
          ))}
        </ul>
      </section>

      {canEdit && <EditDialog key={String(editing)} order={order} open={editing} onOpenChange={setEditing} />}
      {canCancel && <CancelDialog order={order} open={cancelling} onOpenChange={setCancelling} />}
    </div>
  )
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words whitespace-pre-wrap">{value}</dd>
    </div>
  )
}

function Timeline({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        <XCircle className="size-4" /> This order was cancelled.
      </div>
    )
  }
  const current = LIFECYCLE.indexOf(status)
  return (
    <ol className="flex items-start overflow-x-auto rounded-lg border bg-card p-4">
      {LIFECYCLE.map((step, i) => {
        const done = i < current || status === "COMPLETED"
        const active = i === current && status !== "COMPLETED"
        return (
          <li key={step} className="flex min-w-24 flex-1 flex-col items-center gap-1.5 text-center">
            <div className="flex w-full items-center">
              <div
                className={cn("h-0.5 flex-1", i === 0 ? "bg-transparent" : i <= current ? "bg-primary" : "bg-border")}
              />
              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary ring-4 ring-primary/20",
                  !done && !active && "border-border text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </div>
              <div
                className={cn(
                  "h-0.5 flex-1",
                  i === LIFECYCLE.length - 1 ? "bg-transparent" : i < current ? "bg-primary" : "bg-border"
                )}
              />
            </div>
            <span className={cn("text-xs", active ? "font-semibold" : "text-muted-foreground")}>{humanize(step)}</span>
          </li>
        )
      })}
    </ol>
  )
}

function PackageCard({ pkg }: { pkg: Package }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(pkg.trackingNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Couldn't copy to the clipboard")
    }
  }

  return (
    <Card className="gap-3 py-4">
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{pkg.description}</p>
          <StatusBadge status={pkg.status} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{pkg.weightKg} kg</span>
          <span>·</span>
          <span>{pkg.dimensions}</span>
          {pkg.fragile && <Badge variant="outline">Fragile</Badge>}
          {pkg.perishable && <Badge variant="outline">Perishable</Badge>}
          {pkg.insured && <Badge variant="outline">Insured</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 text-xs">{pkg.trackingNumber}</code>
          <Button variant="ghost" size="sm" onClick={() => void copy()} aria-label="Copy tracking number">
            {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/track/${encodeURIComponent(pkg.trackingNumber)}`}>
              <Search /> Track
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function toLocalInput(iso: string | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function useOrderMutation<T>(order: Order, fn: () => Promise<Order>, successMessage: string, onDone: () => void) {
  const queryClient = useQueryClient()
  return useMutation<Order, Error, T>({
    mutationFn: fn,
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.order(order.id), updated)
      void queryClient.invalidateQueries({ queryKey: ["orders"] })
      toast.success(successMessage)
      onDone()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
}

function EditDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [pickupAddress, setPickupAddress] = useState(order.pickupAddress)
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress)
  const [pickupDate, setPickupDate] = useState(toLocalInput(order.pickupDate))
  const [deliveryDate, setDeliveryDate] = useState(toLocalInput(order.deliveryDate))
  const [priority, setPriority] = useState<OrderPriority>(order.priority)
  const [instructions, setInstructions] = useState(order.specialInstructions ?? "")

  const changes: OrderUpdateInput = {}
  if (pickupAddress !== order.pickupAddress) changes.pickupAddress = pickupAddress
  if (deliveryAddress !== order.deliveryAddress) changes.deliveryAddress = deliveryAddress
  if (pickupDate !== toLocalInput(order.pickupDate)) changes.pickupDate = new Date(pickupDate).toISOString()
  if (deliveryDate && deliveryDate !== toLocalInput(order.deliveryDate)) {
    changes.deliveryDate = new Date(deliveryDate).toISOString()
  }
  if (priority !== order.priority) changes.priority = priority
  if (instructions !== (order.specialInstructions ?? "")) changes.specialInstructions = instructions
  const hasChanges = Object.keys(changes).length > 0

  const mutation = useOrderMutation<OrderUpdateInput>(
    order,
    () => orderApi.update(order.id, changes),
    "Order updated",
    () => onOpenChange(false)
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    if (hasChanges) mutation.mutate(changes)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Edit order</DialogTitle>
            <DialogDescription>Only the fields you change are sent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-pickup-address">Pickup address</Label>
            <Input
              id="edit-pickup-address"
              required
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-delivery-address">Delivery address</Label>
            <Input
              id="edit-delivery-address"
              required
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-pickup-date">Pickup date</Label>
              <Input
                id="edit-pickup-date"
                type="datetime-local"
                required
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-delivery-date">Delivery date</Label>
              <Input
                id="edit-delivery-date"
                type="datetime-local"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as OrderPriority)}>
              <SelectTrigger id="edit-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {humanize(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-instructions">Special instructions</Label>
            <Textarea id="edit-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={!hasChanges || mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CancelDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const mutation = useOrderMutation<void>(
    order,
    () => orderApi.cancel(order.id),
    "Order cancelled",
    () => onOpenChange(false)
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this order?</DialogTitle>
          <DialogDescription>
            Order #{shortId(order.id)} scheduled for pickup on {formatDate(order.pickupDate)} will be cancelled. This
            can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep order
          </Button>
          <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Cancelling…" : "Cancel order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
