import { createHash } from "crypto"
import { NextFunction, Request, RequestHandler, Response } from "express"

/**
 * A single cached response for a given idempotency key. Stores the
 * status code, body, a hash of the original request body (so we can
 * detect "same key, different request" conflicts), and the expiry
 * timestamp in milliseconds since epoch.
 */
export interface IdempotencyRecord {
  readonly statusCode: number
  readonly body: unknown
  readonly requestHash: string
  readonly expiresAt: number
}

/**
 * In-memory store for idempotency records. Thread-unsafe (Node.js is
 * single-threaded for JS, so this is fine in practice) and not
 * persistent across restarts. A Prisma-backed store is a natural
 * upgrade path when the API runs across multiple instances.
 */
export class IdempotencyStore {
  private readonly store = new Map<string, IdempotencyRecord>()

  get(key: string, now: number = Date.now()): IdempotencyRecord | null {
    const record = this.store.get(key)
    if (!record) return null
    if (record.expiresAt <= now) {
      this.store.delete(key)
      return null
    }
    return record
  }

  set(key: string, record: IdempotencyRecord): void {
    this.store.set(key, record)
  }

  size(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }
}

const defaultStore = new IdempotencyStore()

export const getDefaultIdempotencyStore = (): IdempotencyStore => defaultStore

const hashRequestBody = (body: unknown): string => {
  const hash = createHash("sha256")
  hash.update(JSON.stringify(body))
  return hash.digest("hex")
}

const IDEMPOTENCY_HEADER = "idempotency-key"
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000

export interface WithIdempotencyOptions {
  /**
   * Time-to-live in milliseconds for cached records. Defaults to 24h.
   */
  readonly ttlMs?: number
  /**
   * Storage backend. Defaults to the process-wide in-memory store.
   * Inject a custom store for tests or for a Prisma-backed
   * implementation.
   */
  readonly store?: IdempotencyStore
  /**
   * Clock function. Defaults to `Date.now`. Inject for tests that
   * need to advance time past the TTL.
   */
  readonly now?: () => number
}

export function withIdempotency(options: WithIdempotencyOptions = {}): (handler: RequestHandler) => RequestHandler {
  return function (handler: RequestHandler): RequestHandler {
    const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    const store = options.store ?? defaultStore
    const now = options.now ?? Date.now

    return async (req: Request, res: Response, next: NextFunction) => {
      const headerValue = req.headers[IDEMPOTENCY_HEADER]
      const key = Array.isArray(headerValue) ? headerValue[0] : headerValue
      if (!key) {
        return handler(req, res, next)
      }
      if (!key) {
        return handler(req, res, next)
      }

      const requestHash = hashRequestBody(req.body)
      const existing = store.get(key, now())
      if (existing) {
        if (existing.requestHash !== requestHash) {
          res.status(422).json({
            error: "Idempotency-Key reused with a different request body",
          })
          return
        }
        res.status(existing.statusCode).json(existing.body)
        return
      }

      const originalStatus = res.status.bind(res)
      const originalJson = res.json.bind(res)
      let capturedStatus = 200
      let capturedBody: unknown = null

      res.status = ((code: number) => {
        capturedStatus = code
        return originalStatus(code)
      }) as typeof res.status
      res.json = ((body: unknown) => {
        capturedBody = body
        return originalJson(body)
      }) as typeof res.json

      await handler(req, res, next)

      if (capturedStatus >= 200 && capturedStatus < 300) {
        store.set(key, {
          statusCode: capturedStatus,
          body: capturedBody,
          requestHash,
          expiresAt: now() + ttlMs,
        })
      }
    }
  }
}
