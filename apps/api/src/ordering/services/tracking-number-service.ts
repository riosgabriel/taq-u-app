import { Context, Layer } from "effect"
import { v7 as uuidv7 } from "uuid"

export class TrackingNumberService extends Context.Tag("order/TrackingNumberService")<
  TrackingNumberService,
  { readonly generate: () => string }
>() {}

export const TrackingNumberServiceLive = Layer.succeed(
  TrackingNumberService,
  TrackingNumberService.of({
    // UUID v7 (RFC 9562): time-ordered and sortable. The findUnique pre-check is deliberately gone —
    // the DB @unique constraint is the collision guard, and the repository retries insert-time P2002
    // collisions on trackingNumber only (bounded).
    generate: () => uuidv7(),
  })
)

export type TrackingNumberServiceShape = Context.Tag.Service<TrackingNumberService>
