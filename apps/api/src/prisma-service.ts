import { PrismaClient } from "@prisma/client"
import { Context, Effect, Layer } from "effect"

export class PrismaService extends Context.Tag("PrismaService")<PrismaService, { prisma: PrismaClient }>() {}

export const PrismaLive = Layer.scoped(
  PrismaService,
  Effect.acquireRelease(
    Effect.sync(() => ({ prisma: new PrismaClient() })),
    ({ prisma }) => Effect.sync(() => prisma.$disconnect())
  )
)
