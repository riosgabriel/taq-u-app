import { describe, expect, it } from "@effect/vitest"
import { ok } from "@/middleware/http"
import { Effect, Layer, Schema } from "effect"
import { buildHandlerProgram } from "middleware/wrap-handler"

/**
 * Unit tests for the wrapHandler utility. We test the
 * `buildHandlerProgram` helper directly rather than going through the
 * full `wrapHandler` + `runEffect` path, because `runEffect` requires
 * the full `AppRuntime` (Prisma, config, logger) which is not
 * available in unit tests. `buildHandlerProgram` exposes the same
 * decode + handler + error-mapping logic without the runtime
 * dispatch.
 */

const IdParamsSchema = Schema.Struct({ id: Schema.String })

const makeReq = (overrides: Partial<{ params: unknown; body: unknown; method: string; path: string }> = {}) =>
  ({
    params: {},
    body: {},
    method: "GET",
    path: "/test",
    headers: {},
    ...overrides,
  }) as any

describe("wrapHandler.buildHandlerProgram", () => {
  describe("params decoding", () => {
    it.effect("decodes req.params and passes them to the handler", () =>
      Effect.gen(function* () {
        const config = {
          params: IdParamsSchema,
          handler: ({ params }: { params: { id: string }; body: unknown }) => Effect.succeed(params),
          responseMapper: (result: unknown) => ok(result),
        }

        const req = makeReq({ params: { id: "abc-123" } })
        const result = yield* buildHandlerProgram(config, req)

        expect(result.status).toBe(200)
        expect(result.body).toEqual({ id: "abc-123" })
      })
    )

    it.effect("passes an empty object when no params schema is provided", () =>
      Effect.gen(function* () {
        const config = {
          handler: () => Effect.succeed("no-params") as Effect.Effect<string>,
          responseMapper: (result: string) => ok({ result }),
        }

        const req = makeReq()
        const result = yield* buildHandlerProgram(config, req)

        expect(result.status).toBe(200)
        expect(result.body).toEqual({ result: "no-params" })
      })
    )
  })

  describe("body decoding", () => {
    it.effect("decodes req.body and passes it to the handler", () =>
      Effect.gen(function* () {
        const config = {
          body: Schema.Struct({ name: Schema.String }),
          handler: ({ body }: { params: unknown; body: { name: string } }) => Effect.succeed(body),
          responseMapper: (result: unknown) => ok(result),
        }

        const req = makeReq({ method: "POST", body: { name: "Jane" } })
        const result = yield* buildHandlerProgram(config, req)

        expect(result.status).toBe(200)
        expect(result.body).toEqual({ name: "Jane" })
      })
    )

    it.effect("fails with a ParseError when the body fails schema validation", () =>
      Effect.gen(function* () {
        const config = {
          body: Schema.Struct({ name: Schema.String }),
          handler: () => Effect.succeed("ok") as Effect.Effect<string>,
          responseMapper: (result: string) => ok({ result }),
        }

        const req = makeReq({ method: "POST", body: { name: 123 } })
        const exit = yield* Effect.either(buildHandlerProgram(config, req))

        expect(exit._tag).toBe("Left")
      })
    )
  })

  describe("error mapping", () => {
    it.effect("maps a tagged error to the configured HTTP response", () =>
      Effect.gen(function* () {
        const config = {
          handler: () => Effect.fail({ _tag: "test/SomeError", message: "boom" }),
          responseMapper: (result: unknown) => ok({ result }),
          errorMappers: {
            "test/SomeError": (e: { message: string }) => ok({ error: e.message }),
          },
        }

        const req = makeReq()
        const result = yield* buildHandlerProgram(config, req)

        expect(result.status).toBe(200)
        expect(result.body).toEqual({ error: "boom" })
      })
    )

    it.effect("applies multiple error mappers in sequence", () =>
      Effect.gen(function* () {
        const config = {
          handler: () => Effect.fail({ _tag: "test/Other", message: "other" }),
          responseMapper: (result: unknown) => ok({ result }),
          errorMappers: {
            "test/SomeError": (e: { message: string }) => ok({ error: e.message, mapped: "first" }),
            "test/Other": (e: { message: string }) => ok({ error: e.message, mapped: "second" }),
          },
        }

        const req = makeReq()
        const result = yield* buildHandlerProgram(config, req)

        expect(result.body).toEqual({ error: "other", mapped: "second" })
      })
    )

    it.effect("does NOT catch unmapped errors — they fall through to the global handler", () =>
      Effect.gen(function* () {
        const config = {
          handler: () => Effect.fail({ _tag: "test/Unmapped", message: "nope" }),
          responseMapper: (result: unknown) => ok({ result }),
          errorMappers: {
            "test/Other": (e: { message: string }) => ok({ error: e.message }),
          },
        }

        const req = makeReq()
        const exit = yield* Effect.either(buildHandlerProgram(config, req))

        expect(exit._tag).toBe("Left")
      })
    )
  })

  describe("response mapping", () => {
    it.effect("applies the responseMapper to the handler's success value", () =>
      Effect.gen(function* () {
        const config = {
          handler: () => Effect.succeed({ count: 42 }),
          responseMapper: (result: { count: number }) => ok({ wrapped: result.count }),
        }

        const req = makeReq()
        const result = yield* buildHandlerProgram(config, req)

        expect(result.status).toBe(200)
        expect(result.body).toEqual({ wrapped: 42 })
      })
    )
  })

  describe("layer provisioning", () => {
    it.effect("threads services from the calling context into the handler", () =>
      Effect.gen(function* () {
        class ProbeService extends Effect.Service<ProbeService>()("test/Probe", {
          succeed: { value: 7 },
        }) {}

        const testLayer = Layer.succeed(ProbeService, { _tag: "test/Probe", value: 7 } as ProbeService)

        const config = {
          handler: () =>
            Effect.gen(function* () {
              const probe = yield* ProbeService
              return probe.value
            }) as Effect.Effect<number, never, ProbeService>,
          responseMapper: (v: number) => ok({ value: v }),
        }

        const req = makeReq()
        const result = yield* buildHandlerProgram(config, req).pipe(Effect.provide(testLayer))

        expect(result.status).toBe(200)
        expect(result.body).toEqual({ value: 7 })
      })
    )
  })
})
