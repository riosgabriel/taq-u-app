import { Effect } from "effect"
import type { ErrorRequestHandler } from "express"
import { AppRuntime } from "../runtime"

export const effectErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  AppRuntime.runFork(
    Effect.logError("Unhandled error", { error: err.message, stack: err.stack }).pipe(
      Effect.annotateLogs({ path: req.path, method: req.method })
    )
  )

  res.status(500).json({ error: "Internal Server Error" })
}
