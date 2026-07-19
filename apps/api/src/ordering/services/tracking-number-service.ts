import { PersistenceError, UnexpectedPersistenceError } from "@/persistence-errors"
import { Prisma } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { mapPrismaError, PrismaService } from "prisma-service"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const TRACKING_NUMBER_LENGTH = 12
const MAX_GENERATION_ATTEMPTS = 100

const generateCandidate = (): string => {
  let suffix = ""
  for (let i = 0; i < TRACKING_NUMBER_LENGTH; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `TAQ-${suffix}`
}

export class TrackingNumberService extends Context.Tag("order/TrackingNumberService")<
  TrackingNumberService,
  {
    readonly generate: () => Effect.Effect<string, PersistenceError>
    readonly generateInTx: (tx: Prisma.TransactionClient) => Promise<string>
  }
>() {}

export const TrackingNumberServiceLive = Layer.effect(
  TrackingNumberService,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    const generate = (): Effect.Effect<string, PersistenceError> =>
      Effect.gen(function* () {
        for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
          const candidate = generateCandidate()
          const existing = yield* prismaService.execute(() =>
            prismaService.prisma.package.findUnique({ where: { trackingNumber: candidate } })
          )
          if (!existing) return candidate
        }
        return yield* Effect.fail(
          new UnexpectedPersistenceError({
            cause: `Could not generate a unique tracking number after ${MAX_GENERATION_ATTEMPTS} attempts`,
          })
        )
      })

    const generateInTx = async (tx: Prisma.TransactionClient): Promise<string> => {
      for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
        const candidate = generateCandidate()
        const existing = await tx.package.findUnique({ where: { trackingNumber: candidate } }).catch((e) => {
          throw mapPrismaError(e)
        })
        if (!existing) return candidate
      }
      throw new UnexpectedPersistenceError({
        cause: `Could not generate a unique tracking number after ${MAX_GENERATION_ATTEMPTS} attempts`,
      })
    }

    return TrackingNumberService.of({ generate, generateInTx })
  })
)

export type TrackingNumberServiceShape = Context.Tag.Service<TrackingNumberService>
