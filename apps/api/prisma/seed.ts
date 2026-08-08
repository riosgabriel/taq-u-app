import {
  PrismaClient,
  OrderStatus,
  OrderPriority,
  DeliveryStatus,
  VehicleType,
  PackageStatus,
  TransportMode,
  CarrierType,
  PaymentMethod,
  PaymentStatus,
} from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Starting database seed...")

  // Clean existing data using TRUNCATE CASCADE for schema-independent wipe
  // This handles all FK constraints in a single operation
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "Event",
      "Payment",
      "Estimate",
      "Delivery",
      "Package",
      "RouteLeg",
      "Route",
      "Order",
      "Driver",
      "Customer",
      "Location",
      "Carrier"
    RESTART IDENTITY CASCADE;
  `)

  console.log("🧹 Cleaned existing data")

  // Create Locations
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: "Warehouse A",
        address: "123 Industrial Blvd, Springfield, IL 62701",
        latitude: 39.7817,
        longitude: -89.6501,
      },
    }),
    prisma.location.create({
      data: {
        name: "Distribution Center B",
        address: "456 Commerce Dr, Chicago, IL 60601",
        latitude: 41.8781,
        longitude: -87.6298,
      },
    }),
    prisma.location.create({
      data: {
        name: "Customer Hub C",
        address: "789 Main St, St. Louis, MO 63101",
        latitude: 38.627,
        longitude: -90.1994,
      },
    }),
    prisma.location.create({
      data: {
        name: "Retail Store D",
        address: "321 Oak Ave, Indianapolis, IN 46201",
        latitude: 39.7684,
        longitude: -86.1581,
      },
    }),
    prisma.location.create({
      data: {
        name: "Fulfillment Center E",
        address: "555 Pine Rd, Detroit, MI 48201",
        latitude: 42.3314,
        longitude: -83.0458,
      },
    }),
  ])

  console.log(`📍 Created ${locations.length} locations`)

  // Create Carriers
  const carriers = await Promise.all([
    prisma.carrier.create({
      data: {
        name: "FastShip Logistics",
        type: CarrierType.COMPANY,
        contactInfo: "dispatch@fastship.com | 1-800-555-0100",
      },
    }),
    prisma.carrier.create({
      data: {
        name: "QuickHaul Transport",
        type: CarrierType.COMPANY,
        contactInfo: "ops@quickhaul.com | 1-800-555-0200",
      },
    }),
    prisma.carrier.create({
      data: {
        name: "John Miller",
        type: CarrierType.INDIVIDUAL,
        contactInfo: "john.miller@driver.com | 555-0101",
      },
    }),
    prisma.carrier.create({
      data: {
        name: "Drone Delivery Co",
        type: CarrierType.DRONE,
        contactInfo: "support@dronedelivery.io",
      },
    }),
  ])

  console.log(`🚚 Created ${carriers.length} carriers`)

  // Create Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: "Alice Johnson",
        email: "alice.johnson@email.com",
        phone: "555-1001",
        address: "100 Maple St, Springfield, IL 62704",
      },
    }),
    prisma.customer.create({
      data: {
        name: "Bob Smith",
        email: "bob.smith@email.com",
        phone: "555-1002",
        address: "200 Elm Ave, Chicago, IL 60610",
      },
    }),
    prisma.customer.create({
      data: {
        name: "Carol Williams",
        email: "carol.williams@email.com",
        phone: "555-1003",
        address: "300 Cedar Blvd, St. Louis, MO 63105",
      },
    }),
    prisma.customer.create({
      data: {
        name: "David Brown",
        email: "david.brown@email.com",
        phone: "555-1004",
        address: "400 Pine Dr, Indianapolis, IN 46220",
      },
    }),
    prisma.customer.create({
      data: {
        name: "Eva Martinez",
        email: "eva.martinez@email.com",
        phone: "555-1005",
        address: "500 Oak Ln, Detroit, MI 48205",
      },
    }),
  ])

  console.log(`👥 Created ${customers.length} customers`)

  // Create Drivers - all available for happy-path testing
  const drivers = await Promise.all([
    prisma.driver.create({
      data: {
        name: "Mike Thompson",
        email: "mike.thompson@driver.com",
        phone: "555-2001",
        licenseNumber: "DL-IL-123456",
        vehicleType: VehicleType.VAN,
        isAvailable: true,
      },
    }),
    prisma.driver.create({
      data: {
        name: "Sarah Davis",
        email: "sarah.davis@driver.com",
        phone: "555-2002",
        licenseNumber: "DL-IL-789012",
        vehicleType: VehicleType.TRUCK,
        isAvailable: true,
      },
    }),
    prisma.driver.create({
      data: {
        name: "James Wilson",
        email: "james.wilson@driver.com",
        phone: "555-2003",
        licenseNumber: "DL-MO-345678",
        vehicleType: VehicleType.CAR,
        isAvailable: true,
      },
    }),
    prisma.driver.create({
      data: {
        name: "Lisa Anderson",
        email: "lisa.anderson@driver.com",
        phone: "555-2004",
        licenseNumber: "DL-IN-901234",
        vehicleType: VehicleType.VAN,
        isAvailable: true, // Changed to true for happy-path testing
      },
    }),
    prisma.driver.create({
      data: {
        name: "Robert Taylor",
        email: "robert.taylor@driver.com",
        phone: "555-2005",
        licenseNumber: "DL-MI-567890",
        vehicleType: VehicleType.MOTORCYCLE,
        isAvailable: true,
      },
    }),
  ])

  console.log(`🚛 Created ${drivers.length} drivers`)

  // Create Routes
  const routes = await Promise.all([
    prisma.route.create({
      data: {
        pickupId: locations[0].id,
        dropoffId: locations[1].id,
        carrierId: carriers[0].id,
      },
    }),
    prisma.route.create({
      data: {
        pickupId: locations[1].id,
        dropoffId: locations[2].id,
        carrierId: carriers[1].id,
      },
    }),
    prisma.route.create({
      data: {
        pickupId: locations[2].id,
        dropoffId: locations[3].id,
        carrierId: carriers[2].id,
      },
    }),
    prisma.route.create({
      data: {
        pickupId: locations[3].id,
        dropoffId: locations[4].id,
        carrierId: carriers[0].id,
      },
    }),
    prisma.route.create({
      data: {
        pickupId: locations[0].id,
        dropoffId: locations[4].id,
        carrierId: carriers[3].id,
      },
    }),
  ])

  console.log(`🛣️ Created ${routes.length} routes`)

  // Create Route Legs - transportMode matches carrier type
  const routeLegs = await Promise.all([
    prisma.routeLeg.create({
      data: {
        routeId: routes[0].id,
        transportMode: TransportMode.TRUCK,
        pickupLocationId: locations[0].id,
        dropoffLocationId: locations[1].id,
        carrierId: carriers[0].id,
        startTime: new Date("2026-08-10T08:00:00Z"),
        endTime: new Date("2026-08-10T12:00:00Z"),
      },
    }),
    prisma.routeLeg.create({
      data: {
        routeId: routes[1].id,
        transportMode: TransportMode.TRUCK,
        pickupLocationId: locations[1].id,
        dropoffLocationId: locations[2].id,
        carrierId: carriers[1].id,
        startTime: new Date("2026-08-10T13:00:00Z"),
        endTime: new Date("2026-08-10T17:00:00Z"),
      },
    }),
    prisma.routeLeg.create({
      data: {
        routeId: routes[2].id,
        transportMode: TransportMode.TRUCK,
        pickupLocationId: locations[2].id,
        dropoffLocationId: locations[3].id,
        carrierId: carriers[2].id,
        startTime: new Date("2026-08-11T08:00:00Z"),
        endTime: new Date("2026-08-11T11:00:00Z"),
      },
    }),
    prisma.routeLeg.create({
      data: {
        routeId: routes[3].id,
        transportMode: TransportMode.TRUCK,
        pickupLocationId: locations[3].id,
        dropoffLocationId: locations[4].id,
        carrierId: carriers[0].id,
        startTime: new Date("2026-08-11T12:00:00Z"),
        endTime: new Date("2026-08-11T15:00:00Z"),
      },
    }),
    prisma.routeLeg.create({
      data: {
        routeId: routes[4].id,
        transportMode: TransportMode.BIKE, // Changed from AIRPLANE to match DRONE carrier
        pickupLocationId: locations[0].id,
        dropoffLocationId: locations[4].id,
        carrierId: carriers[3].id,
        startTime: new Date("2026-08-10T10:00:00Z"),
        endTime: new Date("2026-08-10T11:30:00Z"),
      },
    }),
  ])

  console.log(`📦 Created ${routeLegs.length} route legs`)

  // Create Orders
  const orders = await Promise.all([
    prisma.order.create({
      data: {
        customerId: customers[0].id,
        driverId: drivers[0].id,
        assignedAt: new Date("2026-08-09T10:00:00Z"),
        pickupAddress: "123 Industrial Blvd, Springfield, IL 62701",
        deliveryAddress: "456 Commerce Dr, Chicago, IL 60601",
        pickupDate: new Date("2026-08-10T08:00:00Z"),
        deliveryDate: new Date("2026-08-10T12:00:00Z"),
        specialInstructions: "Handle with care - fragile items",
        priority: OrderPriority.HIGH,
        status: OrderStatus.ASSIGNED,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[1].id,
        driverId: drivers[1].id,
        assignedAt: new Date("2026-08-09T11:00:00Z"),
        pickupAddress: "456 Commerce Dr, Chicago, IL 60601",
        deliveryAddress: "789 Main St, St. Louis, MO 63101",
        pickupDate: new Date("2026-08-10T13:00:00Z"),
        deliveryDate: new Date("2026-08-10T17:00:00Z"),
        specialInstructions: "Deliver to loading dock B",
        priority: OrderPriority.STANDARD,
        status: OrderStatus.CONFIRMED,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[2].id,
        driverId: drivers[2].id,
        assignedAt: new Date("2026-08-10T09:00:00Z"),
        pickupAddress: "789 Main St, St. Louis, MO 63101",
        deliveryAddress: "321 Oak Ave, Indianapolis, IN 46201",
        pickupDate: new Date("2026-08-11T08:00:00Z"),
        deliveryDate: new Date("2026-08-11T11:00:00Z"),
        specialInstructions: "Call customer 30 min before arrival",
        priority: OrderPriority.URGENT,
        status: OrderStatus.IN_PROGRESS,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[3].id,
        driverId: drivers[3].id,
        assignedAt: new Date("2026-08-10T10:00:00Z"),
        pickupAddress: "321 Oak Ave, Indianapolis, IN 46201",
        deliveryAddress: "555 Pine Rd, Detroit, MI 48201",
        pickupDate: new Date("2026-08-11T12:00:00Z"),
        deliveryDate: new Date("2026-08-11T15:00:00Z"),
        specialInstructions: "Leave at front door if no answer",
        priority: OrderPriority.LOW,
        status: OrderStatus.PENDING,
      },
    }),
    prisma.order.create({
      data: {
        customerId: customers[4].id,
        driverId: drivers[4].id,
        assignedAt: new Date("2026-08-09T14:00:00Z"),
        pickupAddress: "123 Industrial Blvd, Springfield, IL 62701",
        deliveryAddress: "555 Pine Rd, Detroit, MI 48201",
        pickupDate: new Date("2026-08-10T10:00:00Z"),
        deliveryDate: new Date("2026-08-10T11:30:00Z"),
        specialInstructions: "Express delivery - perishable goods",
        priority: OrderPriority.URGENT,
        status: OrderStatus.COMPLETED,
      },
    }),
  ])

  console.log(`📋 Created ${orders.length} orders`)

  // Create Packages
  const packages = await Promise.all([
    prisma.package.create({
      data: {
        orderId: orders[0].id,
        segmentId: routeLegs[0].id,
        weightKg: 25.5,
        dimensions: "50x40x30 cm",
        description: "Electronics - laptops and accessories",
        fragile: true,
        perishable: false,
        insured: true,
        trackingNumber: "TRK-20260810-001",
        status: PackageStatus.IN_TRANSIT,
      },
    }),
    prisma.package.create({
      data: {
        orderId: orders[0].id,
        segmentId: routeLegs[0].id,
        weightKg: 10.2,
        dimensions: "30x20x15 cm",
        description: "Phone cases and accessories",
        fragile: false,
        perishable: false,
        insured: false,
        trackingNumber: "TRK-20260810-002",
        status: PackageStatus.IN_TRANSIT,
      },
    }),
    prisma.package.create({
      data: {
        orderId: orders[1].id,
        segmentId: routeLegs[1].id,
        weightKg: 50.0,
        dimensions: "60x50x40 cm",
        description: "Industrial equipment parts",
        fragile: false,
        perishable: false,
        insured: true,
        trackingNumber: "TRK-20260810-003",
        status: PackageStatus.AWAITING_PICKUP,
      },
    }),
    prisma.package.create({
      data: {
        orderId: orders[2].id,
        segmentId: routeLegs[2].id,
        weightKg: 5.5,
        dimensions: "25x20x10 cm",
        description: "Medical supplies - temperature controlled",
        fragile: true,
        perishable: true,
        insured: true,
        trackingNumber: "TRK-20260811-001",
        status: PackageStatus.OUT_FOR_DELIVERY,
      },
    }),
    prisma.package.create({
      data: {
        orderId: orders[3].id,
        segmentId: routeLegs[3].id,
        weightKg: 100.0,
        dimensions: "100x80x60 cm",
        description: "Furniture - assembled desk",
        fragile: false,
        perishable: false,
        insured: false,
        trackingNumber: "TRK-20260811-002",
        status: PackageStatus.AWAITING_PICKUP,
      },
    }),
    prisma.package.create({
      data: {
        orderId: orders[4].id,
        segmentId: routeLegs[4].id,
        weightKg: 2.0,
        dimensions: "15x10x5 cm",
        description: "Fresh produce - organic vegetables",
        fragile: true,
        perishable: true,
        insured: true,
        trackingNumber: "TRK-20260810-004",
        status: PackageStatus.DELIVERED,
      },
    }),
  ])

  console.log(`📦 Created ${packages.length} packages`)

  // Create Deliveries - connect to orders via many-to-many
  const deliveries = await Promise.all([
    prisma.delivery.create({
      data: {
        driverId: drivers[0].id,
        routeId: routes[0].id,
        estimatedPickupTime: new Date("2026-08-10T08:00:00Z"),
        estimatedDeliveryTime: new Date("2026-08-10T12:00:00Z"),
        actualPickupTime: new Date("2026-08-10T08:15:00Z"),
        actualDeliveryTime: new Date("2026-08-10T11:45:00Z"),
        status: DeliveryStatus.DELIVERED,
        orders: { connect: [{ id: orders[0].id }] },
      },
    }),
    prisma.delivery.create({
      data: {
        driverId: drivers[1].id,
        routeId: routes[1].id,
        estimatedPickupTime: new Date("2026-08-10T13:00:00Z"),
        estimatedDeliveryTime: new Date("2026-08-10T17:00:00Z"),
        actualPickupTime: new Date("2026-08-10T13:10:00Z"),
        status: DeliveryStatus.IN_TRANSIT,
        orders: { connect: [{ id: orders[1].id }] },
      },
    }),
    prisma.delivery.create({
      data: {
        driverId: drivers[2].id,
        routeId: routes[2].id,
        estimatedPickupTime: new Date("2026-08-11T08:00:00Z"),
        estimatedDeliveryTime: new Date("2026-08-11T11:00:00Z"),
        status: DeliveryStatus.ASSIGNED,
        orders: { connect: [{ id: orders[2].id }] },
      },
    }),
    prisma.delivery.create({
      data: {
        driverId: drivers[3].id,
        routeId: routes[3].id,
        estimatedPickupTime: new Date("2026-08-11T12:00:00Z"),
        estimatedDeliveryTime: new Date("2026-08-11T15:00:00Z"),
        status: DeliveryStatus.ASSIGNED,
        orders: { connect: [{ id: orders[3].id }] },
      },
    }),
    prisma.delivery.create({
      data: {
        driverId: drivers[4].id,
        routeId: routes[4].id,
        estimatedPickupTime: new Date("2026-08-10T10:00:00Z"),
        estimatedDeliveryTime: new Date("2026-08-10T11:30:00Z"),
        actualPickupTime: new Date("2026-08-10T10:05:00Z"),
        actualDeliveryTime: new Date("2026-08-10T11:20:00Z"),
        status: DeliveryStatus.DELIVERED,
        orders: { connect: [{ id: orders[4].id }] },
      },
    }),
  ])

  console.log(`🚚 Created ${deliveries.length} deliveries`)

  // Create Payments
  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        method: PaymentMethod.CREDIT_CARD,
        amount: 150.0,
        currency: "USD",
        status: PaymentStatus.PAID,
        transactionId: "txn_20260810_001",
        orderId: orders[0].id,
        timestamp: new Date("2026-08-09T10:30:00Z"),
      },
    }),
    prisma.payment.create({
      data: {
        method: PaymentMethod.BANK_TRANSFER,
        amount: 200.0,
        currency: "USD",
        status: PaymentStatus.PAID,
        transactionId: "txn_20260810_002",
        orderId: orders[1].id,
        timestamp: new Date("2026-08-09T11:30:00Z"),
      },
    }),
    prisma.payment.create({
      data: {
        method: PaymentMethod.CREDIT_CARD,
        amount: 350.0,
        currency: "USD",
        status: PaymentStatus.PENDING,
        orderId: orders[2].id,
        timestamp: new Date("2026-08-10T09:30:00Z"),
      },
    }),
    prisma.payment.create({
      data: {
        method: PaymentMethod.CASH,
        amount: 75.0,
        currency: "USD",
        status: PaymentStatus.PENDING,
        orderId: orders[3].id,
        timestamp: new Date("2026-08-10T10:30:00Z"),
      },
    }),
    prisma.payment.create({
      data: {
        method: PaymentMethod.MOBILE,
        amount: 500.0,
        currency: "USD",
        status: PaymentStatus.PAID,
        transactionId: "txn_20260810_003",
        orderId: orders[4].id,
        timestamp: new Date("2026-08-09T14:30:00Z"),
      },
    }),
  ])

  console.log(`💰 Created ${payments.length} payments`)

  // Create Estimates
  const estimates = await Promise.all([
    prisma.estimate.create({
      data: {
        estimatedCost: 140.0,
        currency: "USD",
        estimatedDeliveryTime: new Date("2026-08-10T12:00:00Z"),
        orderId: orders[0].id,
      },
    }),
    prisma.estimate.create({
      data: {
        estimatedCost: 180.0,
        currency: "USD",
        estimatedDeliveryTime: new Date("2026-08-10T17:00:00Z"),
        orderId: orders[1].id,
      },
    }),
    prisma.estimate.create({
      data: {
        estimatedCost: 320.0,
        currency: "USD",
        estimatedDeliveryTime: new Date("2026-08-11T11:00:00Z"),
        orderId: orders[2].id,
      },
    }),
    prisma.estimate.create({
      data: {
        estimatedCost: 70.0,
        currency: "USD",
        estimatedDeliveryTime: new Date("2026-08-11T15:00:00Z"),
        orderId: orders[3].id,
      },
    }),
    prisma.estimate.create({
      data: {
        estimatedCost: 480.0,
        currency: "USD",
        estimatedDeliveryTime: new Date("2026-08-10T11:30:00Z"),
        orderId: orders[4].id,
      },
    }),
  ])

  console.log(`📊 Created ${estimates.length} estimates`)

  console.log("✅ Database seed completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
