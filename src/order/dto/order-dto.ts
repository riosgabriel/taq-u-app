import { Schema } from "effect";
import Customer from "@order/domain/customer";
import { Package } from "@prisma/client";
import { OrderWithPackages } from "@order/repository/order-repository";

export class PackageCreateInput extends Schema.Class<PackageCreateInput>("PackageCreateInput")({
    weightKg: Schema.Number,
    dimensions: Schema.NonEmptyString,
    description: Schema.NonEmptyString,
    fragile: Schema.Boolean,
    perishable: Schema.Boolean,
    insured: Schema.Boolean,
}) {}

export class OrderCreateInput extends Schema.Class<OrderCreateInput>("OrderCreateInput")({
    customer: Customer,
    pickupAddress: Schema.NonEmptyString,
    deliveryAddress: Schema.NonEmptyString,
    pickupDate: Schema.NonEmptyString,
    deliveryDate: Schema.NonEmptyString,
    specialInstructions: Schema.String,
    priority: Schema.String, // TODO: create a enum
    packages: Schema.Array(PackageCreateInput),
  }) {
}

export class PackageResponse extends Schema.Class<PackageResponse>("PackageResponse")({
  id: Schema.NonEmptyString,
  weightKg: Schema.Number,
  dimensions: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  fragile: Schema.Boolean,
  perishable: Schema.Boolean,
  insured: Schema.Boolean,
}) {
  static fromPackage(pkg: Package): PackageResponse {
    return {
      id: pkg.id,
      weightKg: pkg.weightKg,
      dimensions: pkg.dimensions,
      description: pkg.description,
      fragile: pkg.fragile,
      perishable: pkg.perishable,
      insured: pkg.insured,
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
  packages: Schema.Array(PackageResponse),
}) {
  static fromCustomer(order: OrderWithPackages): OrderResponse {
    return {
      id: order.id,
      pickupAddress: order.pickupAddress,
      deliveryAddress: order.deliveryAddress,
      pickupDate: order.pickupDate,
      deliveryDate: order.deliveryDate || undefined,
      specialInstructions: order.specialInstructions || undefined,
      priority: order.priority,
      packages: order.packages.map(pkg => PackageResponse.fromPackage(pkg)),
    }
  }
}