import { Schema } from "effect"
import Customer from "./customer"

class Package extends Schema.Class<Package>("Package")({
  id: Schema.String,
  weightKg: Schema.Number,
  dimensions: Schema.NonEmptyString,
  description: Schema.NonEmptyString,
  fragile: Schema.Boolean,
  perishable: Schema.Boolean,
  insured: Schema.Boolean,
}) {}

class Order extends Schema.Class<Order>("Order")({
  id: Schema.String,
  customerId: Schema.String,
  customer: Customer,
  packages: Schema.Array(Package),
}) {}

export default Order
