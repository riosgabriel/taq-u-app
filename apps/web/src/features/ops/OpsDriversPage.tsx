import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, PageHeader } from "@/components/page"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ApiError } from "@/lib/api/client"
import { driverApi } from "@/lib/api/endpoints"
import type { Driver, DriverInput, VehicleType } from "@/lib/api/types"
import { humanize } from "@/lib/format"
import { errorMessage, queryKeys } from "@/lib/query"
import { ConfirmDialog } from "./ops-dialogs"

const VEHICLE_TYPES: VehicleType[] = ["CAR", "VAN", "TRUCK", "MOTORCYCLE", "BICYCLE", "ON_FOOT"]

const emptyForm: DriverInput = {
  name: "",
  email: "",
  phone: "",
  licenseNumber: "",
  vehicleType: "CAR",
  isAvailable: true,
}

// The API answers a bare 500 when the driver is still referenced by orders or deliveries.
function deleteErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status >= 500) {
    return "Couldn't delete this driver. They probably still have orders or deliveries assigned."
  }
  return errorMessage(error)
}

export function OpsDriversPage() {
  const queryClient = useQueryClient()
  const drivers = useQuery({ queryKey: queryKeys.drivers, queryFn: driverApi.list })

  const [search, setSearch] = useState("")
  const [availableOnly, setAvailableOnly] = useState(false)
  const [formTarget, setFormTarget] = useState<Driver | "new" | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null)

  const toggle = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => driverApi.update(id, { isAvailable }),
    onMutate: async ({ id, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.drivers })
      const previous = queryClient.getQueryData<Driver[]>(queryKeys.drivers)
      queryClient.setQueryData<Driver[]>(queryKeys.drivers, (list) =>
        list?.map((driver) => (driver.id === id ? { ...driver, isAvailable } : driver))
      )
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.drivers, context.previous)
      toast.error(errorMessage(error))
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.drivers }),
  })

  const remove = useMutation({
    mutationFn: (driver: Driver) => driverApi.remove(driver.id),
    onSuccess: () => {
      toast.success("Driver deleted")
      setDeleteTarget(null)
    },
    onError: (error) => toast.error(deleteErrorMessage(error)),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.drivers }),
  })

  const needle = search.trim().toLowerCase()
  const filtered = (drivers.data ?? []).filter((driver) => {
    if (availableOnly && !driver.isAvailable) return false
    return !needle || driver.name.toLowerCase().includes(needle) || driver.email.toLowerCase().includes(needle)
  })

  const availabilitySwitch = (driver: Driver) => (
    <Switch
      checked={driver.isAvailable}
      aria-label={`${driver.name} availability`}
      onCheckedChange={(isAvailable) => toggle.mutate({ id: driver.id, isAvailable })}
    />
  )

  const rowActions = (driver: Driver) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={`Edit ${driver.name}`} onClick={() => setFormTarget(driver)}>
        <Pencil />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${driver.name}`} onClick={() => setDeleteTarget(driver)}>
        <Trash2 />
      </Button>
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Drivers"
        description="Manage the driver roster and availability."
        actions={
          <Button onClick={() => setFormTarget("new")}>
            <Plus /> New driver
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Input
          aria-label="Search drivers"
          placeholder="Search name or email"
          className="w-full sm:w-72"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            id="available-only"
            checked={availableOnly}
            onCheckedChange={(checked) => setAvailableOnly(checked === true)}
          />
          <Label htmlFor="available-only">Available only</Label>
        </div>
      </div>

      {drivers.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : drivers.isError ? (
        <ErrorState error={drivers.error} onRetry={() => void drivers.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No drivers found"
          description={drivers.data.length ? "Try a different filter or search." : "Add the first driver."}
        />
      ) : (
        <>
          <div className="hidden rounded-md border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>{driver.phone}</TableCell>
                    <TableCell className="font-mono text-xs">{driver.licenseNumber}</TableCell>
                    <TableCell>{humanize(driver.vehicleType)}</TableCell>
                    <TableCell>{availabilitySwitch(driver)}</TableCell>
                    <TableCell>{rowActions(driver)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((driver) => (
              <Card key={driver.id}>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{driver.name}</p>
                    {availabilitySwitch(driver)}
                  </div>
                  <p className="break-all text-muted-foreground">{driver.email}</p>
                  <p>
                    {driver.phone} · {humanize(driver.vehicleType)} ·{" "}
                    <span className="font-mono text-xs">{driver.licenseNumber}</span>
                  </p>
                  {rowActions(driver)}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {formTarget && (
        <DriverFormDialog
          key={formTarget === "new" ? "new" : formTarget.id}
          driver={formTarget === "new" ? null : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title={`Delete ${deleteTarget.name}?`}
          description="This can't be undone. Drivers with orders or deliveries can't be deleted."
          confirmLabel="Delete driver"
          pending={remove.isPending}
          onConfirm={() => remove.mutate(deleteTarget)}
        />
      )}
    </div>
  )
}

function DriverFormDialog({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<DriverInput>(driver ? { ...driver } : emptyForm)
  const set = <K extends keyof DriverInput>(key: K, value: DriverInput[K]) => setForm((f) => ({ ...f, [key]: value }))

  const save = useMutation({
    mutationFn: (input: DriverInput) => (driver ? driverApi.update(driver.id, input) : driverApi.create(input)),
    onSuccess: () => {
      toast.success(driver ? "Driver updated" : "Driver created")
      onClose()
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.drivers }),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    save.mutate({ ...form, name: form.name.trim(), email: form.email.trim(), licenseNumber: form.licenseNumber.trim() })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form className="space-y-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{driver ? "Edit driver" : "New driver"}</DialogTitle>
            <DialogDescription>Contact, license and vehicle details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="driver-name">Name</Label>
            <Input id="driver-name" required value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driver-email">Email</Label>
              <Input
                id="driver-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-phone">Phone</Label>
              <Input
                id="driver-phone"
                type="tel"
                required
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-license">License number</Label>
              <Input
                id="driver-license"
                required
                value={form.licenseNumber}
                onChange={(e) => set("licenseNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="driver-vehicle">Vehicle type</Label>
              <Select value={form.vehicleType} onValueChange={(value) => set("vehicleType", value as VehicleType)}>
                <SelectTrigger id="driver-vehicle" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {humanize(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="driver-available"
              checked={form.isAvailable}
              onCheckedChange={(checked) => set("isAvailable", checked)}
            />
            <Label htmlFor="driver-available">Available for assignments</Label>
          </div>
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage(save.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
