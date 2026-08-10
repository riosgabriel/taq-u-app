import { describe, expect, it } from "@effect/vitest"
import { DeliveryRouteResponse } from "delivery/dto/delivery-dto"
import type { DeliveryWithDetails } from "delivery/repository/delivery-repository"

const delivery: DeliveryWithDetails = {
  id: "del-1",
  driverId: "drv-1",
  routeId: "route-1",
  estimatedPickupTime: new Date("2026-01-01T09:00:00.000Z"),
  estimatedDeliveryTime: new Date("2026-01-01T17:00:00.000Z"),
  actualPickupTime: null,
  actualDeliveryTime: null,
  status: "IN_TRANSIT",
  createdAt: new Date("2026-01-01T08:00:00.000Z"),
  updatedAt: new Date("2026-01-01T08:30:00.000Z"),
  driver: {
    id: "drv-1",
    name: "Jane Driver",
    email: "jane@example.com",
    phone: "555-0100",
    licenseNumber: "DL-123",
    vehicleType: "VAN",
    isAvailable: true,
    createdAt: new Date("2025-12-01T00:00:00.000Z"),
    updatedAt: new Date("2025-12-01T00:00:00.000Z"),
  },
  route: {
    id: "route-1",
    pickupId: "loc-a",
    dropoffId: "loc-b",
    carrierId: null,
    pickup: {
      id: "loc-a",
      name: "Warehouse A",
      address: "1 Industrial Rd",
      latitude: 40.0,
      longitude: -74.0,
    },
    dropoff: {
      id: "loc-b",
      name: "Store B",
      address: "2 Main St",
      latitude: 40.1,
      longitude: -74.1,
    },
  },
  orders: [
    {
      id: "order-1",
      customerId: "cust-1",
      driverId: "drv-1",
      assignedAt: new Date("2026-01-01T08:00:00.000Z"),
      pickupAddress: "1 Industrial Rd",
      deliveryAddress: "2 Main St",
      pickupDate: new Date("2026-01-01T09:00:00.000Z"),
      deliveryDate: new Date("2026-01-01T17:00:00.000Z"),
      specialInstructions: null,
      priority: "STANDARD",
      status: "IN_PROGRESS",
      createdAt: new Date("2026-01-01T07:00:00.000Z"),
      updatedAt: new Date("2026-01-01T08:00:00.000Z"),
      packages: [
        {
          id: "pkg-1",
          orderId: "order-1",
          segmentId: null,
          weightKg: 2.5,
          dimensions: "10x10x10",
          description: "Fragile vase",
          fragile: true,
          perishable: false,
          insured: true,
          trackingNumber: "TRK-001",
          status: "IN_TRANSIT",
        },
      ],
    },
  ],
}

describe("DeliveryRouteResponse", () => {
  it("maps the delivery fields", () => {
    const response = DeliveryRouteResponse.fromDeliveryWithDetails(delivery)
    expect(response.id).toBe("del-1")
    expect(response.status).toBe("IN_TRANSIT")
    expect(response.driverId).toBe("drv-1")
    expect(response.routeId).toBe("route-1")
    expect(response.estimatedPickupTime).toEqual(new Date("2026-01-01T09:00:00.000Z"))
    expect(response.estimatedDeliveryTime).toEqual(new Date("2026-01-01T17:00:00.000Z"))
    expect(response.actualPickupTime).toBeNull()
    expect(response.actualDeliveryTime).toBeNull()
    expect(response.createdAt).toEqual(new Date("2026-01-01T08:00:00.000Z"))
    expect(response.updatedAt).toEqual(new Date("2026-01-01T08:30:00.000Z"))
  })

  it("maps the nested driver view", () => {
    const response = DeliveryRouteResponse.fromDeliveryWithDetails(delivery)
    expect(response.driver).toEqual({
      id: "drv-1",
      name: "Jane Driver",
      vehicleType: "VAN",
      licenseNumber: "DL-123",
    })
  })

  it("maps the nested route view with pickup and dropoff", () => {
    const response = DeliveryRouteResponse.fromDeliveryWithDetails(delivery)
    expect(response.route).toEqual({
      id: "route-1",
      pickup: { id: "loc-a", name: "Warehouse A" },
      dropoff: { id: "loc-b", name: "Store B" },
    })
  })

  it("flattens packages across orders, attaching the order delivery address", () => {
    const response = DeliveryRouteResponse.fromDeliveryWithDetails(delivery)
    expect(response.packages).toEqual([
      {
        id: "pkg-1",
        orderId: "order-1",
        trackingNumber: "TRK-001",
        description: "Fragile vase",
        status: "IN_TRANSIT",
        address: "2 Main St",
      },
    ])
  })

  it("maps null license number to null", () => {
    const response = DeliveryRouteResponse.fromDeliveryWithDetails({
      ...delivery,
      driver: { ...delivery.driver, licenseNumber: null },
    })
    expect(response.driver.licenseNumber).toBeNull()
  })

  it("maps null routeId and route to null", () => {
    const response = DeliveryRouteResponse.fromDeliveryWithDetails({
      ...delivery,
      routeId: null,
      route: null,
    })
    expect(response.routeId).toBeNull()
    expect(response.route).toBeNull()
  })
})
