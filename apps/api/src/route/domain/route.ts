import { Prisma } from "@prisma/client"
import { Schema } from "effect"
import RouteLeg from "route/domain/route-leg"

const RouteWithLegs = Prisma.validator<Prisma.RouteDefaultArgs>()({
  include: { legs: true },
})

export type RouteWithLegs = Prisma.RouteGetPayload<typeof RouteWithLegs>

export class Route extends Schema.Class<Route>("route/Route")({
  id: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "id",
  }),
  pickupId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "pickupId",
  }),
  dropoffId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "dropoffId",
  }),
  carrierId: Schema.NullishOr(Schema.String).annotations({
    identifier: "carrierId",
  }),
  legs: Schema.Array(RouteLeg),
}) {
  static fromRoute(route: RouteWithLegs): Route {
    return {
      id: route.id,
      pickupId: route.pickupId,
      dropoffId: route.dropoffId,
      carrierId: route.carrierId,
      legs: route.legs.map((leg) => RouteLeg.fromRouteLeg(leg)),
    }
  }
}

export default Route
