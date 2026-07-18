import { PersistenceError } from "@/persistence-errors"
import { Prisma } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { mapPrismaError, PrismaService } from "prisma-service"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const TRACKING_NUMBER_LENGTH = 12

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
        const candidate = generateCandidate()
        const existing = yield* prismaService.execute(() =>
          prismaService.prisma.package.findUnique({ where: { trackingNumber: candidate } })
        )
        if (existing) {
          return yield* generate()
        }
        return candidate
      })

    // Tx-aware variant: uniqueness check is performed on the same transaction
    // client so that allocations see each other's uncommitted writes and a
    // transaction rollback discards any numbers it produced. Returns a Promise
    // so it can be awaited from inside a $transaction callback.
    const generateInTx = async (tx: Prisma.TransactionClient): Promise<string> => {
      const candidate = generateCandidate()
      const existing = await tx.package.findUnique({ where: { trackingNumber: candidate } }).catch((e) => {
        throw mapPrismaError(e)
      })
      if (existing) {
        return generateInTx(tx)
      }
      return candidate
    }

    return TrackingNumberService.of({ generate, generateInTx })
  })
)

export type TrackingNumberServiceShape = Context.Tag.Service<TrackingNumberService>
