import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import type { CustomerAddressResponse } from "@/types/customer"

export function AccountDashboard() {
  const { customer, logout } = useAuth()
  const [addresses, setAddresses] = useState<CustomerAddressResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel] = useState("")
  const [address, setAddress] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadAddresses = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.getMyAddresses()
      setAddresses(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load addresses")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAddresses()
  }, [loadAddresses])

  const startAdd = () => {
    setIsEditing(true)
    setEditingId(null)
    setLabel("")
    setAddress("")
    setIsDefault(false)
  }

  const startEdit = (item: CustomerAddressResponse) => {
    setIsEditing(true)
    setEditingId(item.id)
    setLabel(item.label)
    setAddress(item.address)
    setIsDefault(item.isDefault)
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditingId(null)
    setLabel("")
    setAddress("")
    setIsDefault(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!label.trim() || !address.trim()) {
      toast.error("Label and address are required")
      return
    }

    setIsSaving(true)
    try {
      if (editingId) {
        await api.updateAddress(editingId, {
          label: label.trim(),
          address: address.trim(),
          isDefault,
        })
        toast.success("Address updated")
      } else {
        await api.createAddress({ label: label.trim(), address: address.trim(), isDefault })
        toast.success("Address added")
      }
      await loadAddresses()
      cancelEdit()
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error("Address not found")
      } else {
        toast.error(err instanceof Error ? err.message : "Could not save address")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return

    try {
      await api.deleteAddress(id)
      toast.success("Address deleted")
      loadAddresses()
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error("Address not found")
      } else {
        toast.error(err instanceof Error ? err.message : "Could not delete address")
      }
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await api.updateAddress(id, { isDefault: true })
      toast.success("Default address updated")
      loadAddresses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update default address")
    }
  }

  if (!customer) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sign in to view your account</h3>
        <p className="text-gray-600">Your profile and address book are available after signing in</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Account</h2>
        <p className="text-gray-600">Manage your profile and saved addresses</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Profile</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Name</dt>
                <dd className="font-medium text-gray-900">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Email</dt>
                <dd className="font-medium text-gray-900">{customer.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Phone</dt>
                <dd className="font-medium text-gray-900">{customer.phone || "—"}</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={logout}
              className="mt-6 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-white transition-colors text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Address Book */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Address Book</h3>
              {!isEditing && (
                <button
                  type="button"
                  onClick={startAdd}
                  className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 transition-colors"
                >
                  Add address
                </button>
              )}
            </div>

            {isEditing && (
              <form onSubmit={handleSave} className="mb-6 bg-white border border-gray-200 rounded-lg p-4 space-y-4">
                <div>
                  <label htmlFor="address-label" className="block text-sm font-medium text-gray-700 mb-2">
                    Label
                  </label>
                  <input
                    id="address-label"
                    type="text"
                    required
                    placeholder="Home, Office, etc."
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="address-value" className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    id="address-value"
                    required
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="address-default"
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <label htmlFor="address-default" className="text-sm text-gray-700">
                    Set as default
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {isSaving ? "Saving..." : editingId ? "Update address" : "Save address"}
                  </button>
                </div>
              </form>
            )}

            {isLoading ? (
              <p className="text-gray-600 text-sm">Loading addresses...</p>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-3">📍</div>
                <h4 className="font-medium text-gray-900 mb-1">No addresses saved</h4>
                <p className="text-sm text-gray-600">Add an address to speed up checkout</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{item.label}</span>
                        {item.isDefault && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{item.address}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!item.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(item.id)}
                          className="text-sm text-yellow-700 hover:text-yellow-800 font-medium"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
