import { useState } from "react"
import { Link } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { EmptyState, ErrorState, PageHeader } from "@/components/page"
import { StatusBadge } from "@/components/StatusBadge"
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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { deliveryApi, driverApi } from "@/lib/api/endpoints"
import type { DeliveryRoute, DeliveryStatus, UpdatableDeliveryStatus } from "@/lib/api/types"
import { formatDateTime, humanize, shortId } from "@/lib/format"
import { errorMessage, queryKeys } from "@/lib/query"
import { AssignDriverDialog } from "./ops-dialogs"
import { UPDATABLE_DELIVERY_STATUSES } from "./delivery-statuses"

type Bucket = "planned" | "progress" | "completed" | "failed"

const buckets: { id: Bucket; label: string; statuses: DeliveryStatus[] }[] = [
  { id: "planned", label: "Planned", statuses: ["ASSIGNED"] },
  {
    id: "progress",
    label: "In progress",
    statuses: ["PICKUP_IN_PROGRESS", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
  },
  { id: "completed", label: "Completed", statuses: ["DELIVERED"] },
  { id: "failed", label: "Failed / cancelled", statuses: ["FAILED", "CANCELLED"] },
]

export function OpsDeliveriesPage() {
  const queryClient = useQueryClient()
  const deliveries = useQuery({ queryKey: queryKeys.deliveries, queryFn: deliveryApi.list })
  const drivers = useQuery({ queryKey: queryKeys.drivers, queryFn: driverApi.list })

  const [bucket, setBucket] = useState<Bucket>("planned")
  const [reassignTarget, setReassignTarget] = useState<DeliveryRoute | null>(null)
  const [statusTarget, setStatusTarget] = useState<DeliveryRoute | null>(null)
  const [newStatus, setNewStatus] = useState<UpdatableDeliveryStatus | "">("")

  const onSettled = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.deliveries })
    void queryClient.invalidateQueries({ queryKey: queryKeys.drivers })
    void queryClient.invalidateQueries({ queryKey: ["orders"] })
  }

  const reassign = useMutation({
    mutationFn: ({ delivery, driverId }: { delivery: DeliveryRoute; driverId: string }) =>
      deliveryApi.assignDriver(delivery.id, driverId),
    onSuccess: () => {
      toast.success("Driver reassigned")
      setReassignTarget(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled,
  })

  const updateStatus = useMutation({
    mutationFn: ({ delivery, status }: { delivery: DeliveryRoute; status: UpdatableDeliveryStatus }) =>
      deliveryApi.updateStatus(delivery.id, status),
    onSuccess: () => {
      toast.success("Delivery status updated")
      setStatusTarget(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
    onSettled,
  })

  const all = deliveries.data ?? []
  const countFor = (b: (typeof buckets)[number]) => all.filter((d) => b.statuses.includes(d.status)).length
  const current = buckets.find((b) => b.id === bucket) ?? buckets[0]
  const visible = all.filter((d) => current?.statuses.includes(d.status))

  return (
    <div>
      <PageHeader title="Deliveries" description="Driver runs and the packages on them." />

      <Tabs value={bucket} onValueChange={(value) => setBucket(value as Bucket)} className="mb-4">
        <TabsList className="h-auto flex-wrap">
          {buckets.map((b) => (
            <TabsTrigger key={b.id} value={b.id}>
              {b.label} ({deliveries.isSuccess ? countFor(b) : "–"})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {deliveries.isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : deliveries.isError ? (
        <ErrorState error={deliveries.error} onRetry={() => void deliveries.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState title="No deliveries here" description={`Nothing in "${current?.label}" right now.`} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((delivery) => (
            <Card key={delivery.id}>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="font-mono text-xs text-muted-foreground">{shortId(delivery.id)}</span>
                  <StatusBadge status={delivery.status} />
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewStatus("")
                      setStatusTarget(delivery)
                    }}
                  >
                    Update status
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReassignTarget(delivery)}>
                    Reassign driver
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">{delivery.driver.name}</span>
                  <span className="text-muted-foreground"> · {humanize(delivery.driver.vehicleType)}</span>
                </p>
                <p>
                  {delivery.route ? (
                    `${delivery.route.pickup.name} → ${delivery.route.dropoff.name}`
                  ) : (
                    <span className="text-muted-foreground">No route</span>
                  )}
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Pickup est.</dt>
                  <dd>{formatDateTime(delivery.estimatedPickupTime)}</dd>
                  <dt className="text-muted-foreground">Pickup actual</dt>
                  <dd>{formatDateTime(delivery.actualPickupTime)}</dd>
                  <dt className="text-muted-foreground">Delivery est.</dt>
                  <dd>{formatDateTime(delivery.estimatedDeliveryTime)}</dd>
                  <dt className="text-muted-foreground">Delivery actual</dt>
                  <dd>{formatDateTime(delivery.actualDeliveryTime)}</dd>
                </dl>
                <ul className="divide-y rounded-md border">
                  {delivery.packages.length === 0 && <li className="p-2 text-muted-foreground">No packages</li>}
                  {delivery.packages.map((pkg) => (
                    <li key={pkg.id} className="space-y-0.5 p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link to={`/track/${pkg.trackingNumber}`} className="font-mono text-xs underline">
                          {pkg.trackingNumber}
                        </Link>
                        <StatusBadge status={pkg.status} />
                      </div>
                      <p>{pkg.description}</p>
                      <p className="text-xs text-muted-foreground">{pkg.address}</p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {reassignTarget && (
        <AssignDriverDialog
          open
          onOpenChange={(open) => !open && setReassignTarget(null)}
          title={`Reassign delivery ${shortId(reassignTarget.id)}`}
          drivers={drivers.data ?? []}
          pending={reassign.isPending}
          onSubmit={(driverId) => reassign.mutate({ delivery: reassignTarget, driverId })}
        />
      )}

      {statusTarget && (
        <Dialog open onOpenChange={(open) => !open && setStatusTarget(null)}>
          <DialogContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                if (newStatus) updateStatus.mutate({ delivery: statusTarget, status: newStatus })
              }}
            >
              <DialogHeader>
                <DialogTitle>Update delivery {shortId(statusTarget.id)}</DialogTitle>
                <DialogDescription>
                  Current status: {humanize(statusTarget.status)}. The server rejects invalid transitions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delivery-status">New status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as UpdatableDeliveryStatus)}>
                  <SelectTrigger id="delivery-status" className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {UPDATABLE_DELIVERY_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {humanize(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setStatusTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!newStatus || updateStatus.isPending}>
                  {updateStatus.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
