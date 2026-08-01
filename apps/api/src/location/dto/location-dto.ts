import { Latitude, Location, Longitude } from "location/domain/location"
import { Schema } from "effect"

// The latitude / longitude fields import the same schemas the domain
// model uses. If a future change widens or narrows the valid range,
// both layers move together — there is no DTO that silently accepts
// a value the domain would reject.

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
