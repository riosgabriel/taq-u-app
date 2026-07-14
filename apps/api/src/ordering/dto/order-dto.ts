import { OrderWithPackages } from "ordering/repository/order-repository"
import { Package as PrismaPackage } from "@prisma/client"
import { Schema } from "effect"

export class AddPackageInput extends Schema.Class<AddPackageInput>("order/AddPackageInput")({
  weightKg: Schema.Number.annotations({
    required: true,
    identifier: "weightKg",
  }),
  dimensions: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "dimensions",
  }),
  description: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "description",
  }),
  fragile: Schema.Boolean.annotations({
    required: true,
    default: false,
    identifier: "fragile",
  }),
  perishable: Schema.Boolean.annotations({
    required: true,
    default: false,
    identifier: "perishable",
  }),
  insured: Schema.Boolean.annotations({
    required: true,
    default: false,
    identifier: "insured",
  }),
}) {}

export class PackageStatusUpdateInput extends Schema.Class<PackageStatusUpdateInput>("order/PackageStatusUpdateInput")({
  status: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "status",
  }),
}) {}

export class PackageCreateInput extends Schema.Class<PackageCreateInput>("PackageCreateInput")({
  weightKg: Schema.Number.annotations({
    required: true,
    identifier: "weightKg",
  }),
  dimensions: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "dimensions",
  }),
  description: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "description",
  }),
  fragile: Schema.Boolean.annotations({
    required: true,
    default: false,
    identifier: "fragile",
  }),
  perishable: Schema.Boolean.annotations({
    required: true,
    default: false,
    identifier: "perishable",
  }),
  insured: Schema.Boolean.annotations({
    required: true,
    default: false,
    identifier: "insured",
  }),
}) {}

export class OrderCreateInput extends Schema.Class<OrderCreateInput>("OrderCreateInput")({
  customerId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "customerId",
  }),
  pickupAddress: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "pickupAddress",
  }),
  deliveryAddress: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "deliveryAddress",
  }),
  pickupDate: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "pickupDate",
  }),
  deliveryDate: Schema.NonEmptyString.annotations({
    required: false,
    identifier: "deliveryDate",
  }),
  specialInstructions: Schema.String.annotations({
    required: false,
    identifier: "specialInstructions",
  }),
  packages: Schema.Array(PackageCreateInput).annotations({
    required: true,
    identifier: "packages",
  }),
  priority: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "priority",
    default: "NORMAL",
  }),
}) {}

export class PackageResponse extends Schema.Class<PackageResponse>("order/PackageResponse")({
  id: Schema.NonEmptyString,
  weightKg: Schema.Number,
  dimensions: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  fragile: Schema.Boolean,
  perishable: Schema.Boolean,
  insured: Schema.Boolean,
  trackingNumber: Schema.NonEmptyString,
  status: Schema.String,
}) {
  static fromPackage(pkg: PrismaPackage): PackageResponse {
    return {
      id: pkg.id,
      weightKg: pkg.weightKg,
      dimensions: pkg.dimensions,
      description: pkg.description,
      fragile: pkg.fragile,
      perishable: pkg.perishable,
      insured: pkg.insured,
      trackingNumber: pkg.trackingNumber,
      status: pkg.status,
    }
  }
}

export class OrderResponse extends Schema.Class<OrderResponse>("OrderResponse")({
  id: Schema.NonEmptyString,
  pickupAddress: Schema.NonEmptyString,
  deliveryAddress: Schema.NonEmptyString,
  pickupDate: Schema.Date,
  deliveryDate: Schema.optional(Schema.Date),
  specialInstructions: Schema.optional(Schema.String),
  priority: Schema.String,
  status: Schema.String,
  packages: Schema.Array(PackageResponse),
}) {
  static fromOrderWithPackages(order: OrderWithPackages): OrderResponse {
    return {
      id: order.id,
      pickupAddress: order.pickupAddress,
      deliveryAddress: order.deliveryAddress,
      pickupDate: order.pickupDate,
      deliveryDate: order.deliveryDate || undefined,
      specialInstructions: order.specialInstructions || undefined,
      priority: order.priority,
      status: order.status,
      packages: order.packages.map((pkg) => PackageResponse.fromPackage(pkg)),
    }
  }
}

export class OrderUpdateInput extends Schema.Class<OrderUpdateInput>("OrderUpdateInput")({
  pickupAddress: Schema.NonEmptyString.annotations({
    required: false,
    identifier: "pickupAddress",
  }),
  deliveryAddress: Schema.NonEmptyString.annotations({
    required: false,
    identifier: "deliveryAddress",
  }),
  pickupDate: Schema.NonEmptyString.annotations({
    required: false,
    identifier: "pickupDate",
  }),
  deliveryDate: Schema.NonEmptyString.annotations({
    required: false,
    identifier: "deliveryDate",
  }),
  specialInstructions: Schema.String.annotations({
    required: false,
    identifier: "specialInstructions",
  }),
  priority: Schema.NonEmptyString.annotations({
    required: false,
    identifier: "priority",
  }),
}) {}
