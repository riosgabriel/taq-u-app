import { PersistenceError } from "@/persistence-errors"
import { Context, Effect, Layer } from "effect"
import { DomainEvent } from "events/domain-event"
import { PrismaService } from "prisma-service"
import { mapPrismaError } from "prisma-service"

export interface AuditLogEntry {
  readonly id: string
  readonly eventType: string
  readonly streamId: string
  readonly payload: unknown
  readonly createdAt: Date
}

export interface ListAuditLogsOptions {
  readonly streamId?: string
  readonly eventType?: string
  readonly limit?: number
  readonly since?: Date
}

export class AuditLogService extends Context.Tag("audit/AuditLogService")<
  AuditLogService,
  {
    readonly record: (event: DomainEvent) => Effect.Effect<void, PersistenceError>
    readonly list: (opts: ListAuditLogsOptions) => Effect.Effect<AuditLogEntry[], PersistenceError>
  }
>() {}

export const AuditLogServiceLive = Layer.effect(
  AuditLogService,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return AuditLogService.of({
      record: (event: DomainEvent) =>
        Effect.tryPromise({
          try: () =>
            prismaService.prisma.auditLog.create({
              data: {
                eventType: event.type,
                streamId: event.streamId,
                payload: event.payload,
              },
            }),
          catch: mapPrismaError,
        }).pipe(Effect.asVoid),

      list: ({ streamId, eventType, limit = 50, since }: ListAuditLogsOptions) =>
        prismaService.execute(() =>
          prismaService.prisma.auditLog.findMany({
            where: {
              ...(streamId && { streamId }),
              ...(eventType && { eventType }),
              ...(since && { createdAt: { gte: since } }),
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          })
        ).pipe(
          Effect.map((rows) =>
            rows.map((r) => ({
              id: r.id,
              eventType: r.eventType,
              streamId: r.streamId,
              payload: r.payload,
              createdAt: r.createdAt,
            }))
          )
        ),
    })
  })
)