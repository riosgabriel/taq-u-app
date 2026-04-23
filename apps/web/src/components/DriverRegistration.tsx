import React, { useState } from "react"
import { toast } from "sonner"
import { api } from "../lib/api"

interface DriverCreateInput {
  name: string
  email: string
  phone: string
  licenseNumber: string
  vehicleType: string
  isAvailable: boolean
}

const DriverRegistration: React.FC = () => {
  const [driver, setDriver] = useState<DriverCreateInput>({
    name: "",
    email: "",
    phone: "",
    licenseNumber: "",
    vehicleType: "",
    isAvailable: false,
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await api.createDriver(driver)
      toast.success("Driver registered successfully!")
      // Reset form
      setDriver({
        name: "",
        email: "",
        phone: "",
        licenseNumber: "",
        vehicleType: "",
        isAvailable: false,
      })
    } catch (error) {
      toast.error("Failed to register driver. Please try again.")
      console.error("Registration error:", error)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Driver Registration</h2>
        
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
                onChange={(e) => setDriver({ ...driver, name: e.target.value })}
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
                onChange={(e) => setDriver({ ...driver, email: e.target.value })}
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
                onChange={(e) => setDriver({ ...driver, phone: e.target.value })}
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
                onChange={(e) => setDriver({ ...driver, licenseNumber: e.target.value })}
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
                value={driver.vehicleType}
                onChange={(e) => setDriver({ ...driver, vehicleType: e.target.value })}
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
                onChange={(e) => setDriver({ ...driver, isAvailable: e.target.checked })}
                className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
              />
              <label htmlFor="isAvailable" className="ml-2 block text-sm text-gray-700">
                Available for immediate assignments
              </label>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-yellow-600 text-white font-medium rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
            >
              Register Driver
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DriverRegistration
