import React, { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { api } from "../lib/api"
import type { Driver } from "../types/driver"
import type { OrderResponse } from "../types/order"

interface DriverListProps {
  onEditDriver: (driver: Driver) => void
  onCreateDriver: () => void
}

type PendingOrder = OrderResponse

const DriverList: React.FC<DriverListProps> = ({ onEditDriver, onCreateDriver }) => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [availableOnly, setAvailableOnly] = useState(false)
  const [selectedDriverByOrder, setSelectedDriverByOrder] = useState<Record<string, string>>({})
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null)

  const fetchDrivers = async () => {
    try {
      const data = (await api.getDrivers()) as Driver[]
      setDrivers(data)
    } catch (error) {
      toast.error("Failed to fetch drivers")
      console.error("Fetch drivers error:", error)
    }
  }

  const fetchPendingOrders = async () => {
    try {
      const allOrders = await api.getOrders()
      setPendingOrders(allOrders.filter((o) => o.driverId === null || o.driverId === undefined))
    } catch (error) {
      toast.error("Failed to fetch orders")
      console.error("Fetch orders error:", error)
    }
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchDrivers(), fetchPendingOrders()]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDeleteDriver = async (id: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) {
      return
    }
    try {
      await api.deleteDriver(id)
      toast.success("Driver deleted successfully")
      fetchDrivers()
    } catch (error) {
      toast.error("Failed to delete driver")
      console.error("Delete driver error:", error)
    }
  }

  const handleToggleAvailability = async (driver: Driver) => {
    const next = !driver.isAvailable
    // Optimistic update
    setDrivers((prev) => prev.map((d) => (d.id === driver.id ? { ...d, isAvailable: next } : d)))
    try {
      await api.updateDriver(driver.id, { ...driver, isAvailable: next })
    } catch (error) {
      // Revert on failure
      setDrivers((prev) => prev.map((d) => (d.id === driver.id ? { ...d, isAvailable: driver.isAvailable } : d)))
      toast.error("Failed to update availability")
      console.error("Toggle availability error:", error)
    }
  }

  const handleAssign = async (orderId: string) => {
    const driverId = selectedDriverByOrder[orderId]
    if (!driverId) {
      toast.error("Select a driver first")
      return
    }
    setAssigningOrderId(orderId)
    try {
      await api.assignOrderToDriver(orderId, driverId)
      toast.success("Driver assigned")
      setSelectedDriverByOrder((prev) => {
        const next = { ...prev }
        delete next[orderId]
        return next
      })
      await fetchPendingOrders()
    } catch (error) {
      toast.error("Failed to assign driver")
      console.error("Assign driver error:", error)
    } finally {
      setAssigningOrderId(null)
    }
  }

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      if (availableOnly && !driver.isAvailable) return false
      if (searchTerm === "") return true
      const term = searchTerm.toLowerCase()
      return (
        driver.name.toLowerCase().includes(term) ||
        driver.email.toLowerCase().includes(term) ||
        driver.licenseNumber.toLowerCase().includes(term)
      )
    })
  }, [drivers, searchTerm, availableOnly])

  const availableDrivers = useMemo(() => drivers.filter((d) => d.isAvailable), [drivers])

  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case "CAR":
        return "🚗"
      case "VAN":
        return "🚐"
      case "TRUCK":
        return "🚚"
      case "MOTORCYCLE":
        return "🏍️"
      case "BICYCLE":
        return "🚴"
      case "ON_FOOT":
        return "🚶"
      default:
        return "🚗"
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Driver Management</h2>
          <button
            type="button"
            onClick={onCreateDriver}
            className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
          >
            Create New Driver
          </button>
        </div>

        {/* Dispatch Panel */}
        {pendingOrders.length > 0 && (
          <div className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-orange-900 mb-3">Pending Dispatch ({pendingOrders.length})</h3>
            <div className="space-y-3">
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-orange-200 rounded-md p-3 flex flex-wrap items-center gap-3"
                >
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-mono text-xs text-gray-500">{order.id}</div>
                    <div className="text-sm text-gray-700">
                      <strong>From:</strong> {order.pickupAddress}
                    </div>
                    <div className="text-sm text-gray-700">
                      <strong>To:</strong> {order.deliveryAddress}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.packages.length} package{order.packages.length === 1 ? "" : "s"} · pickup{" "}
                      {new Date(order.pickupDate).toLocaleDateString()}
                    </div>
                  </div>
                  <select
                    value={selectedDriverByOrder[order.id] ?? ""}
                    onChange={(e) => setSelectedDriverByOrder((prev) => ({ ...prev, [order.id]: e.target.value }))}
                    disabled={availableDrivers.length === 0}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">
                      {availableDrivers.length === 0 ? "No available drivers" : "Select driver…"}
                    </option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.vehicleType.toLowerCase()})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAssign(order.id)}
                    disabled={!selectedDriverByOrder[order.id] || assigningOrderId === order.id}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {assigningOrderId === order.id ? "Assigning…" : "Assign"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <span>Available only ({availableDrivers.length} available)</span>
            </label>
          </div>
          <input
            type="text"
            placeholder="Search drivers by name, email, or license number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
          />
        </div>

        {/* Driver Grid */}
        {filteredDrivers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg">
              {searchTerm
                ? "No drivers found matching your search."
                : availableOnly
                  ? "No drivers are currently available."
                  : "No drivers registered yet."}
            </div>
            {!searchTerm && !availableOnly && (
              <button
                type="button"
                onClick={onCreateDriver}
                className="mt-4 px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 transition-colors"
              >
                Create Your First Driver
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getVehicleTypeIcon(driver.vehicleType)}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{driver.name}</h3>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          driver.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {driver.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>📧</span>
                    <span className="truncate">{driver.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span>{driver.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🪪</span>
                    <span className="font-mono text-xs">{driver.licenseNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🚗</span>
                    <span className="capitalize">{driver.vehicleType.toLowerCase().replace("_", " ")}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => onEditDriver(driver)}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleAvailability(driver)}
                    className={`flex-1 px-3 py-1.5 text-sm text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-1 transition-colors ${
                      driver.isAvailable
                        ? "bg-gray-600 hover:bg-gray-700 focus:ring-gray-500"
                        : "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                    }`}
                  >
                    {driver.isAvailable ? "Set Unavailable" : "Set Available"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDriver(driver.id)}
                    className="flex-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-colors"
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
  )
}

export default DriverList
