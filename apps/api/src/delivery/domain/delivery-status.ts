import { DeliveryStatus } from "@prisma/client"
import { Brand, Data, Effect } from "effect"

export type ValidatedDeliveryStatus = DeliveryStatus & Brand.Brand<"ValidatedDeliveryStatus">
export const ValidatedDeliveryStatus = Brand.nominal<ValidatedDeliveryStatus>()

const allowedTransitions: Record<DeliveryStatus, ReadonlySet<DeliveryStatus>> = {
  [DeliveryStatus.ASSIGNED]: new Set([DeliveryStatus.PICKUP_IN_PROGRESS, DeliveryStatus.CANCELLED]),
  [DeliveryStatus.PICKUP_IN_PROGRESS]: new Set([DeliveryStatus.PICKED_UP, DeliveryStatus.FAILED]),
  [DeliveryStatus.PICKED_UP]: new Set([DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED]),
  [DeliveryStatus.IN_TRANSIT]: new Set([DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.FAILED]),
  [DeliveryStatus.OUT_FOR_DELIVERY]: new Set([DeliveryStatus.DELIVERED, DeliveryStatus.FAILED]),
  [DeliveryStatus.DELIVERED]: new Set([]),
  [DeliveryStatus.FAILED]: new Set([]),
  [DeliveryStatus.CANCELLED]: new Set([]),
}

export class InvalidDeliveryTransitionError extends Data.TaggedError("delivery/InvalidDeliveryTransitionError")<{
  readonly currentStatus: string
  readonly targetStatus: string
  readonly message: string
}> {}

export const canTransitionDelivery = (from: DeliveryStatus, to: DeliveryStatus): boolean =>
  allowedTransitions[from]?.has(to) ?? false

export const transitionDelivery = (
  from: DeliveryStatus,
  to: DeliveryStatus
): Effect.Effect<ValidatedDeliveryStatus, InvalidDeliveryTransitionError> =>
  canTransitionDelivery(from, to)
    ? Effect.succeed(ValidatedDeliveryStatus(to))
    : Effect.fail(
        new InvalidDeliveryTransitionError({
          currentStatus: from,
          targetStatus: to,
          message: `Cannot transition delivery from ${from} to ${to}. Valid transitions: ${[
            ...validDeliveryTargets(from),
          ].join(", ")}`,
        })
      )

export const validDeliveryTargets = (status: DeliveryStatus): ReadonlySet<DeliveryStatus> =>
  allowedTransitions[status] ?? new Set()

const reassignableDeliveryStatuses: ReadonlySet<DeliveryStatus> = new Set([
  DeliveryStatus.ASSIGNED,
  DeliveryStatus.PICKUP_IN_PROGRESS,
])

export const isDeliveryReassignable = (status: DeliveryStatus): boolean => reassignableDeliveryStatuses.has(status)
