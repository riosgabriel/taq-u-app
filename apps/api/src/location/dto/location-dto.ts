import { Schema } from "effect"
import Location from "location/domain/location"

export class LocationCreateInput extends Schema.Class<LocationCreateInput>("location/LocationCreateInput")({
  name: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "name",
  }),
  address: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "address",
  }),
  latitude: Schema.Number.pipe(Schema.between(-90, 90)).annotations({
    required: true,
    identifier: "latitude",
  }),
  longitude: Schema.Number.pipe(Schema.between(-180, 180)).annotations({
    required: true,
    identifier: "longitude",
  }),
}) {}

export class LocationUpdateInput extends Schema.Class<LocationUpdateInput>("location/LocationUpdateInput")({
  name: Schema.optional(Schema.NonEmptyString),
  address: Schema.optional(Schema.NonEmptyString),
  latitude: Schema.optional(Schema.Number.pipe(Schema.between(-90, 90))),
  longitude: Schema.optional(Schema.Number.pipe(Schema.between(-180, 180))),
}) {}

export class LocationResponse extends Schema.Class<LocationResponse>("location/LocationResponse")({
  id: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
  address: Schema.NonEmptyString,
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
