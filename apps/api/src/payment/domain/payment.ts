import { Payment as PrismaPayment, PaymentMethod, PaymentStatus } from "@prisma/client"
import { Schema } from "effect"

export class Payment extends Schema.Class<Payment>("payment/Payment")({
  id: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "id",
  }),
  method: Schema.String.annotations({
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
  status: Schema.String.annotations({
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
  orderId: Schema.NullishOr(Schema.String).annotations({
    identifier: "orderId",
  }),
}) {
  static fromPrisma(payment: PrismaPayment): Payment {
    return {
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionId: payment.transactionId,
      timestamp: payment.timestamp,
      orderId: payment.orderId,
    }
  }
}

export const PAYMENT_METHODS = [
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.CASH,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.MOBILE,
] as const

export const PAYMENT_STATUSES = [
  PaymentStatus.PENDING,
  PaymentStatus.PAID,
  PaymentStatus.REFUNDED,
  PaymentStatus.FAILED,
] as const

export default Payment
