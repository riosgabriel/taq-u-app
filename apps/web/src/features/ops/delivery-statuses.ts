import type { UpdatableDeliveryStatus } from "@/lib/api/types"

export const UPDATABLE_DELIVERY_STATUSES: UpdatableDeliveryStatus[] = [
  "PICKUP_IN_PROGRESS",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]
