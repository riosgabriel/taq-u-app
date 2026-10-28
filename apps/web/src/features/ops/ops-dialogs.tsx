import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { humanize } from "@/lib/format"
import type { Driver } from "@/lib/api/types"

export function AssignDriverDialog({
  open,
  onOpenChange,
  title,
  drivers,
  pending,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  drivers: Driver[]
  pending: boolean
  onSubmit: (driverId: string) => void
}) {
  const [driverId, setDriverId] = useState("")
  const available = drivers.filter((driver) => driver.isAvailable)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (driverId) onSubmit(driverId)
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Only available drivers are listed. The server rejects drivers that became unavailable in the meantime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="assign-driver">Driver</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger id="assign-driver" className="w-full">
                <SelectValue placeholder={available.length ? "Select a driver" : "No available drivers"} />
              </SelectTrigger>
              <SelectContent>
                {available.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name} · {humanize(driver.vehicleType)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!driverId || pending}>
              {pending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep
          </Button>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending ? "Working..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
