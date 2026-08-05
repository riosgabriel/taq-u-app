import { Prisma } from "@prisma/client"
import { Schema } from "effect"
import { CarrierId, LocationId, RouteId } from "@/ids"
import RouteLeg from "route/domain/route-leg"

const RouteWithLegs = Prisma.validator<Prisma.RouteDefaultArgs>()({
  include: { legs: true },
})

export type RouteWithLegs = Prisma.RouteGetPayload<typeof RouteWithLegs>

export class Route extends Schema.Class<Route>("route/Route")({
  id: RouteId,
  pickupId: LocationId,
  dropoffId: LocationId,
  carrierId: Schema.NullishOr(CarrierId),
  legs: Schema.Array(RouteLeg),
}) {
  static fromRoute(route: RouteWithLegs): Route {
    return {
      id: Schema.decodeSync(RouteId)(route.id),
      pickupId: Schema.decodeSync(LocationId)(route.pickupId),
      dropoffId: Schema.decodeSync(LocationId)(route.dropoffId),
      carrierId: route.carrierId ? Schema.decodeSync(CarrierId)(route.carrierId) : null,
      legs: route.legs.map((leg) => RouteLeg.fromRouteLeg(leg)),
    }
  }
}

export default Route
