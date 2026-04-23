import React, { useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "../lib/api"
import { Driver } from "../types/driver"

interface DriverListProps {
  onEditDriver: (driver: Driver) => void
  onCreateDriver: () => void
}

const DriverList: React.FC<DriverListProps> = ({ onEditDriver, onCreateDriver }) => {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const data = await api.getDrivers() as Driver[]
      setDrivers(data)
    } catch (error) {
      toast.error("Failed to fetch drivers")
      console.error("Fetch drivers error:", error)
    } finally {
      setLoading(false)
    }
  }

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

  const filteredDrivers = drivers.filter(driver =>
    driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case "car": return "🚗"
      case "van": return "🚐"
      case "truck": return "🚚"
      case "motorcycle": return "🏍️"
      case "bicycle": return "🚴"
      default: return "🚗"
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
            onClick={onCreateDriver}
            className="px-4 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
          >
            Create New Driver
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
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
              {searchTerm ? "No drivers found matching your search." : "No drivers registered yet."}
            </div>
            {!searchTerm && (
              <button
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
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        driver.isAvailable 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
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
                    <span className="capitalize">{driver.vehicleType}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => onEditDriver(driver)}
                    className="flex-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                  >
                    Edit
                  </button>
                  <button
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
