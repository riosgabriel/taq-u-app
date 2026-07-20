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

const AppLive = Layer.mergeAll(
  OrderServiceLive,
  CustomerServiceLive,
  DriverServiceLive,
  OrderRepositoryLive,
  CustomerRepositoryLive,
  DriverRepositoryLive,
  TrackingNumberServiceLive,
  EventsLive,
  PrismaWithConfig
) as unknown as Layer.Layer<unknown, never, never>

export const AppRuntime = ManagedRuntime.make(
  Layer.merge(Layer.provide(AppLive, ConfigLive), Layer.provide(AppLogger, ConfigLive))
)
