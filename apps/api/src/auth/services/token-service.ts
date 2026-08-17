import { CustomerId } from "@/ids"
import { ConfigService } from "config-service"
import { Context, Effect, Layer, Schema } from "effect"
import { SignJWT, jwtVerify } from "jose"
import { InvalidTokenError } from "../auth-errors"

export type TokenClaims = {
  readonly id: CustomerId
  readonly email: string
}

export class TokenService extends Context.Tag("auth/TokenService")<
  TokenService,
  {
    readonly sign: (claims: { id: CustomerId; email: string }) => Effect.Effect<string, never>
    readonly verify: (token: string) => Effect.Effect<TokenClaims, InvalidTokenError>
  }
>() {}

export const TokenServiceLive = Layer.effect(
  TokenService,
  Effect.gen(function* () {
    const { jwtSecret } = yield* ConfigService
    const secret = new TextEncoder().encode(jwtSecret)

    return TokenService.of({
      sign: ({ id, email }) =>
        Effect.promise(() =>
          new SignJWT({ email })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(id)
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(secret)
        ),
      verify: (token) =>
        Effect.tryPromise({
          try: async () => {
            const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
            if (!payload.sub || typeof payload.email !== "string") {
              throw new Error("missing token claims")
            }
            return { id: Schema.decodeSync(CustomerId)(payload.sub), email: payload.email }
          },
          catch: () => new InvalidTokenError({ message: "Invalid or expired token" }),
        }),
    })
  })
)
