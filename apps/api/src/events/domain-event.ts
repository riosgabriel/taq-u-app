import { Prisma } from "@prisma/client"
import { Schema } from "effect"

export interface DomainEvent {
  readonly type: string
  readonly streamId: string
  readonly payload: Prisma.InputJsonValue
}

// Date instances (in-memory PubSub) and ISO strings (Prisma JSON column round-trip)
// are both valid wire shapes for event payloads; both decode to Date.
const EventPayloadDate = Schema.Union(Schema.DateFromSelf, Schema.Date)

export const OrderCreatedPayload = Schema.Struct({
  orderId: Schema.String,
  customerId: Schema.String,
})

export type OrderCreatedPayload = Schema.Schema.Type<typeof OrderCreatedPayload>

export const DriverAssignedPayload = Schema.Struct({
  orderId: Schema.String,
  driverId: Schema.String,
  assignedAt: EventPayloadDate,
})

export type DriverAssignedPayload = Schema.Schema.Type<typeof DriverAssignedPayload>
