import { Context, Effect, Layer } from "effect"
import { PrismaClient } from "@prisma/client"
import { ConfigService } from "@order/services/config-service"

export class PrismaService extends Context.Tag("PrismaService")<PrismaService, { prisma: PrismaClient }>() {}

export const PrismaLive = Layer.scoped(
  PrismaService,
  Effect.gen(function* () {
    const { databaseUrl } = yield* ConfigService
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    })
    return PrismaService.of({ prisma: client })
  }).pipe(Effect.acquireRelease(({ prisma }) => Effect.sync(() => prisma.$disconnect())))
)
