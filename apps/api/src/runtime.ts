import { CustomerRepositoryLive } from "@order/repository/customer-repository"
import { DriverRepositoryLive } from "@order/repository/driver-respository"
import { OrderRepositoryLive } from "@order/repository/order-repository"
import { CustomerServiceLive } from "@order/services/customer-service"
import { DriverServiceLive } from "@order/services/driver-service"
import { OrderServiceLive } from "@order/services/order-service"
import { Layer, ManagedRuntime } from "effect"
import { PrismaLive } from "prisma-service"
import { AppLogger } from "./logger"

const OrderModuleLive = OrderServiceLive.pipe(
  Layer.provide(OrderRepositoryLive),
  Layer.provide(CustomerRepositoryLive),
  Layer.provide(PrismaLive)
)

const DriverModuleLive = DriverServiceLive.pipe(
  Layer.provide(DriverRepositoryLive),
  Layer.provide(PrismaLive)
)

const CustomerModuleLive = CustomerServiceLive.pipe(
  Layer.provide(CustomerRepositoryLive),
  Layer.provide(PrismaLive)
)

const AppLive = Layer.mergeAll(
  OrderModuleLive,
  DriverModuleLive,
  CustomerModuleLive
)

export const AppRuntime = ManagedRuntime.make(
  Layer.merge(AppLive, AppLogger)
)
