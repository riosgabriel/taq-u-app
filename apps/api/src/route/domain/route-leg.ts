import { RouteLeg as PrismaRouteLeg, TransportMode } from "@prisma/client"
import { Schema } from "effect"

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
  id: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "id",
  }),
  routeId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "routeId",
  }),
  transportMode: TransportModeSchema.annotations({
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
  carrierId: Schema.NullishOr(Schema.String).annotations({
    identifier: "carrierId",
  }),
  startTime: Schema.NullishOr(Schema.Date).annotations({
    identifier: "startTime",
  }),
  endTime: Schema.NullishOr(Schema.Date).annotations({
    identifier: "endTime",
  }),
}) {
  /**
   * Trusted path: maps a Prisma row to a RouteLeg by direct field
   * assignment. Does NOT run Schema.decode, on purpose. The DB is
   * the source of truth for transportMode validity; every write
   * path (RouteLegCreateInput, AddRouteLegInput) decodes through
   * TransportModeSchema, so a row with an unknown mode should never
   * reach this method. If we ever need to defend against DB-side
   * corruption, the right place to add the decode is the DTOs (after
   * a fetch), not here (which would force every read path to handle
   * a validation failure). See the matching note in route-dto.ts.
   */
  static fromRouteLeg(leg: PrismaRouteLeg): RouteLeg {
    return {
      id: leg.id,
      routeId: leg.routeId,
      transportMode: leg.transportMode,
      pickupLocationId: leg.pickupLocationId,
      dropoffLocationId: leg.dropoffLocationId,
      carrierId: leg.carrierId,
      startTime: leg.startTime,
      endTime: leg.endTime,
    }
  }
}

export default RouteLeg
