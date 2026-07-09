import { Effect } from "effect"
import * as ParseResult from "effect/ParseResult"
import type { NextFunction, Request, Response } from "express"
import { AppRuntime } from "../runtime"
import type { HttpResponse } from "./http"

export const runEffect = <E, R>(
  req: Request,
  res: Response,
  next: NextFunction,
  program: Effect.Effect<HttpResponse, E, R>
) => {
  const handled = program.pipe(
    Effect.annotateLogs({
      requestId: req.headers["x-request-id"] ?? crypto.randomUUID(),
      method: req.method,
      path: req.path,
    }),
    Effect.matchEffect({
      onSuccess: (response) =>
        Effect.sync(() => {
          res.status(response.status).json(response.body)
        }),
      onFailure: (error) =>
        Effect.sync(() => {
          if (ParseResult.isParseError(error)) {
            res.status(400).json({ error: error.message })
            return
          }
          next(error)
        }),
    })
  )

  // TODO: find a way to remove the cast
  AppRuntime.runPromise(handled as Effect.Effect<void, never>).catch(next)
}
