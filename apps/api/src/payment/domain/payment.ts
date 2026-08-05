import { Payment as PrismaPayment } from "@prisma/client"
import { Schema } from "effect"
import { OrderId, PaymentId } from "@/ids"

export const PAYMENT_METHODS = ["CREDIT_CARD", "CASH", "BANK_TRANSFER", "MOBILE"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = ["PENDING", "PAID", "REFUNDED", "FAILED"] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export class Payment extends Schema.Class<Payment>("payment/Payment")({
  id: PaymentId.annotations({
    required: true,
    identifier: "id",
  }),
  method: Schema.Literal(...PAYMENT_METHODS).annotations({
    required: true,
    identifier: "method",
  }),
  amount: Schema.Number.annotations({
    required: true,
    identifier: "amount",
  }),
  currency: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "currency",
  }),
  status: Schema.Literal(...PAYMENT_STATUSES).annotations({
    required: true,
    identifier: "status",
  }),
  transactionId: Schema.NullishOr(Schema.String).annotations({
    identifier: "transactionId",
  }),
  timestamp: Schema.Date.annotations({
    required: true,
    identifier: "timestamp",
  }),
  orderId: Schema.NullishOr(OrderId).annotations({
    identifier: "orderId",
  }),
}) {
  static fromPrisma(payment: PrismaPayment): Payment {
    return {
      id: Schema.decodeSync(PaymentId)(payment.id),
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionId: payment.transactionId,
      timestamp: payment.timestamp,
      orderId: payment.orderId ? Schema.decodeSync(OrderId)(payment.orderId) : null,
    }
  }
}

export default Payment
