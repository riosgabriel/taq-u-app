import { Schema } from "effect"
import Driver from "delivery/domain/driver"

interface DriverOrderPackage {
  readonly id: string
  readonly description: string
  readonly weightKg: number
  readonly dimensions: string
  readonly fragile: boolean
  readonly perishable: boolean
  readonly insured: boolean
  readonly trackingNumber: string
  readonly status: string
}

interface DriverOrder {
  readonly id: string
  readonly pickupAddress: string
  readonly deliveryAddress: string
  readonly pickupDate: Date
  readonly deliveryDate: Date | null
  readonly specialInstructions: string | null
  readonly status: string
  readonly packages: ReadonlyArray<DriverOrderPackage>
}

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

export class DriverUpdateInput extends Schema.Class<DriverUpdateInput>("order/DriverUpdateInput")({
  name: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  phone: Schema.optional(Schema.String),
  licenseNumber: Schema.optional(Schema.String),
  vehicleType: Schema.optional(Schema.String),
  isAvailable: Schema.optional(Schema.Boolean),
}) {}

class DriverPackageView extends Schema.Class<DriverPackageView>("delivery/DriverPackageView")({
  id: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  weightKg: Schema.Number,
  dimensions: Schema.String,
  fragile: Schema.Boolean,
  perishable: Schema.Boolean,
  insured: Schema.Boolean,
  trackingNumber: Schema.NonEmptyString,
  status: Schema.String,
}) {
  static fromPackage(pkg: DriverOrderPackage): DriverPackageView {
    return new DriverPackageView({
      id: pkg.id,
      description: pkg.description,
      weightKg: pkg.weightKg,
      dimensions: pkg.dimensions,
      fragile: pkg.fragile,
      perishable: pkg.perishable,
      insured: pkg.insured,
      trackingNumber: pkg.trackingNumber,
      status: pkg.status,
    })
  }
}

export class DriverOrderResponse extends Schema.Class<DriverOrderResponse>("delivery/DriverOrderResponse")({
  id: Schema.NonEmptyString,
  pickupAddress: Schema.NonEmptyString,
  deliveryAddress: Schema.NonEmptyString,
  pickupDate: Schema.Date,
  deliveryDate: Schema.optional(Schema.Date),
  specialInstructions: Schema.optional(Schema.String),
  status: Schema.String,
  packages: Schema.Array(DriverPackageView),
}) {
  static fromOrderWithPackages(order: DriverOrder): DriverOrderResponse {
    return new DriverOrderResponse({
      id: order.id,
      pickupAddress: order.pickupAddress,
      deliveryAddress: order.deliveryAddress,
      pickupDate: order.pickupDate,
      deliveryDate: order.deliveryDate ?? undefined,
      specialInstructions: order.specialInstructions ?? undefined,
      status: order.status,
      packages: order.packages.map(DriverPackageView.fromPackage),
    })
  }
}
