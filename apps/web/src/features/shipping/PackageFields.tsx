import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PackageInput } from "@/lib/api/types"

export interface PackageDraft {
  key: number
  weightKg: string
  length: string
  width: string
  height: string
  description: string
  fragile: boolean
  perishable: boolean
  insured: boolean
}

export function emptyPackage(key: number): PackageDraft {
  return {
    key,
    weightKg: "",
    length: "",
    width: "",
    height: "",
    description: "",
    fragile: false,
    perishable: false,
    insured: false,
  }
}

export function toPackageInput(p: PackageDraft): PackageInput {
  return {
    weightKg: Number(p.weightKg),
    dimensions: `${p.length}x${p.width}x${p.height} cm`,
    description: p.description.trim(),
    fragile: p.fragile,
    perishable: p.perishable,
    insured: p.insured,
  }
}

const flags = [
  ["fragile", "Fragile"],
  ["perishable", "Perishable"],
  ["insured", "Insured"],
] as const

export function PackageFields({
  index,
  value,
  onChange,
  onRemove,
}: {
  index: number
  value: PackageDraft
  onChange: (next: PackageDraft) => void
  onRemove?: () => void
}) {
  const id = (name: string) => `pkg-${value.key}-${name}`
  const set = <K extends keyof PackageDraft>(key: K, v: PackageDraft[K]) => onChange({ ...value, [key]: v })

  return (
    <fieldset className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <legend className="px-1 text-sm font-medium">Package {index + 1}</legend>
        {onRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove package ${index + 1}`}>
            <Trash2 /> Remove
          </Button>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("description")}>Description</Label>
        <Input
          id={id("description")}
          value={value.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What's inside?"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={id("weight")}>Weight (kg)</Label>
          <Input
            id={id("weight")}
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={value.weightKg}
            onChange={(e) => set("weightKg", e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("length")}>Dimensions L × W × H (cm)</Label>
          <div className="flex items-center gap-1.5">
            {(
              [
                ["length", "Length"],
                ["width", "Width"],
                ["height", "Height"],
              ] as const
            ).map(([key, name], i) => (
              <div key={key} className="flex min-w-0 flex-1 items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground">×</span>}
                <Input
                  id={id(key)}
                  aria-label={name}
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="any"
                  value={value[key]}
                  onChange={(e) => set(key, e.target.value)}
                  required
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {flags.map(([key, name]) => (
          <div key={key} className="flex items-center gap-2">
            <Checkbox id={id(key)} checked={value[key]} onCheckedChange={(c) => set(key, c === true)} />
            <Label htmlFor={id(key)} className="font-normal">
              {name}
            </Label>
          </div>
        ))}
      </div>
    </fieldset>
  )
}
