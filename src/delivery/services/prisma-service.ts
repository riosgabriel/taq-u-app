import { Context, Layer } from "effect"
import { PrismaClient } from "@prisma/client"

export class PrismaService extends Context.Tag("PrismaService")<PrismaService, { prisma: PrismaClient }>() {}

export const PrismaLive = Layer.sync(PrismaService, () => {
  const prisma = new PrismaClient()
  return { prisma }
})
