import { Location as PrismaLocation } from "@prisma/client"
import { Schema } from "effect"

/**
 * The latitude invariant: a valid Earth latitude is in [-90, 90].
 * Defined once here so the domain model and every DTO that composes
 * from it cannot drift. Any consumer that decodes a `Location` from
 * untrusted input (HTTP body, DB row via Schema.decode, test fixture)
 * is rejected if the latitude is out of range.
 */
export const Latitude = Schema.Number.pipe(Schema.between(-90, 90))

/**
 * The longitude invariant: a valid Earth longitude is in [-180, 180].
 * Same rationale as Latitude — single source of truth.
 */
export const Longitude = Schema.Number.pipe(Schema.between(-180, 180))

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
  latitude: Latitude.annotations({
    required: true,
    identifier: "latitude",
  }),
  longitude: Longitude.annotations({
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
