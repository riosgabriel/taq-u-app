import { RouteLeg as PrismaRouteLeg, TransportMode } from "@prisma/client"
import { Schema } from "effect"
import { CarrierId, LocationId, RouteId, RouteLegId } from "@/ids"

/**
 * The single source of truth for the valid transportMode values.
 * Exported so the domain class, the response DTO, and both leg input
 * DTOs all use the same literal union. A new TransportMode value
 * added to the Prisma schema is a one-line change here that
 * propagates to every layer.
 */
export const TransportModeSchema = Schema.Literal(
  TransportMode.TRUCK,
  TransportMode.AIRPLANE,
  TransportMode.TRAIN,
  TransportMode.BIKE,
  TransportMode.ON_FOOT
)

export class RouteLeg extends Schema.Class<RouteLeg>("route/RouteLeg")({
  id: RouteLegId,
  routeId: RouteId,
  transportMode: TransportModeSchema,
  pickupLocationId: LocationId,
  dropoffLocationId: LocationId,
  carrierId: Schema.NullishOr(CarrierId),
  startTime: Schema.NullishOr(Schema.Date),
  endTime: Schema.NullishOr(Schema.Date),
}) {
  static fromRouteLeg(leg: PrismaRouteLeg): RouteLeg {
    return {
      id: Schema.decodeSync(RouteLegId)(leg.id),
      routeId: Schema.decodeSync(RouteId)(leg.routeId),
      transportMode: leg.transportMode,
      pickupLocationId: Schema.decodeSync(LocationId)(leg.pickupLocationId),
      dropoffLocationId: Schema.decodeSync(LocationId)(leg.dropoffLocationId),
      carrierId: leg.carrierId ? Schema.decodeSync(CarrierId)(leg.carrierId) : null,
      startTime: leg.startTime,
      endTime: leg.endTime,
    }
  }
}

export default RouteLeg
