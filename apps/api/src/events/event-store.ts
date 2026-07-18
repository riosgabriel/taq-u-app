import { PersistenceError } from "@/persistence-errors"
import { Prisma } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { DomainEvent } from "events/domain-event"
import { mapPrismaError, PrismaService } from "prisma-service"

// Read-side projection of an Event row. Note: `createdAt` is DB-managed and serves
// as the temporal marker — `DomainEvent` deliberately omits it since it is set on
// insert and not on the in-memory event construction.
export interface EventRow {
  readonly sequence: bigint
  readonly type: string
  readonly streamId: string
  readonly payload: Prisma.JsonValue
  readonly createdAt: Date
}

export class EventStore extends Context.Tag("events/EventStore")<
  EventStore,
  {
    // `write` is intentionally a Promise: it runs inside a caller's $transaction
    // callback and must participate in the existing transaction. Read methods
    // return Effect because they are called from Effect.gen and benefit from
    // structured concurrency + error mapping via PrismaService.execute.
    readonly write: (tx: Prisma.TransactionClient, events: ReadonlyArray<DomainEvent>) => Promise<void>
    readonly readSince: (sinceSequence: bigint, limit: number) => Effect.Effect<EventRow[], PersistenceError>
    readonly readSinceWithType: (
      sinceSequence: bigint,
      types: ReadonlyArray<string>,
      limit: number
    ) => Effect.Effect<EventRow[], PersistenceError>
  }
>() {}

export const EventStoreLive = Layer.effect(
  EventStore,
  Effect.gen(function* () {
    const prismaService = yield* PrismaService

    return EventStore.of({
      write: async (tx: Prisma.TransactionClient, events: ReadonlyArray<DomainEvent>) => {
        if (events.length === 0) return
        try {
          await tx.event.createMany({
            data: events.map((e) => ({
              type: e.type,
              streamId: e.streamId,
              payload: e.payload,
            })),
          })
        } catch (error) {
          throw mapPrismaError(error)
        }
      },

      readSince: (sinceSequence: bigint, limit: number) => {
        if (limit <= 0 || sinceSequence < 0n) return Effect.succeed([])
        return prismaService.execute(() =>
          prismaService.prisma.event.findMany({
            where: { sequence: { gt: sinceSequence } },
            orderBy: { sequence: "asc" },
            take: limit,
          })
        )
      },

      readSinceWithType: (sinceSequence: bigint, types: ReadonlyArray<string>, limit: number) => {
        if (limit <= 0 || sinceSequence < 0n) return Effect.succeed([])
        if (types.length === 0) return Effect.succeed([])
        return prismaService.execute(() =>
          prismaService.prisma.event.findMany({
            where: { sequence: { gt: sinceSequence }, type: { in: types as string[] } },
            orderBy: { sequence: "asc" },
            take: limit,
          })
        )
      },
    })
  })
)
