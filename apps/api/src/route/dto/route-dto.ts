import { TransportMode } from "@prisma/client"
import { Schema } from "effect"
import Route from "route/domain/route"
import RouteLeg from "route/domain/route-leg"

export class RouteLegResponse extends Schema.Class<RouteLegResponse>("route/RouteLegResponse")({
  id: Schema.NonEmptyString,
  routeId: Schema.NonEmptyString,
  transportMode: Schema.String,
  pickupLocationId: Schema.NonEmptyString,
  dropoffLocationId: Schema.NonEmptyString,
  carrierId: Schema.String,
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
      carrierId: leg.carrierId ?? "",
      startTime: leg.startTime ?? undefined,
      endTime: leg.endTime ?? undefined,
    }
  }
}

export class RouteLegCreateInput extends Schema.Class<RouteLegCreateInput>("route/RouteLegCreateInput")({
  transportMode: Schema.Literal(
    TransportMode.TRUCK,
    TransportMode.AIRPLANE,
    TransportMode.TRAIN,
    TransportMode.BIKE,
    TransportMode.ON_FOOT
  ).annotations({
    required: true,
    identifier: "transportMode",
  }),
  pickupLocationId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "pickupLocationId",
  }),
  dropoffLocationId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "dropoffLocationId",
  }),
  carrierId: Schema.optional(Schema.NonEmptyString),
  startTime: Schema.optional(Schema.Date),
  endTime: Schema.optional(Schema.Date),
}) {}

export class RouteCreateInput extends Schema.Class<RouteCreateInput>("route/RouteCreateInput")({
  pickupId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "pickupId",
  }),
  dropoffId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "dropoffId",
  }),
  carrierId: Schema.optional(Schema.NonEmptyString),
  legs: Schema.optional(Schema.Array(RouteLegCreateInput)),
}) {}

export class RouteUpdateInput extends Schema.Class<RouteUpdateInput>("route/RouteUpdateInput")({
  pickupId: Schema.optional(Schema.NonEmptyString),
  dropoffId: Schema.optional(Schema.NonEmptyString),
  carrierId: Schema.optional(Schema.NonEmptyString),
}) {}

export class AddRouteLegInput extends Schema.Class<AddRouteLegInput>("route/AddRouteLegInput")({
  transportMode: Schema.Literal(
    TransportMode.TRUCK,
    TransportMode.AIRPLANE,
    TransportMode.TRAIN,
    TransportMode.BIKE,
    TransportMode.ON_FOOT
  ).annotations({
    required: true,
    identifier: "transportMode",
  }),
  pickupLocationId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "pickupLocationId",
  }),
  dropoffLocationId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "dropoffLocationId",
  }),
  carrierId: Schema.optional(Schema.NonEmptyString),
  startTime: Schema.optional(Schema.Date),
  endTime: Schema.optional(Schema.Date),
}) {}

export class RouteResponse extends Schema.Class<RouteResponse>("route/RouteResponse")({
  id: Schema.NonEmptyString,
  pickupId: Schema.NonEmptyString,
  dropoffId: Schema.NonEmptyString,
  carrierId: Schema.String,
  legs: Schema.Array(RouteLegResponse),
}) {
  static fromRoute(route: Route): RouteResponse {
    return {
      id: route.id,
      pickupId: route.pickupId,
      dropoffId: route.dropoffId,
      carrierId: route.carrierId ?? "",
      legs: route.legs.map(RouteLegResponse.fromRouteLeg),
    }
  }
}
