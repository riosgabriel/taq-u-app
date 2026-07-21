import { Effect, Schema } from "effect"
import type { ParseError } from "effect/ParseResult"
import type { Request } from "express"

export const decodeBody = <A, I, R>(schema: Schema.Schema<A, I, R>, req: Request): Effect.Effect<A, ParseError, R> =>
  Schema.decodeUnknown(schema)(req.body)

export const decodeParams = <A, I, R>(schema: Schema.Schema<A, I, R>, req: Request): Effect.Effect<A, ParseError, R> =>
  Schema.decodeUnknown(schema)(req.params)

export const IdParams = Schema.Struct({ id: Schema.String })

export const Email = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "must be a valid email address",
  })
)
