import { RouteLeg as PrismaRouteLeg } from "@prisma/client"
import { Schema } from "effect"

export class RouteLeg extends Schema.Class<RouteLeg>("route/RouteLeg")({
  id: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "id",
  }),
  routeId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "routeId",
  }),
  transportMode: Schema.String.annotations({
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
