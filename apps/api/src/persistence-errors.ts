import { Data } from "effect"

// Persistence-layer errors use the "persistence/" tag prefix; domain errors use a "<domain>/" prefix.
export class RecordNotFoundError extends Data.TaggedError("persistence/RecordNotFoundError")<{
  readonly model: string
  readonly id: string
  readonly message: string
}> {}

export class UniqueConstraintViolation extends Data.TaggedError("persistence/UniqueConstraintViolation")<{
  readonly field: string
}> {}

export class DatabaseUnavailable extends Data.TaggedError("persistence/DatabaseUnavailable")<{
  readonly message: string
  readonly meta: unknown
}> {}

export class ForeignKeyViolation extends Data.TaggedError("persistence/ForeignKeyViolation")<{
  readonly field: string
}> {}

export class UnexpectedPersistenceError extends Data.TaggedError("persistence/UnexpectedPersistenceError")<{
  readonly cause: unknown
}> {}

export type PersistenceError =
  | UniqueConstraintViolation
  | RecordNotFoundError
  | DatabaseUnavailable
  | ForeignKeyViolation
  | UnexpectedPersistenceError
