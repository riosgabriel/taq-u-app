import { PersistenceError } from "@/persistence-errors"
import { Context, Data, Effect, Layer } from "effect"
import { type PaymentStatus, Payment } from "payment/domain/payment"
import { PaymentCreateInput } from "payment/dto/payment-dto"
import { PaymentRepository } from "payment/repository/payment-repository"

export class PaymentNotFoundError extends Data.TaggedError("payment/PaymentNotFoundError")<{
  readonly id: string
  readonly message: string
}> {}

export class PaymentService extends Context.Tag("payment/PaymentService")<
  PaymentService,
  {
    readonly create: (input: PaymentCreateInput) => Effect.Effect<Payment, PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Payment>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Payment, PaymentNotFoundError | PersistenceError>
    readonly updateStatus: (
      id: string,
      status: PaymentStatus
    ) => Effect.Effect<Payment, PaymentNotFoundError | PersistenceError>
    readonly listByOrderId: (orderId: string) => Effect.Effect<Array<Payment>, PersistenceError>
  }
>() {}

export const PaymentServiceLive = Layer.effect(
  PaymentService,
  Effect.gen(function* () {
    const repository = yield* PaymentRepository

    return PaymentService.of({
      create: (input: PaymentCreateInput) => {
        return Effect.gen(function* () {
          return yield* repository.create(input).pipe(Effect.map((payment) => Payment.fromPrisma(payment)))
        })
      },

      listAll: () => {
        return Effect.gen(function* () {
          return yield* repository
            .listAll()
            .pipe(Effect.map((payments) => payments.map((payment) => Payment.fromPrisma(payment))))
        })
      },

      getById: (id: string) => {
        return repository.getById(id).pipe(
          Effect.map((payment) => Payment.fromPrisma(payment)),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new PaymentNotFoundError({ id, message: error.message }))
          )
        )
      },

      updateStatus: (id: string, status: PaymentStatus) => {
        return repository.updateStatus(id, status).pipe(
          Effect.map((payment) => Payment.fromPrisma(payment)),
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new PaymentNotFoundError({ id, message: error.message }))
          )
        )
      },

      listByOrderId: (orderId: string) => {
        return repository
          .listByOrderId(orderId)
          .pipe(Effect.map((payments) => payments.map((payment) => Payment.fromPrisma(payment))))
      },
    })
  })
)
