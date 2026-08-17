import { CustomerId } from "@/ids"
import { InvalidTokenError } from "auth/auth-errors"
import { TokenService } from "auth/services/token-service"
import { Effect } from "effect"
import type { Request } from "express"

export const requireAuth = (req: Request): Effect.Effect<CustomerId, InvalidTokenError, TokenService> =>
  Effect.gen(function* () {
    const authorization = req.headers.authorization
    const match = authorization?.match(/^Bearer\s+(.+)$/i)
    if (!match) {
      return yield* Effect.fail(new InvalidTokenError({ message: "Missing or invalid Authorization header" }))
    }
    const tokenService = yield* TokenService
    const claims = yield* tokenService.verify(match[1])
    return claims.id
  })
