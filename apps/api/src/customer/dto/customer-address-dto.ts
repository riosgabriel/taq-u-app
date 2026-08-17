import { CustomerAddress } from "customer/domain/customer-address"
import { CustomerAddressId } from "@/ids"
import { Schema } from "effect"

export class CreateAddressInput extends Schema.Class<CreateAddressInput>("customer/CreateAddressInput")({
  label: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "label",
  }),
  address: Schema.NonEmptyString.annotations({
    required: true,
    identifier: "address",
  }),
  isDefault: Schema.optional(Schema.Boolean).annotations({
    required: false,
    identifier: "isDefault",
  }),
}) {}

export class UpdateAddressInput extends Schema.Class<UpdateAddressInput>("customer/UpdateAddressInput")({
  label: Schema.optional(Schema.NonEmptyString).annotations({
    required: false,
    identifier: "label",
  }),
  address: Schema.optional(Schema.NonEmptyString).annotations({
    required: false,
    identifier: "address",
  }),
  isDefault: Schema.optional(Schema.Boolean).annotations({
    required: false,
    identifier: "isDefault",
  }),
}) {}

const hasAtLeastOneField = (input: {
  readonly label?: string
  readonly address?: string
  readonly isDefault?: boolean
}): boolean => input.label !== undefined || input.address !== undefined || input.isDefault !== undefined

export const UpdateAddressInputSchema = UpdateAddressInput.pipe(
  Schema.filter(hasAtLeastOneField, {
    message: () => "at least one field must be provided",
  })
)

export class CustomerAddressResponse extends Schema.Class<CustomerAddressResponse>("customer/CustomerAddressResponse")({
  id: CustomerAddressId,
  label: Schema.NonEmptyString,
  address: Schema.NonEmptyString,
  isDefault: Schema.Boolean,
}) {
  static fromEntity(address: CustomerAddress): CustomerAddressResponse {
    return {
      id: address.id,
      label: address.label,
      address: address.address,
      isDefault: address.isDefault,
    }
  }
}
