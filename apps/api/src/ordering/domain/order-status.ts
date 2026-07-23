import { OrderStatus } from "@prisma/client"
import { Brand, Data, Effect } from "effect"

export type ValidatedOrderStatus = OrderStatus & Brand.Brand<"ValidatedOrderStatus">
export const ValidatedOrderStatus = Brand.nominal<ValidatedOrderStatus>()

const allowedTransitions: Record<OrderStatus, ReadonlySet<OrderStatus>> = {
  [OrderStatus.PENDING]: new Set([OrderStatus.CONFIRMED, OrderStatus.ASSIGNED, OrderStatus.CANCELLED]),
  [OrderStatus.CONFIRMED]: new Set([OrderStatus.ASSIGNED, OrderStatus.CANCELLED]),
  [OrderStatus.ASSIGNED]: new Set([OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED]),
  [OrderStatus.IN_PROGRESS]: new Set([OrderStatus.COMPLETED, OrderStatus.CANCELLED]),
  [OrderStatus.COMPLETED]: new Set([]),
  [OrderStatus.CANCELLED]: new Set([]),
}

export class InvalidTransitionError extends Data.TaggedError("order/InvalidTransitionError")<{
  readonly currentStatus: string
  readonly targetStatus: string
  readonly message: string
}> {}

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => allowedTransitions[from]?.has(to) ?? false

export const transition = (
  from: OrderStatus,
  to: OrderStatus
): Effect.Effect<ValidatedOrderStatus, InvalidTransitionError> =>
  canTransition(from, to)
    ? Effect.succeed(ValidatedOrderStatus(to))
    : Effect.fail(
        new InvalidTransitionError({
          currentStatus: from,
          targetStatus: to,
          message: `Cannot transition from ${from} to ${to}. Valid transitions: ${[...validTargets(from)].join(", ")}`,
        })
      )

export const validTargets = (status: OrderStatus): ReadonlySet<OrderStatus> => allowedTransitions[status] ?? new Set()
