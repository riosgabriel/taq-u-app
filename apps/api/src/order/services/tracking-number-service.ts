import { PersistenceError } from "@/persistence-errors"
import { Context, Effect, Layer } from "effect"
import { PrismaService } from "prisma-service"

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

    return TrackingNumberService.of({ generate })
  })
)

export type TrackingNumberServiceShape = Context.Tag.Service<TrackingNumberService>
