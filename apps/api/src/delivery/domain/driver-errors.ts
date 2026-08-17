import { Data } from "effect"

export class DriverNotFoundError extends Data.TaggedError("delivery/DriverNotFoundError")<{
  readonly id: string
  readonly message: string
}> {}

export class DriverNotAvailableError extends Data.TaggedError("delivery/DriverNotAvailableError")<{
  readonly id: string
  readonly message: string
}> {}

export class OrderNotAssignableError extends Data.TaggedError("delivery/OrderNotAssignableError")<{
  readonly orderId: string
  readonly currentStatus: string
  readonly message: string
}> {}
