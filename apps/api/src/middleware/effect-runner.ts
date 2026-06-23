import { Effect } from "effect"
import type { NextFunction, Request, Response } from "express"
import { AppRuntime } from "../runtime"

export const runEffect = <A, E, R>(
  req: Request,
  _res: Response,
  next: NextFunction,
  program: Effect.Effect<A, E, R>,
  onSuccess: (value: A) => void
) => {
  // Annotate every log in this request with shared context
  const withContext = program.pipe(
    Effect.annotateLogs({
      requestId: req.headers["x-request-id"] ?? crypto.randomUUID(),
      method: req.method,
      path: req.path,
    })
  ) as Effect.Effect<A, E>

  AppRuntime.runPromise(withContext).then(onSuccess).catch(next)
}