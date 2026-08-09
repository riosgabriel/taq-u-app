import { Prisma } from "@prisma/client"
import { Schema } from "effect"

export interface DomainEvent {
  readonly type: string
  readonly streamId: string
  readonly payload: Prisma.InputJsonValue
}

export const OrderCreatedPayload = Schema.Struct({
  orderId: Schema.String,
  customerId: Schema.String,
})

export type OrderCreatedPayload = Schema.Schema.Type<typeof OrderCreatedPayload>
