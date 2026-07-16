import {
  DatabaseUnavailable,
  ForeignKeyViolation,
  PersistenceError,
  RecordNotFoundError,
  UnexpectedPersistenceError,
  UniqueConstraintViolation,
} from "@/persistence-errors"
import { ConfigService } from "config-service"
import { Prisma, PrismaClient } from "@prisma/client"
import { Context, Effect, Layer } from "effect"

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

const mapPrismaError = (error: unknown): PersistenceError => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return mapKnownPrismaError(error)
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseUnavailable()
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return new DatabaseUnavailable()
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return new UnexpectedPersistenceError({ cause: error })
  }
  throw error
}

export class PrismaService extends Context.Tag("PrismaService")<
  PrismaService,
  {
    readonly prisma: PrismaClient
    readonly execute: <A>(operation: () => Prisma.PrismaPromise<A>) => Effect.Effect<A, PersistenceError>
    readonly $transaction: <A>(fn: (tx: Prisma.TransactionClient) => Promise<A>) => Effect.Effect<A, PersistenceError>
  }
>() {}

export const PrismaLive = Layer.scoped(
  PrismaService,
  Effect.gen(function* () {
    const { databaseUrl } = yield* ConfigService
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    })
    return PrismaService.of({
      prisma: client,
      execute: (operation) =>
        Effect.tryPromise({
          try: operation,
          catch: mapPrismaError,
        }),
      $transaction: (fn) =>
        Effect.tryPromise({
          try: () => client.$transaction(fn),
          catch: mapPrismaError,
        }),
    })
  }).pipe(Effect.acquireRelease(({ prisma }) => Effect.sync(() => prisma.$disconnect())))
)
