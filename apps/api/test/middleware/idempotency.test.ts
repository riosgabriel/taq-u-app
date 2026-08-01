import { describe, expect, it } from "@effect/vitest"
import { IdempotencyStore, withIdempotency } from "middleware/idempotency"
import { NextFunction, Request, Response } from "express"
import { vi } from "vitest"

/**
 * Tests for the idempotency middleware. We mock Express req/res with
 * a minimal shape: the middleware only reads `req.body` and
 * `req.header(...)` and writes through `res.status(...).json(...)`.
 */

const makeReq = (body: unknown, idempotencyKey?: string): Request =>
  ({
    body,
    headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : {},
    method: "POST",
    path: "/test",
  }) as unknown as Request

interface MockRes extends Response {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

const makeRes = (): { res: MockRes; calls: Array<{ status: number; body: unknown }> } => {
  const calls: Array<{ status: number; body: unknown }> = []
  const res = {
    status: vi.fn((code: number) => {
      calls.push({ status: code, body: null })
      return res
    }),
    json: vi.fn((body: unknown) => {
      if (calls.length > 0) calls[calls.length - 1].body = body
      return res
    }),
  } as unknown as MockRes
  return { res, calls }
}

const next = vi.fn() as unknown as NextFunction

const handlerReturning = (status: number, body: unknown) =>
  vi.fn((_req: Request, res: Response) => {
    ;(res as MockRes).status(status)
    ;(res as MockRes).json(body)
    return Promise.resolve()
  }) as unknown as Parameters<typeof withIdempotency>[0]

describe("withIdempotency", () => {
  it("passes through when no Idempotency-Key header is present", async () => {
    const handler = handlerReturning(201, { id: "new-1" })
    const wrapped = withIdempotency()(handler)

    const { res, calls } = makeRes()
    await wrapped(makeReq({ name: "Jane" }), res, next)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(calls[0].status).toBe(201)
    expect(calls[0].body).toEqual({ id: "new-1" })
  })

  it("caches the response on first call with an Idempotency-Key", async () => {
    const handler1 = handlerReturning(201, { id: "new-1" })
    const store = new IdempotencyStore()
    const wrapped1 = withIdempotency({ store })(handler1)

    const { res: res1, calls: calls1 } = makeRes()
    await wrapped1(makeReq({ name: "Jane" }, "key-1"), res1, next)

    expect(handler1).toHaveBeenCalledTimes(1)
    expect(calls1[0].body).toEqual({ id: "new-1" })

    // Second call with same key and same body — handler should not be called
    const handler2 = handlerReturning(201, { id: "should-not-be-called" })
    const wrapped2 = withIdempotency({ store })(handler2)
    const { res: res2, calls: calls2 } = makeRes()
    await wrapped2(makeReq({ name: "Jane" }, "key-1"), res2, next)

    expect(handler2).not.toHaveBeenCalled()
    expect(calls2[0].status).toBe(201)
    expect(calls2[0].body).toEqual({ id: "new-1" })
  })

  it("returns 422 when the same key is reused with a different body", async () => {
    const handler1 = handlerReturning(201, { id: "new-1" })
    const store = new IdempotencyStore()
    const wrapped1 = withIdempotency({ store })(handler1)

    const { res: res1 } = makeRes()
    await wrapped1(makeReq({ name: "Jane" }, "key-1"), res1, next)

    const handler2 = handlerReturning(201, { id: "new-2" })
    const wrapped2 = withIdempotency({ store })(handler2)
    const { res: res2, calls: calls2 } = makeRes()
    await wrapped2(makeReq({ name: "Different" }, "key-1"), res2, next)

    expect(handler2).not.toHaveBeenCalled()
    expect(calls2[0].status).toBe(422)
    expect(calls2[0].body).toMatchObject({ error: expect.stringContaining("Idempotency-Key") })
  })

  it("does not cache non-2xx responses — the retry runs the handler again", async () => {
    const handler1 = handlerReturning(500, { error: "boom" })
    const store = new IdempotencyStore()
    const wrapped1 = withIdempotency({ store })(handler1)

    const { res: res1 } = makeRes()
    await wrapped1(makeReq({ name: "Jane" }, "key-1"), res1, next)

    // Retry — handler should run because the previous response was 5xx
    const handler2 = handlerReturning(201, { id: "new-2" })
    const wrapped2 = withIdempotency({ store })(handler2)
    const { res: res2, calls: calls2 } = makeRes()
    await wrapped2(makeReq({ name: "Jane" }, "key-1"), res2, next)

    expect(handler2).toHaveBeenCalledTimes(1)
    expect(calls2[0].status).toBe(201)
    expect(calls2[0].body).toEqual({ id: "new-2" })
  })

  it("expires entries after the TTL elapses", async () => {
    let nowMs = 1_000
    const store = new IdempotencyStore()
    const handler1 = handlerReturning(201, { id: "new-1" })
    const wrapped1 = withIdempotency({ ttlMs: 100, store, now: () => nowMs })(handler1)

    const { res: res1 } = makeRes()
    await wrapped1(makeReq({ name: "Jane" }, "key-1"), res1, next)

    // Advance past TTL
    nowMs = 5_000

    const handler2 = handlerReturning(201, { id: "new-2" })
    const wrapped2 = withIdempotency({ ttlMs: 100, store, now: () => nowMs })(handler2)
    const { res: res2, calls: calls2 } = makeRes()
    await wrapped2(makeReq({ name: "Jane" }, "key-1"), res2, next)

    expect(handler2).toHaveBeenCalledTimes(1)
    expect(calls2[0].body).toEqual({ id: "new-2" })
  })

  it("uses a request-body hash so cosmetic reordering is detected as a conflict", async () => {
    // Two different JSON objects with the same keys but different value
    // order — SHA-256 of the JSON string is order-sensitive, so this
    // is treated as a conflict.
    const store = new IdempotencyStore()
    const handler1 = handlerReturning(201, { id: "1" })
    const wrapped1 = withIdempotency({ store })(handler1)
    const { res: res1 } = makeRes()
    await wrapped1(makeReq({ a: 1, b: 2 }, "key-x"), res1, next)

    const handler2 = handlerReturning(201, { id: "2" })
    const wrapped2 = withIdempotency({ store })(handler2)
    const { res: res2, calls: calls2 } = makeRes()
    await wrapped2(makeReq({ b: 2, a: 1 }, "key-x"), res2, next)

    expect(calls2[0].status).toBe(422)
  })
})
