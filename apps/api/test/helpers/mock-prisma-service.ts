import { Context, Effect, Either } from "effect"
import { TransactionAborted, mapPrismaError, PrismaService } from "prisma-service"

export const mockPrismaServiceWith = (tx: unknown): Context.Tag.Service<PrismaService> =>
  PrismaService.of({
    prisma: {} as never,
    execute: (operation) => Effect.tryPromise({ try: operation, catch: mapPrismaError }),
    $transaction: (fn) =>
      Effect.tryPromise({
        try: async () => {
          const result = await fn(tx as any)
          if (Either.isLeft(result)) throw new TransactionAborted(result.left)
          return result.right
        },
        catch: (error) => {
          if (error instanceof TransactionAborted) return error.error as any
          return mapPrismaError(error)
        },
      }),
  })
