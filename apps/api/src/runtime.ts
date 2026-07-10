import { CustomerRepositoryLive } from "@order/repository/customer-repository"
import { DriverRepositoryLive } from "@order/repository/driver-respository"
import { OrderRepositoryLive } from "@order/repository/order-repository"
import { CustomerServiceLive } from "@order/services/customer-service"
import { ConfigLive } from "@order/services/config-service"
import { DriverServiceLive } from "@order/services/driver-service"
import { OrderServiceLive } from "@order/services/order-service"
import { Layer, ManagedRuntime } from "effect"
import { PrismaLive } from "prisma-service"
import { AppLogger } from "./logger"

const PrismaWithConfig = PrismaLive.pipe(Layer.provide(ConfigLive))

const OrderModuleLive = OrderServiceLive.pipe(
  Layer.provide(OrderRepositoryLive),
  Layer.provide(CustomerRepositoryLive),
  Layer.provide(PrismaWithConfig)
)

const DriverModuleLive = DriverServiceLive.pipe(
  Layer.provide(DriverRepositoryLive),
  Layer.provide(PrismaWithConfig)
)

const CustomerModuleLive = CustomerServiceLive.pipe(
  Layer.provide(CustomerRepositoryLive),
  Layer.provide(PrismaWithConfig)
)

const AppLive = Layer.mergeAll(
  OrderModuleLive,
  DriverModuleLive,
  CustomerModuleLive
)

export const AppRuntime = ManagedRuntime.make(
  Layer.merge(Layer.provide(AppLive, ConfigLive), Layer.provide(AppLogger, ConfigLive))
)
