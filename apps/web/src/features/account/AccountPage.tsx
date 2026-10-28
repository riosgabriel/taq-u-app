import { useState } from "react"
import type { FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, NotYetAvailable, PageHeader } from "@/components/page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { useCurrentCustomer } from "@/features/auth/use-auth"
import { addressApi } from "@/lib/api/endpoints"
import type { CustomerAddress } from "@/lib/api/types"
import { errorMessage, queryKeys } from "@/lib/query"

export function AccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Your profile and saved addresses." />
      <ProfileCard />
      <AddressesCard />
    </div>
  )
}

function ProfileCard() {
  const { customer } = useCurrentCustomer()
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {customer ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-0.5">{customer.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-0.5 break-all">{customer.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="mt-0.5">{customer.phone || "—"}</dd>
            </div>
          </dl>
        ) : (
          <Skeleton className="h-10 w-full" />
        )}
        <NotYetAvailable>Editing your profile isn't supported yet.</NotYetAvailable>
      </CardContent>
    </Card>
  )
}

function AddressesCard() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<CustomerAddress | "new" | null>(null)
  const [deleting, setDeleting] = useState<CustomerAddress | null>(null)
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.addresses,
    queryFn: addressApi.list,
  })

  const makeDefault = useMutation({
    mutationFn: (id: string) => addressApi.update(id, { isDefault: true }),
    onSuccess: () => toast.success("Default address updated"),
    onError: (err) => toast.error(errorMessage(err)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses }),
  })

  const addresses = data ? [...data].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)) : []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Saved addresses</CardTitle>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> Add address
        </Button>
      </CardHeader>
      <CardContent>
        {isPending && <Skeleton className="h-20 w-full" />}
        {isError && <ErrorState error={error} onRetry={() => void refetch()} />}
        {data && data.length === 0 && (
          <EmptyState
            title="No saved addresses"
            description="Save the places you ship from and to often, and they'll be one click away when you create an order."
            action={<Button onClick={() => setEditing("new")}>Add your first address</Button>}
          />
        )}
        {addresses.length > 0 && (
          <ul className="divide-y">
            {addresses.map((address) => (
              <li key={address.id} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{address.label}</span>
                    {address.isDefault && <Badge>Default</Badge>}
                  </div>
                  <p className="text-sm break-words text-muted-foreground">{address.address}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!address.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={makeDefault.isPending}
                      onClick={() => makeDefault.mutate(address.id)}
                    >
                      <Star /> Make default
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${address.label}`}
                    onClick={() => setEditing(address)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${address.label}`}
                    onClick={() => setDeleting(address)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AddressDialog
        key={editing === null ? "closed" : editing === "new" ? "new" : editing.id}
        address={editing === "new" ? null : editing}
        isFirst={addresses.length === 0}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <DeleteDialog address={deleting} onOpenChange={(open) => !open && setDeleting(null)} />
    </Card>
  )
}

function AddressDialog({
  address,
  isFirst,
  open,
  onOpenChange,
}: {
  address: CustomerAddress | null
  isFirst: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [label, setLabel] = useState(address?.label ?? "")
  const [value, setValue] = useState(address?.address ?? "")
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? isFirst)

  const mutation = useMutation({
    mutationFn: () => {
      const input = { label, address: value, isDefault }
      return address ? addressApi.update(address.id, input) : addressApi.create(input)
    },
    onSuccess: () => {
      toast.success(address ? "Address updated" : "Address added")
      onOpenChange(false)
    },
    onError: (err) => toast.error(errorMessage(err)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses }),
  })

  function submit(event: FormEvent) {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{address ? "Edit address" : "Add address"}</DialogTitle>
            <DialogDescription>Saved addresses can be picked when you ship a package.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="address-label">Label</Label>
            <Input
              id="address-label"
              required
              placeholder="Home, Office…"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address-value">Address</Label>
            <Input id="address-value" required value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="address-default"
              checked={isDefault}
              onCheckedChange={(checked) => setIsDefault(checked === true)}
            />
            <Label htmlFor="address-default">Use as my default address</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({
  address,
  onOpenChange,
}: {
  address: CustomerAddress | null
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (id: string) => addressApi.remove(id),
    onSuccess: () => {
      toast.success("Address deleted")
      onOpenChange(false)
    },
    onError: (err) => toast.error(errorMessage(err)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.addresses }),
  })
  return (
    <Dialog open={address !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this address?</DialogTitle>
          <DialogDescription>
            {address ? `"${address.label}" will be removed from your saved addresses.` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep
          </Button>
          <Button
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => address && mutation.mutate(address.id)}
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
