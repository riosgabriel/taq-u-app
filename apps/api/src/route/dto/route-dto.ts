import { Schema } from "effect"
import { CarrierId, LocationId, RouteId, RouteLegId } from "@/ids"
import Route from "route/domain/route"
import RouteLeg, { TransportModeSchema } from "route/domain/route-leg"

/**
 * Response shape: a leg, as it comes back to the client. Uses the same
 * TransportModeSchema the domain and input DTOs use, so the literal
 * union is enforced end-to-end. A response containing an unknown
 * mode (e.g., from a botched migration) would be rejected at the
 * decode step in the runtime handler before reaching the client.
 */
export class RouteLegResponse extends Schema.Class<RouteLegResponse>("route/RouteLegResponse")({
  id: RouteLegId,
  routeId: RouteId,
  transportMode: TransportModeSchema,
  pickupLocationId: LocationId,
  dropoffLocationId: LocationId,
  carrierId: Schema.NullishOr(CarrierId),
  startTime: Schema.optional(Schema.Date),
  endTime: Schema.optional(Schema.Date),
}) {
  static fromRouteLeg(leg: RouteLeg): RouteLegResponse {
    return {
      id: leg.id,
      routeId: leg.routeId,
      transportMode: leg.transportMode,
      pickupLocationId: leg.pickupLocationId,
      dropoffLocationId: leg.dropoffLocationId,
      carrierId: leg.carrierId,
      startTime: leg.startTime ?? undefined,
      endTime: leg.endTime ?? undefined,
    }
  }
}

/**
 * Shared fields for any "create a leg" input. Both RouteLegCreateInput
 * (POST /api/routes body) and AddRouteLegInput (POST /api/routes/:id/legs)
 * extend this struct so a new field added here propagates to both.
 * This is the drift-proof alternative to duplicating the field list.
 */
const RouteLegFields = Schema.Struct({
  transportMode: TransportModeSchema.annotations({
    required: true,
    identifier: "transportMode",
  }),
  pickupLocationId: LocationId.annotations({
    required: true,
    identifier: "pickupLocationId",
  }),
  dropoffLocationId: LocationId.annotations({
    required: true,
    identifier: "dropoffLocationId",
  }),
  carrierId: Schema.optional(CarrierId),
  startTime: Schema.optional(Schema.Date),
  endTime: Schema.optional(Schema.Date),
})

export class RouteLegCreateInput extends Schema.Class<RouteLegCreateInput>("route/RouteLegCreateInput")(
  RouteLegFields
) {}

/**
 * Input for POST /api/routes/:id/legs. Distinct class identifier so
 * the runtime handler's error messages read "add_route_leg_input" not
 * "route_leg_create_input", but inherits all fields from the shared
 * RouteLegFields struct — no drift from RouteLegCreateInput.
 */
export class AddRouteLegInput extends Schema.Class<AddRouteLegInput>("route/AddRouteLegInput")(RouteLegFields) {}

export class RouteCreateInput extends Schema.Class<RouteCreateInput>("route/RouteCreateInput")({
  pickupId: LocationId.annotations({
    required: true,
    identifier: "pickupId",
  }),
  dropoffId: LocationId.annotations({
    required: true,
    identifier: "dropoffId",
  }),
  carrierId: Schema.optional(CarrierId),
  legs: Schema.optional(Schema.Array(RouteLegCreateInput)),
}) {}

export class RouteUpdateInput extends Schema.Class<RouteUpdateInput>("route/RouteUpdateInput")({
  pickupId: Schema.optional(LocationId),
  dropoffId: Schema.optional(LocationId),
  carrierId: Schema.optional(CarrierId),
}) {}

export class RouteResponse extends Schema.Class<RouteResponse>("route/RouteResponse")({
  id: RouteId,
  pickupId: LocationId,
  dropoffId: LocationId,
  carrierId: Schema.NullishOr(CarrierId),
  legs: Schema.Array(RouteLegResponse),
}) {
  static fromRoute(route: Route): RouteResponse {
    return {
      id: route.id,
      pickupId: route.pickupId,
      dropoffId: route.dropoffId,
      carrierId: route.carrierId,
      legs: route.legs.map(RouteLegResponse.fromRouteLeg),
    }
  }
}
