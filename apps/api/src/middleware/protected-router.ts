import { CustomerId } from "@/ids"
import { requireAuth } from "@/middleware/auth"
import { runEffect } from "@/middleware/effect-runner"
import { HttpResponse, unauthorized } from "@/middleware/http"
import { InvalidTokenError } from "auth/auth-errors"
import { Effect } from "effect"
import { NextFunction, Request, Response, Router } from "express"

export type ProtectedHandler<E, R> = (customerId: CustomerId, req: Request) => Effect.Effect<HttpResponse, E, R>

export const protectedRouter = () => {
  const router = Router()

  const wrap =
    <E, R>(handler: ProtectedHandler<E, R>) =>
    (req: Request, res: Response, next: NextFunction) => {
      const program = Effect.gen(function* () {
        const customerId = yield* requireAuth(req)
        return yield* handler(customerId, req)
      }).pipe(
        Effect.catchTag("auth/InvalidTokenError", (error) =>
          Effect.succeed(unauthorized((error as InvalidTokenError).message))
        )
      )
      runEffect(req, res, next, program)
    }

  return {
    get: (path: string, handler: ProtectedHandler<any, any>) => router.get(path, wrap(handler)),
    post: (path: string, handler: ProtectedHandler<any, any>) => router.post(path, wrap(handler)),
    put: (path: string, handler: ProtectedHandler<any, any>) => router.put(path, wrap(handler)),
    delete: (path: string, handler: ProtectedHandler<any, any>) => router.delete(path, wrap(handler)),
    router,
  }
}
