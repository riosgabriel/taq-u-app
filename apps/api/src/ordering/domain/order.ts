import { Package as PrismaPackage } from "@prisma/client"
import { Schema } from "effect"
import Customer from "customer/domain/customer"

export class Package extends Schema.Class<Package>("order/Package")({
  id: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "id",
  }),
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
    identifier: "fragile",
  }),
  perishable: Schema.Boolean.annotations({
    required: true,
    identifier: "perishable",
  }),
  insured: Schema.Boolean.annotations({
    required: true,
    identifier: "insured",
  }),
  trackingNumber: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "trackingNumber",
  }),
  status: Schema.String.annotations({
    required: true,
    identifier: "status",
  }),
}) {
  static fromPackage(pkg: PrismaPackage): Package {
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

export class Order extends Schema.Class<Order>("Order")({
  id: Schema.String,
  customerId: Schema.String,
  customer: Customer,
  packages: Schema.Array(Package),
}) {}

export default Order
