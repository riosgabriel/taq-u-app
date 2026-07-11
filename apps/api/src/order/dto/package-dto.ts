import Package from "@order/domain/package"
import { Schema } from "effect"

export class PackageCreateInput extends Schema.Class<PackageCreateInput>("order/PackageCreateInput")({
  orderId: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "orderId",
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

export class PackageResponse extends Schema.Class<PackageResponse>("order/PackageResponse")({
  id: Schema.NonEmptyString,
  orderId: Schema.String,
  weightKg: Schema.Number,
  dimensions: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  fragile: Schema.Boolean,
  perishable: Schema.Boolean,
  insured: Schema.Boolean,
  trackingNumber: Schema.NonEmptyString,
  status: Schema.String,
}) {
  static fromPackage(pkg: Package): PackageResponse {
    return {
      id: pkg.id,
      orderId: pkg.orderId,
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

export class PackageStatusUpdateInput extends Schema.Class<PackageStatusUpdateInput>("order/PackageStatusUpdateInput")({
  status: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "status",
  }),
}) {}
