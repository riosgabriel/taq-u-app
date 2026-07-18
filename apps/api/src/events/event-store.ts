import { PersistenceError } from "@/persistence-errors"
import { Prisma } from "@prisma/client"
import { Context, Effect, Layer } from "effect"
import { DomainEvent } from "events/domain-event"
import { mapPrismaError, PrismaService } from "prisma-service"

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
    readonly write: (
      tx: Prisma.TransactionClient,
      events: ReadonlyArray<DomainEvent>
    ) => Effect.Effect<void, PersistenceError>
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
      write: (tx: Prisma.TransactionClient, events: ReadonlyArray<DomainEvent>) =>
        events.length === 0
          ? Effect.void
          : Effect.tryPromise({
              try: () =>
                tx.event.createMany({
                  data: events.map((e) => ({
                    type: e.type,
                    streamId: e.streamId,
                    payload: e.payload,
                  })),
                }),
              catch: mapPrismaError,
            }),

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
