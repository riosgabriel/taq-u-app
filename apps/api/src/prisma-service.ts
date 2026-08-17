import {
  DatabaseUnavailable,
  ForeignKeyViolation,
  PersistenceError,
  RecordNotFoundError,
  UnexpectedPersistenceError,
  UniqueConstraintViolation,
} from "@/persistence-errors"
import { Prisma, PrismaClient } from "@prisma/client"
import { ConfigService } from "config-service"
import { Context, Effect, Either, Layer } from "effect"

const mapKnownPrismaError = (error: Prisma.PrismaClientKnownRequestError): PersistenceError => {
  switch (error.code) {
    case "P2002":
      return new UniqueConstraintViolation({
        field: Array.isArray(error.meta?.target)
          ? (error.meta.target as string[]).join(", ")
          : String(error.meta?.target ?? "unknown"),
      })
    case "P2003":
      return new ForeignKeyViolation({
        field: String(error.meta?.field_name ?? "unknown"),
      })
    case "P2025":
      return new RecordNotFoundError({
        model: String(error.meta?.modelName ?? "unknown"),
        id: "unknown",
        message: error.message,
      })
    default:
      return new UnexpectedPersistenceError({ cause: error })
  }
}

export const mapPrismaError = (error: unknown): PersistenceError => {
  if (
    error instanceof UniqueConstraintViolation ||
    error instanceof RecordNotFoundError ||
    error instanceof DatabaseUnavailable ||
    error instanceof ForeignKeyViolation ||
    error instanceof UnexpectedPersistenceError
  ) {
    return error
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapKnownPrismaError(error)
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseUnavailable({ meta: error, message: error.message })
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new DatabaseUnavailable({ meta: error, message: error.message })
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new UnexpectedPersistenceError({ cause: error })
  }
  throw error
}

export class TransactionAborted<E> extends Error {
  constructor(readonly error: E) {
    super("Transaction aborted")
    this.name = "TransactionAborted"
  }
}

export class PrismaService extends Context.Tag("PrismaService")<
  PrismaService,
  {
    readonly prisma: PrismaClient
    readonly execute: <A>(operation: () => Prisma.PrismaPromise<A>) => Effect.Effect<A, PersistenceError>
    readonly $transaction: <A, E = never>(
      fn: (tx: Prisma.TransactionClient) => Promise<Either.Either<A, E>>
    ) => Effect.Effect<A, PersistenceError | E>
  }
>() {}

export const PrismaLive = Layer.scoped(
  PrismaService,
  Effect.gen(function* () {
    const { databaseUrl } = yield* ConfigService
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log: process.env.LOG_PRISMA === "true" ? ["query", "info", "warn", "error"] : ["error", "warn"],
    })
    return PrismaService.of({
      prisma: client,
      execute: (operation) =>
        Effect.tryPromise({
          try: operation,
          catch: mapPrismaError,
        }),
      $transaction: <A, E = never>(fn: (tx: Prisma.TransactionClient) => Promise<Either.Either<A, E>>) =>
        Effect.tryPromise({
          try: () =>
            client.$transaction(async (tx) => {
              const result = await fn(tx)
              if (Either.isLeft(result)) throw new TransactionAborted(result.left)
              return result.right
            }),
          catch: (error) => {
            if (error instanceof TransactionAborted) return error.error as PersistenceError | E
            return mapPrismaError(error)
          },
        }),
    })
  }).pipe(Effect.acquireRelease(({ prisma }) => Effect.sync(() => prisma.$disconnect())))
)
