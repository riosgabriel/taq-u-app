import { useState } from "react";
import { toast } from "sonner";

export function ShipPackage() {
  const [formData, setFormData] = useState({
    senderName: "",
    senderPhone: "",
    senderAddress: "",
    recipientName: "",
    recipientPhone: "",
    recipientAddress: "",
    packageType: "small",
    weight: "",
    length: "",
    width: "",
    height: "",
    declaredValue: "",
    serviceType: "standard",
    paymentMethod: "cash"
  });

  const [estimatedCost, setEstimatedCost] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const packageTypes = [
    { value: "document", label: "Document", basePrice: 500 },
    { value: "small", label: "Small Package", basePrice: 800 },
    { value: "medium", label: "Medium Package", basePrice: 1200 },
    { value: "large", label: "Large Package", basePrice: 2000 }
  ];

  const serviceTypes = [
    { value: "standard", label: "Standard (2-3 days)", multiplier: 1 },
    { value: "express", label: "Express (1-2 days)", multiplier: 1.5 },
    { value: "overnight", label: "Overnight", multiplier: 2 }
  ];

  const calculateCost = () => {
    const packageType = packageTypes.find(p => p.value === formData.packageType);
    const serviceType = serviceTypes.find(s => s.value === formData.serviceType);
    
    if (!packageType || !serviceType) return 0;
    
    let cost = packageType.basePrice;
    const weight = parseFloat(formData.weight) || 0;
    
    // Weight surcharge
    if (weight > 1) {
      cost += (weight - 1) * 200;
    }
    
    // Service multiplier
    cost *= serviceType.multiplier;
    
    // Insurance
    const declaredValue = parseFloat(formData.declaredValue) || 0;
    const insurance = Math.max(declaredValue * 0.005, 100);
    cost += insurance;
    
    return Math.round(cost);
  };

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Recalculate cost when relevant fields change
    if (['packageType', 'weight', 'serviceType', 'declaredValue'].includes(field)) {
      setTimeout(() => {
        setEstimatedCost(calculateCost());
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const trackingNumber = `TAQ${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    toast.success(`Package created successfully! Tracking number: ${trackingNumber}`);
    
    // Reset form
    setFormData({
      senderName: "",
      senderPhone: "",
      senderAddress: "",
      recipientName: "",
      recipientPhone: "",
      recipientAddress: "",
      packageType: "small",
      weight: "",
      length: "",
      width: "",
      height: "",
      declaredValue: "",
      serviceType: "standard",
      paymentMethod: "cash"
    });
    setEstimatedCost(0);
    setIsSubmitting(false);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ship a Package</h2>
        <p className="text-gray-600">Fill out the details to create a new shipment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Sender Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📤 Sender Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                required
                value={formData.senderName}
                onChange={(e) => handleInputChange('senderName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.senderPhone}
                onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                required
                rows={3}
                value={formData.senderAddress}
                onChange={(e) => handleInputChange('senderAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Recipient Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📥 Recipient Information</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                required
                value={formData.recipientName}
                onChange={(e) => handleInputChange('recipientName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.recipientPhone}
                onChange={(e) => handleInputChange('recipientPhone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
              <textarea
                required
                rows={3}
                value={formData.recipientAddress}
                onChange={(e) => handleInputChange('recipientAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📦 Package Details</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Package Type</label>
              <select
                value={formData.packageType}
                onChange={(e) => handleInputChange('packageType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                {packageTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label} (¥{type.basePrice})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                required
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Length (cm)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.length}
                onChange={(e) => handleInputChange('length', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Width (cm)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.width}
                onChange={(e) => handleInputChange('width', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Declared Value (¥)</label>
              <input
                type="number"
                min="0"
                required
                value={formData.declaredValue}
                onChange={(e) => handleInputChange('declaredValue', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Service Options */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">🚚 Service Options</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
              <select
                value={formData.serviceType}
                onChange={(e) => handleInputChange('serviceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                {serviceTypes.map(service => (
                  <option key={service.value} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="cash">Cash on Pickup</option>
                <option value="card">Credit Card</option>
                <option value="cod">Cash on Delivery</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        {estimatedCost > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">💰 Estimated Cost</h3>
            <div className="text-2xl font-bold text-yellow-900">¥{estimatedCost.toLocaleString()}</div>
            <p className="text-sm text-yellow-700 mt-1">Final cost may vary based on actual measurements</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Creating Shipment..." : "Create Shipment"}
          </button>
        </div>
      </form>
    </div>
  );
}
