import { Latitude, Location, Longitude } from "location/domain/location"
import { Schema } from "effect"

// The latitude / longitude fields import the same schemas the domain
// model uses, so a future change to the valid range moves both layers
// together — the DTOs cannot drift to a wider or narrower range than
// the domain.
//
// CAVEAT: the domain's static factory Location.fromLocation does NOT
// run Schema.decode on its Prisma row — it trusts the DB. The bounds
// are therefore enforced on every write path (HTTP body, DTO decode)
// but not on every read path. A row with latitude=200 in the DB would
// round-trip through fromLocation as an invalid Location and the
// service layer would happily surface it. This matches the
// Driver.fromDriver / Delivery.fromDelivery pattern in this codebase:
// the DB is treated as the source of truth for coordinate validity.
// If we ever need to defend against DB-side corruption (e.g., a botched
// migration), the right place to add the decode is here in the DTO
// after a fetch, not in fromLocation (which would force every read
// path to handle a validation failure).

export class LocationCreateInput extends Schema.Class<LocationCreateInput>("location/LocationCreateInput")({
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
}) {}

export class LocationUpdateInput extends Schema.Class<LocationUpdateInput>("location/LocationUpdateInput")({
  name: Schema.optional(Schema.NonEmptyString),
  address: Schema.optional(Schema.NonEmptyString),
  latitude: Schema.optional(Latitude),
  longitude: Schema.optional(Longitude),
}) {}

export class LocationResponse extends Schema.Class<LocationResponse>("location/LocationResponse")({
  id: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  address: Schema.NonEmptyString,
  // The response intentionally uses plain Number. A response is data
  // being read out; validating the response's coordinates would be a
  // no-op (the data came from a Location that was already validated).
  // The domain is where the invariant lives; the response trusts it.
  latitude: Schema.Number,
  longitude: Schema.Number,
}) {
  static fromLocation(location: Location): LocationResponse {
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    }
  }
}
