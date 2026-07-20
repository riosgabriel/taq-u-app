import { ConfigLive } from "config-service"
import { CustomerRepositoryLive } from "customer/repository/customer-repository"
import { CustomerServiceLive } from "customer/services/customer-service"
import { DriverRepositoryLive } from "delivery/repository/driver-repository"
import { DriverServiceLive } from "delivery/services/driver-service"
import { Layer, ManagedRuntime } from "effect"
import { EventBusLive } from "events/event-bus"
import { EventPublisherLive } from "events/event-publisher"
import { EventStoreLive } from "events/event-store"
import { OrderRepositoryLive } from "ordering/repository/order-repository"
import { OrderServiceLive } from "ordering/services/order-service"
import { TrackingNumberServiceLive } from "ordering/services/tracking-number-service"
import { PrismaLive } from "prisma-service"
import { AppLogger } from "./logger"

const PrismaWithConfig = PrismaLive.pipe(Layer.provide(ConfigLive))

const EventsLive = EventPublisherLive.pipe(Layer.provide(EventStoreLive), Layer.provide(EventBusLive))

const EventsInfra = EventsLive.pipe(Layer.provide(PrismaWithConfig))

const OrderInfra = OrderRepositoryLive.pipe(
  Layer.provide(TrackingNumberServiceLive),
  Layer.provide(EventsInfra),
  Layer.provide(PrismaWithConfig)
)

const CustomerInfra = CustomerRepositoryLive.pipe(Layer.provide(PrismaWithConfig))

const DriverInfra = DriverServiceLive.pipe(
  Layer.provide(DriverRepositoryLive),
  Layer.provide(OrderInfra),
  Layer.provide(PrismaWithConfig)
)

const OrderModuleLive = OrderServiceLive.pipe(
  Layer.provide(OrderInfra),
  Layer.provide(CustomerInfra),
  Layer.provide(DriverInfra),
  Layer.provide(EventsInfra)
)

const CustomerModuleLive = CustomerServiceLive.pipe(
  Layer.provide(CustomerInfra)
)

const DriverModuleLive = DriverServiceLive.pipe(
  Layer.provide(DriverRepositoryLive),
  Layer.provide(OrderInfra),
  Layer.provide(PrismaWithConfig)
)

const AppLive = Layer.mergeAll(OrderModuleLive, DriverModuleLive, CustomerModuleLive)

export const AppRuntime = ManagedRuntime.make(
  Layer.merge(Layer.provide(AppLive, ConfigLive), Layer.provide(AppLogger, ConfigLive))
)
