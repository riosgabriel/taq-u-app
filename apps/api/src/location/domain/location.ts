import { Location as PrismaLocation } from "@prisma/client"
import { Schema } from "effect"
import { LocationId } from "@/ids"

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
  id: LocationId.annotations({
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
  /**
   * Trusted path: maps a Prisma row to a Location by direct field
   * assignment. Does NOT run Schema.decode, on purpose. The DB is
   * the source of truth for coordinate validity; every write path
   * (the create / update DTOs) decodes through the schema, so a row
   * with latitude outside [-90, 90] should never reach this method.
   * If we ever need to defend against DB-side corruption, the right
   * place to add Schema.decode is the DTOs (after a fetch), not here
   * (which would force every read path to handle a validation
   * failure). See the matching note in location-dto.ts.
   */
  static fromLocation(location: PrismaLocation): Location {
    return {
      id: Schema.decodeSync(LocationId)(location.id),
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    }
  }
}

export default Location
