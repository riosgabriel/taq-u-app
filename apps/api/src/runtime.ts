import { CustomerRepositoryLive } from "customer/repository/customer-repository"
import { DriverRepositoryLive } from "delivery/repository/driver-repository"
import { OrderRepositoryLive } from "ordering/repository/order-repository"
import { CustomerServiceLive } from "customer/services/customer-service"
import { ConfigLive } from "config-service"
import { DriverServiceLive } from "delivery/services/driver-service"
import { OrderServiceLive } from "ordering/services/order-service"
import { TrackingNumberServiceLive } from "ordering/services/tracking-number-service"
import { EventBusLive } from "events/event-bus"
import { EventPublisherLive } from "events/event-publisher"
import { EventStoreLive } from "events/event-store"
import { Layer, ManagedRuntime } from "effect"
import { PrismaLive } from "prisma-service"
import { AppLogger } from "./logger"

const PrismaWithConfig = PrismaLive.pipe(Layer.provide(ConfigLive))

const EventsLive = EventPublisherLive.pipe(Layer.provide(EventStoreLive), Layer.provide(EventBusLive))

const OrderModuleLive = OrderServiceLive.pipe(
  Layer.provide(OrderRepositoryLive),
  Layer.provide(CustomerRepositoryLive),
  Layer.provide(TrackingNumberServiceLive),
  Layer.provide(DriverServiceLive),
  Layer.provide(DriverRepositoryLive),
  Layer.provide(EventsLive),
  Layer.provide(PrismaWithConfig)
)

const DriverModuleLive = DriverServiceLive.pipe(Layer.provide(DriverRepositoryLive), Layer.provide(PrismaWithConfig))

const CustomerModuleLive = CustomerServiceLive.pipe(
  Layer.provide(CustomerRepositoryLive),
  Layer.provide(PrismaWithConfig)
)

const AppLive = Layer.mergeAll(OrderModuleLive, DriverModuleLive, CustomerModuleLive)

export const AppRuntime = ManagedRuntime.make(
  Layer.merge(Layer.provide(AppLive, ConfigLive), Layer.provide(AppLogger, ConfigLive))
)
