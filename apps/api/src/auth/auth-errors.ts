import { Data } from "effect"

export class InvalidCredentialsError extends Data.TaggedError("auth/InvalidCredentialsError")<{
  readonly message: string
}> {}

export class InvalidTokenError extends Data.TaggedError("auth/InvalidTokenError")<{
  readonly message: string
}> {}

export class EmailAlreadyRegisteredError extends Data.TaggedError("auth/EmailAlreadyRegisteredError")<{
  readonly email: string
  readonly message: string
}> {}
