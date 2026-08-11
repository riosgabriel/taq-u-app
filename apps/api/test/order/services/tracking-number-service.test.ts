import { describe, expect, it } from "@effect/vitest"
import { Effect, Either, Layer } from "effect"
import { TrackingNumberService, TrackingNumberServiceLive } from "ordering/services/tracking-number-service"
import { Prisma } from "@prisma/client"
import { PrismaService } from "prisma-service"

describe("TrackingNumberService.generateInTx", () => {
  const mockPrismaService = PrismaService.of({
    prisma: {} as never,
    execute: () => Effect.die("unexpected"),
    $transaction: () => Effect.die("unexpected"),
  })

  const layer = TrackingNumberServiceLive.pipe(Layer.provide(Layer.succeed(PrismaService, mockPrismaService)))

  const getService = () => Effect.runSync(TrackingNumberService.pipe(Effect.provide(layer)))

  it("returns a TAQ tracking number when the candidate is unique", async () => {
    const tx = { package: { findUnique: async () => null } }
    const result = await getService().generateInTx(tx as any)
    if (Either.isLeft(result)) {
      throw new Error(`expected Right, got Left: ${result.left._tag}`)
    }
    expect(result.right).toMatch(/^TAQ-[A-Z0-9]{12}$/)
  })

  it("resolves with UnexpectedPersistenceError when no unique number is found", async () => {
    const tx = { package: { findUnique: async () => ({ id: "pkg-1", trackingNumber: "TAQ-EXISTING" }) } }
    const result = await getService().generateInTx(tx as any)
    if (Either.isRight(result)) {
      throw new Error("expected Left, got Right")
    }
    expect(result.left._tag).toBe("persistence/UnexpectedPersistenceError")
  })

  it("resolves with UniqueConstraintViolation when the query fails", async () => {
    const tx = {
      package: {
        findUnique: async () => {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed on trackingNumber", {
            code: "P2002",
            clientVersion: "test",
            meta: { target: ["trackingNumber"] },
          })
        },
      },
    }
    const result = await getService().generateInTx(tx as any)
    if (Either.isRight(result)) {
      throw new Error("expected Left, got Right")
    }
    expect(result.left._tag).toBe("persistence/UniqueConstraintViolation")
  })
})
