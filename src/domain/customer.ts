import { Schema } from "effect"

class Customer extends Schema.Class<Customer>("Customer")({
  id: Schema.String,
  name: Schema.NonEmptyString,
  email: Schema.NonEmptyString,
  phone: Schema.NullishOr(Schema.String),
  address: Schema.NonEmptyString,
}) {}

export default Customer
