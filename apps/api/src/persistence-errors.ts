import { Data } from "effect"

export class RecordNotFoundError extends Data.TaggedError("order/RecordNotFoundError")<{
  readonly model: string
  readonly id: string
  readonly message: string
}> {}

export class UniqueConstraintViolation extends Data.TaggedError("UniqueConstraintViolation")<{
  readonly field: string
}> {}

export class DatabaseUnavailable extends Data.TaggedError("DatabaseUnavailable")<{}> {}

export class ForeignKeyViolation extends Data.TaggedError("ForeignKeyViolation")<{
  readonly field: string
}> {}

export class UnexpectedPersistenceError extends Data.TaggedError("UnexpectedPersistenceError")<{
  readonly cause: unknown
}> {}

export type PersistenceError =
  | UniqueConstraintViolation
  | RecordNotFoundError
  | DatabaseUnavailable
  | ForeignKeyViolation
  | UnexpectedPersistenceError
