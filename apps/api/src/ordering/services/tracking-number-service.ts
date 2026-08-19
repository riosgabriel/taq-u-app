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
    // the DB @unique constraint is the collision guard; ~74 random bits make insert-time retry unnecessary.
    generate: () => uuidv7(),
  })
)

export type TrackingNumberServiceShape = Context.Tag.Service<TrackingNumberService>
