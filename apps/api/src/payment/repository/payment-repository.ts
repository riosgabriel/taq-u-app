import { PersistenceError, RecordNotFoundError } from "@/persistence-errors"
import { Payment, PaymentMethod as PrismaPaymentMethod, PaymentStatus as PrismaPaymentStatus } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { PaymentCreateInput } from "payment/dto/payment-dto"
import { type PaymentMethod, type PaymentStatus } from "payment/domain/payment"
import { PrismaService } from "prisma-service"

const paymentNotFound = (id: string) =>
  new RecordNotFoundError({ model: "Payment", id, message: `Payment with id ${id} not found` })

const toPrismaMethod: Record<PaymentMethod, PrismaPaymentMethod> = {
  CREDIT_CARD: "CREDIT_CARD",
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  MOBILE: "MOBILE",
}

const toPrismaStatus: Record<PaymentStatus, PrismaPaymentStatus> = {
  PENDING: "PENDING",
  PAID: "PAID",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
}

export class PaymentRepository extends Context.Tag("payment/PaymentRepository")<
  PaymentRepository,
  {
    readonly create: (input: PaymentCreateInput) => Effect.Effect<Payment, PersistenceError>
    readonly listAll: () => Effect.Effect<Array<Payment>, PersistenceError>
    readonly getById: (id: string) => Effect.Effect<Payment, PersistenceError>
    readonly updateStatus: (id: string, status: PaymentStatus) => Effect.Effect<Payment, PersistenceError>
    readonly listByOrderId: (orderId: string) => Effect.Effect<Array<Payment>, PersistenceError>
  }
>() {}

export const PaymentRepositoryLive = Layer.effect(
  PaymentRepository,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return PaymentRepository.of({
      create: (input) => {
        return prismaService.execute(() =>
          prismaService.prisma.payment.create({
            data: {
              method: toPrismaMethod[input.method],
              amount: input.amount,
              currency: input.currency,
              status: input.status ? toPrismaStatus[input.status] : undefined,
              transactionId: input.transactionId,
              order: input.orderId ? { connect: { id: input.orderId } } : undefined,
            },
          })
        )
      },

      listAll: () => {
        return prismaService.execute(() => prismaService.prisma.payment.findMany())
      },

      getById: (id) => {
        return prismaService
          .execute(() => prismaService.prisma.payment.findUnique({ where: { id } }))
          .pipe(Effect.flatMap((payment) => (payment ? Effect.succeed(payment) : Effect.fail(paymentNotFound(id)))))
      },

      updateStatus: (id, status) => {
        return prismaService.execute(() =>
          prismaService.prisma.payment.update({
            where: { id },
            data: { status: toPrismaStatus[status] },
          })
        )
      },

      listByOrderId: (orderId) => {
        return prismaService.execute(() => prismaService.prisma.payment.findMany({ where: { orderId } }))
      },
    })
  })
)
