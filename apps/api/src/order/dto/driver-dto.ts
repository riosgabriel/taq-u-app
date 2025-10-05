import { Schema } from "effect"
import Driver from "order/domain/driver"

export class DriverCreateInput extends Schema.Class<DriverCreateInput>("order/DriverCreateInput")({
  name: Schema.String.annotations({
    required: true,
    identifier: "name",
  }),
  email: Schema.String.annotations({
    required: true,
    identifier: "email",
  }),
  phone: Schema.String.annotations({
    required: true,
    identifier: "phone",
  }),
  licenseNumber: Schema.String.annotations({
    required: true,
    identifier: "licenseNumber",
  }),
  vehicleType: Schema.String.annotations({
    required: true,
    identifier: "vehicleType",
  }),
  isAvailable: Schema.Boolean.annotations({
    required: true,
    identifier: "isAvailable",
    default: true,
  }),
}) {}

export class DriverResponse extends Schema.Class<DriverResponse>("DriverResponse")({
  id: Schema.NonEmptyString,
  name: Schema.String,
  email: Schema.String,
  phone: Schema.String,
  licenseNumber: Schema.String,
  vehicleType: Schema.String,
  isAvailable: Schema.Boolean,
}) {
  static fromDriver(driver: Driver): DriverResponse {
    return {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      vehicleType: driver.vehicleType,
      isAvailable: driver.isAvailable,
    }
  }
}
