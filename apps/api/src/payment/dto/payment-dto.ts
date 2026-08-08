import { Schema } from "effect"
import { OrderId, PaymentId } from "@/ids"
import { PAYMENT_METHODS, PAYMENT_STATUSES, Payment } from "payment/domain/payment"

export class PaymentCreateInput extends Schema.Class<PaymentCreateInput>("payment/PaymentCreateInput")({
  method: Schema.Literal(...PAYMENT_METHODS).annotations({
    required: true,
    identifier: "method",
  }),
  amount: Schema.Number.pipe(Schema.between(0.01, 1_000_000)).annotations({
    required: true,
    identifier: "amount",
  }),
  currency: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "currency",
  }),
  status: Schema.optional(Schema.Literal(...PAYMENT_STATUSES)),
  transactionId: Schema.optional(Schema.NonEmptyString),
  orderId: Schema.optional(OrderId),
}) {}

export class PaymentUpdateStatusInput extends Schema.Class<PaymentUpdateStatusInput>(
  "payment/PaymentUpdateStatusInput"
)({
  status: Schema.Literal(...PAYMENT_STATUSES).annotations({
    required: true,
    identifier: "status",
  }),
}) {}

export class PaymentResponse extends Schema.Class<PaymentResponse>("payment/PaymentResponse")({
  id: PaymentId,
  method: Schema.String,
  amount: Schema.Number,
  currency: Schema.NonEmptyString,
  status: Schema.String,
  transactionId: Schema.String,
  timestamp: Schema.Date,
  orderId: Schema.NullishOr(OrderId),
}) {
  static fromPayment(payment: Payment): PaymentResponse {
    return {
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionId: payment.transactionId ?? "",
      timestamp: payment.timestamp,
      orderId: payment.orderId,
    }
  }
}
