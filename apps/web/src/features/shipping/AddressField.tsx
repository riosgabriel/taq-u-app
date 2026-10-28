import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CustomerAddress } from "@/lib/api/types"
import { NativeSelect } from "./NativeSelect"

const CUSTOM = "__custom__"

export function AddressField({
  id,
  label,
  value,
  onChange,
  saved,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  saved: CustomerAddress[]
}) {
  const selected = saved.find((a) => a.address === value)?.id ?? CUSTOM
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {saved.length > 0 && (
        <NativeSelect
          aria-label={`${label}: saved addresses`}
          value={selected}
          onChange={(e) => {
            const address = saved.find((a) => a.id === e.target.value)
            if (address) onChange(address.address)
            else onChange("")
          }}
        >
          <option value={CUSTOM}>Type a different address</option>
          {saved.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
              {a.isDefault ? " (default)" : ""}
            </option>
          ))}
        </NativeSelect>
      )}
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Street, number, city"
        required
      />
    </div>
  )
}
