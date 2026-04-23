import React, { useEffect, useState } from "react"
import { toast } from "sonner"
import { api } from "../lib/api"
import { Driver, DriverCreateInput } from "../types/driver"

interface DriverEditProps {
  driverId?: string
  onCancel: () => void
  onSave: () => void
}

const DriverEdit: React.FC<DriverEditProps> = ({ driverId, onCancel, onSave }) => {
  const [driver, setDriver] = useState<Driver>({
    id: "",
    name: "",
    email: "",
    phone: "",
    licenseNumber: "",
    vehicleType: "",
    isAvailable: false,
  })
  const [loading, setLoading] = useState(false)

  const isEditing = !!driverId

  useEffect(() => {
    if (driverId) {
      fetchDriver()
    }
  }, [driverId])

  const fetchDriver = async () => {
    try {
      const data = await api.getDriver(driverId!) as Driver
      setDriver(data)
    } catch (error) {
      toast.error("Failed to fetch driver details")
      console.error("Fetch driver error:", error)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)

    try {
      if (isEditing) {
        await api.updateDriver(driverId!, driver)
        toast.success("Driver updated successfully!")
      } else {
        await api.createDriver(driver as DriverCreateInput)
        toast.success("Driver created successfully!")
      }
      onSave()
    } catch (error) {
      toast.error(`Failed to ${isEditing ? "update" : "create"} driver. Please try again.`)
      console.error("Save driver error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof Driver, value: string | boolean) => {
    setDriver(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit Driver" : "Create New Driver"}
          </h2>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={driver.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                required
                value={driver.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                required
                value={driver.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* License Number */}
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                License Number *
              </label>
              <input
                type="text"
                id="licenseNumber"
                required
                value={driver.licenseNumber}
                onChange={(e) => handleInputChange("licenseNumber", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="DL123456789"
              />
            </div>

            {/* Vehicle Type */}
            <div>
              <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type *
              </label>
              <select
                id="vehicleType"
                required
                value={driver.vehicleType.toLowerCase()}
                onChange={(e) => handleInputChange("vehicleType", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              >
                <option value="">Select vehicle type</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="bicycle">Bicycle</option>
              </select>
            </div>

            {/* Availability */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isAvailable"
                checked={driver.isAvailable}
                onChange={(e) => handleInputChange("isAvailable", e.target.checked)}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-700">
                Available for immediate assignments
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : (isEditing ? "Update Driver" : "Create Driver")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DriverEdit
