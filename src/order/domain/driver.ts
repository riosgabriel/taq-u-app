import { Driver as PrismaDriver } from "@prisma/client"
import { Schema } from "effect"

export class Driver extends Schema.Class<Driver>("order/Driver")({
  id: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "id",
  }),
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
  }),
}) {
  static fromDriver(driver: PrismaDriver): Driver {
    return {
      id: driver.id,
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber ?? "",
      vehicleType: driver.vehicleType,
      isAvailable: driver.isAvailable,
    }
  }
}

export default Driver
