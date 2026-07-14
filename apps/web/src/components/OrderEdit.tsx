import { useState } from "react"
import { api } from "../lib/api"
import { OrderResponse, OrderUpdateInput } from "../types/order"
import { toast } from "sonner"

interface OrderEditProps {
  order: OrderResponse
  onClose: () => void
  onSuccess: () => void
}

export function OrderEdit({ order, onClose, onSuccess }: OrderEditProps) {
  const [formData, setFormData] = useState<OrderUpdateInput>({
    pickupAddress: order.pickupAddress,
    deliveryAddress: order.deliveryAddress,
    pickupDate: order.pickupDate.split("T")[0],
    deliveryDate: order.deliveryDate ? order.deliveryDate.split("T")[0] : "",
    specialInstructions: order.specialInstructions || "",
    priority: order.priority,
  })
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await api.updateOrder(order.id, formData)
      toast.success("Order updated successfully")
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Failed to update order")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Edit Order {order.id}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Pickup Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Address</label>
            <input
              type="text"
              name="pickupAddress"
              value={formData.pickupAddress || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              required
            />
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address</label>
            <input
              type="text"
              name="deliveryAddress"
              value={formData.deliveryAddress || ""}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              required
            />
          </div>

          {/* Dates */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Date</label>
              <input
                type="date"
                name="pickupDate"
                value={formData.pickupDate || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date (Optional)</label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate || ""}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              name="priority"
              value={formData.priority || "NORMAL"}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
            <textarea
              name="specialInstructions"
              value={formData.specialInstructions || ""}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              placeholder="Any special handling instructions..."
            />
          </div>

          {/* Package Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Packages ({order.packages.length})</h3>
            <p className="text-sm text-gray-600">
              Note: Package details cannot be edited here. Contact support for package changes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
