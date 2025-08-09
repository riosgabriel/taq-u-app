import { Schema } from "effect";
import Customer from "@order/domain/customer";

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