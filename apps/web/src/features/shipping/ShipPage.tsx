import { useState } from "react"
import type { FormEvent } from "react"
import { useNavigate } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { addressApi, orderApi } from "@/lib/api/endpoints"
import type { OrderPriority, ServiceLevel } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import { errorMessage, queryKeys } from "@/lib/query"
import { AddressField } from "./AddressField"
import { NativeSelect } from "./NativeSelect"
import { emptyPackage, PackageFields, toPackageInput } from "./PackageFields"
import type { PackageDraft } from "./PackageFields"
import { QuoteCard } from "./QuoteCard"
import { useDebouncedValue } from "./use-debounced-value"

const priorities: OrderPriority[] = ["LOW", "STANDARD", "HIGH", "URGENT"]

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function tomorrowAtNine(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return toLocalInput(d)
}

export function ShipPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addresses = useQuery({ queryKey: queryKeys.addresses, queryFn: addressApi.list })
  const saved = addresses.data ?? []

  const [pickupInput, setPickupInput] = useState<string | null>(null)
  const [delivery, setDelivery] = useState("")
  const [pickupDate, setPickupDate] = useState(tomorrowAtNine)
  const [deliveryDate, setDeliveryDate] = useState("")
  const [priority, setPriority] = useState<OrderPriority>("STANDARD")
  const [instructions, setInstructions] = useState("")
  const [packages, setPackages] = useState<PackageDraft[]>([emptyPackage(0)])
  const [nextKey, setNextKey] = useState(1)
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>("STANDARD")
  const [formError, setFormError] = useState<string | null>(null)

  const pickup = pickupInput ?? saved.find((a) => a.isDefault)?.address ?? ""

  const totalWeight = packages.reduce((sum, p) => sum + (Number(p.weightKg) || 0), 0)
  const quoteInput = useDebouncedValue(
    totalWeight > 0
      ? { weightKg: Math.round(totalWeight * 100) / 100, insured: packages.some((p) => p.insured) }
      : null,
    400
  )
  const stableQuoteInput = quoteInput && totalWeight > 0 ? quoteInput : null

  const create = useMutation({
    mutationFn: orderApi.createMine,
    onSuccess: (order) => {
      const numbers = order.packages.map((p) => p.trackingNumber).join(", ")
      toast.success(`Order created. Tracking: ${numbers}`)
      void queryClient.invalidateQueries({ queryKey: ["orders"] })
      navigate(`/orders/${order.id}`)
    },
    onError: (err) => {
      const message = errorMessage(err)
      if (err instanceof ApiError && err.status === 400) setFormError(message)
      else toast.error(message)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const pickupAt = new Date(pickupDate)
    if (!(pickupAt.getTime() > Date.now())) {
      setFormError("Pickup date must be in the future.")
      return
    }
    const deliveryAt = deliveryDate ? new Date(deliveryDate) : null
    if (deliveryAt && deliveryAt <= pickupAt) {
      setFormError("Delivery date must be after the pickup date.")
      return
    }
    create.mutate({
      pickupAddress: pickup.trim(),
      deliveryAddress: delivery.trim(),
      pickupDate: pickupAt.toISOString(),
      ...(deliveryAt ? { deliveryDate: deliveryAt.toISOString() } : {}),
      ...(instructions.trim() ? { specialInstructions: instructions.trim() } : {}),
      priority,
      packages: packages.map(toPackageInput),
    })
  }

  function addPackage() {
    setPackages((prev) => [...prev, emptyPackage(nextKey)])
    setNextKey((k) => k + 1)
  }

  return (
    <div>
      <PageHeader title="Ship a package" description="Create a new order and get tracking numbers instantly." />
      <form onSubmit={onSubmit} className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <section className="space-y-4">
            <AddressField
              id="pickup-address"
              label="Pickup address"
              value={pickup}
              onChange={setPickupInput}
              saved={saved}
            />
            <AddressField
              id="delivery-address"
              label="Delivery address"
              value={delivery}
              onChange={setDelivery}
              saved={saved}
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pickup-date">Pickup date</Label>
              <Input
                id="pickup-date"
                type="datetime-local"
                min={toLocalInput(new Date())}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-date">Delivery date (optional)</Label>
              <Input
                id="delivery-date"
                type="datetime-local"
                min={pickupDate}
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <NativeSelect
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as OrderPriority)}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </section>

          <div className="space-y-2">
            <Label htmlFor="instructions">Special instructions (optional)</Label>
            <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Packages</h2>
            {packages.map((pkg, i) => (
              <PackageFields
                key={pkg.key}
                index={i}
                value={pkg}
                onChange={(next) => setPackages((prev) => prev.map((p) => (p.key === pkg.key ? next : p)))}
                onRemove={
                  packages.length > 1 ? () => setPackages((prev) => prev.filter((p) => p.key !== pkg.key)) : undefined
                }
              />
            ))}
            <Button type="button" variant="outline" onClick={addPackage}>
              <Plus /> Add another package
            </Button>
          </section>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" size="lg" disabled={create.isPending} className="w-full sm:w-auto">
            {create.isPending ? "Creating order…" : "Create order"}
          </Button>
        </div>

        <QuoteCard input={stableQuoteInput} serviceLevel={serviceLevel} onServiceLevelChange={setServiceLevel} />
      </form>
    </div>
  )
}
