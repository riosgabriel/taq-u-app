import { runEffect } from "@/middleware/effect-runner"
import { ok } from "@/middleware/http"
import { Effect } from "effect"
import { Router } from "express"
import type { NextFunction, Request, Response } from "express"
import { PrismaService } from "prisma-service"

export const HealthController = Router()

HealthController.get("/live", (req: Request, res: Response, next: NextFunction) => {
  runEffect(req, res, next, Effect.succeed(ok({ status: "live" })))
})

HealthController.get("/ready", (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* () {
    const prisma = yield* PrismaService
    yield* prisma.execute(() => prisma.prisma.$queryRaw`SELECT 1`)
    return ok({ status: "ready" })
  }).pipe(
    Effect.catchAll((err) =>
      Effect.succeed({
        status: 503,
        body: { status: "not_ready", error: String(err) },
      })
    )
  )
  runEffect(req, res, next, program)
})

HealthController.get("/health", (req: Request, res: Response, next: NextFunction) => {
  const program = Effect.gen(function* () {
    const prisma = yield* PrismaService
    const start = Date.now()
    yield* prisma.execute(() => prisma.prisma.$queryRaw`SELECT 1`)
    const dbLatencyMs = Date.now() - start
    return ok({
      status: "healthy",
      uptimeSeconds: Math.round(process.uptime()),
      db: { reachable: true, latencyMs: dbLatencyMs },
    })
  }).pipe(
    Effect.catchAll((err) =>
      Effect.succeed({
        status: 503,
        body: { status: "unhealthy", error: String(err) },
      })
    )
  )
  runEffect(req, res, next, program)
})
