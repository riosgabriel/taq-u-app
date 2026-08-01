import { runEffect } from "@/middleware/effect-runner"
import { HttpResponse } from "@/middleware/http"
import { decodeBody, decodeParams } from "@/middleware/validate"
import { Effect, Schema } from "effect"
import { NextFunction, Request, RequestHandler, Response } from "express"

/**
 * Maps a tagged error to an HTTP response. The error is typed as
 * `{ message: string }` because every domain error in this codebase
 * extends `Data.TaggedError` with a `message` field. Callers can
 * safely access `error.message` in the mapper.
 */
export type ErrorMapper = (error: { message: string }) => HttpResponse

export interface WrapHandlerConfig<P, B, A, E, R> {
  /**
   * Optional Effect Schema for the request params. When provided, the
   * utility decodes `req.params` against it before invoking the handler.
   */
  readonly params?: Schema.Schema<P>
  /**
   * Optional Effect Schema for the request body. When provided, the
   * utility decodes `req.body` against it before invoking the handler.
   */
  readonly body?: Schema.Schema<B>
  /**
   * The business logic. Receives the decoded params and body (each may
   * be `{}` if the corresponding schema was not provided) and returns
   * an Effect that produces the success value or fails with a tagged
   * error.
   */
  readonly handler: (input: { params: P; body: B }) => Effect.Effect<A, E, R>
  /**
   * Maps the success value to an HTTP response. Typically wraps the
   * result in `ok(...)`.
   */
  readonly responseMapper: (result: A) => HttpResponse
  /**
   * Maps tagged errors to HTTP responses. Each key is the `_tag` of
   * the error, and the value is the mapper. Errors that are not in
   * this map fall through to the global `effectErrorHandler` as 500.
   */
  readonly errorMappers?: Readonly<Record<string, ErrorMapper>>
}

/**
 * Builds the Effect program that the wrapHandler runs, without
 * dispatching it through runEffect. Exported so unit tests can
 * exercise the decode + handler + error-mapping logic without
 * configuring the full AppRuntime.
 */
export const buildHandlerProgram = <P, B, A, E, R>(
  config: WrapHandlerConfig<P, B, A, E, R>,
  req: Request
): Effect.Effect<HttpResponse, unknown, R> => {
  const program = Effect.gen(function* (_) {
    const params = (config.params ? yield* decodeParams(config.params, req) : {}) as P
    const body = (config.body ? yield* decodeBody(config.body, req) : {}) as B
    const result = yield* config.handler({ params, body })
    return config.responseMapper(result)
  })

  if (!config.errorMappers) {
    return program as Effect.Effect<HttpResponse, unknown, R>
  }

  // Apply each error mapper as a separate catchTag. The tag and the
  // callback are cast because Effect's `catchTag` constrains the tag
  // to a literal string from the error type union — since `E` is
  // generic and the tag is a runtime string, we cannot prove the
  // constraint statically. The user is responsible for providing the
  // correct tag string (which must match the `_tag` on the domain
  // error). The `as typeof program` cast on the pipe result is safe
  // because `catchTag` preserves the shape of the input effect.
  let withErrorMapping: typeof program = program
  for (const [tag, mapper] of Object.entries(config.errorMappers)) {
    const callback = ((error: unknown) => Effect.succeed(mapper(error as { message: string }))) as never
    withErrorMapping = withErrorMapping.pipe(Effect.catchTag(tag as never, callback)) as typeof program
  }

  return withErrorMapping as Effect.Effect<HttpResponse, unknown, R>
}

/**
 * Wraps an Express handler with the boilerplate that every route in
 * this codebase used to repeat by hand:
 *
 *   1. decode `req.params` and `req.body` against Effect Schemas
 *   2. invoke the business logic, yielding the service result
 *   3. map the result to an HTTP response
 *   4. catch tagged errors and map them to HTTP responses
 *   5. delegate to `runEffect` for logging, parse-error mapping, and
 *      global error handling
 *
 * The result is an Express `RequestHandler` that can be passed
 * directly to `Router.post(...)`, `Router.get(...)`, etc.
 *
 * Example:
 *
 *   router.get(
 *     "/:id",
 *     wrapHandler({
 *       params: IdParams,
 *       handler: ({ params }) => service.getById(params.id),
 *       responseMapper: MyResponse.fromX,
 *       errorMappers: {
 *         "x/NotFoundError": (e) => notFound(e.message),
 *       },
 *     })
 *   )
 */
export const wrapHandler = <P, B, A, E, R>(config: WrapHandlerConfig<P, B, A, E, R>): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const program = buildHandlerProgram(config, req) as Effect.Effect<HttpResponse, never, never>
    runEffect(req, res, next, program)
  }
}
