import { Location as PrismaLocation } from "@prisma/client"
import { Schema } from "effect"

export class Location extends Schema.Class<Location>("location/Location")({
  id: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "id",
  }),
  name: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "name",
  }),
  address: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "address",
  }),
  latitude: Schema.Number.annotations({
    required: true,
    identifier: "latitude",
  }),
  longitude: Schema.Number.annotations({
    required: true,
    identifier: "longitude",
  }),
}) {
  static fromLocation(location: PrismaLocation): Location {
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    }
  }
}

export default Location
