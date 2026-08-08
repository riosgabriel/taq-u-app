import { Package as PrismaPackage } from "@prisma/client"
import { Schema } from "effect"
import Customer from "customer/domain/customer"
import { CustomerId, OrderId, PackageId } from "@/ids"

export class Package extends Schema.Class<Package>("order/Package")({
  id: PackageId.annotations({
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
      id: Schema.decodeSync(PackageId)(pkg.id),
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
  id: OrderId,
  customerId: CustomerId,
  customer: Customer,
  packages: Schema.Array(Package),
}) {}

export default Order
