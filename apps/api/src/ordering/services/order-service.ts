import { PersistenceError } from "@/persistence-errors"
import { OrderStatus, PackageStatus } from "@prisma/client"
import { CustomerRepository } from "customer/repository/customer-repository"
import { CustomerNotFoundError } from "customer/services/customer-service"
import { DriverNotFoundError, DriverService } from "delivery/services/driver-service"
import { Context, Data, Effect, Layer } from "effect"
import { EventPublisher } from "events/event-publisher"
import { AddPackageInput, OrderCreateInput, OrderUpdateInput } from "ordering/dto/order-dto"
import { OrderRepository, OrderWithRelations } from "ordering/repository/order-repository"

export class OrderNotFoundError extends Data.TaggedError("order/OrderNotFoundError")<{
  readonly orderId: string
  readonly message: string
}> {}

export class PackageNotFoundError extends Data.TaggedError("order/PackageNotFoundError")<{
  readonly packageId: string
  readonly message: string
}> {}

export class OrderStatusError extends Data.TaggedError("order/OrderStatusError")<{
  readonly orderId: string
  readonly currentStatus: string
  readonly message: string
}> {}

export class OrderService extends Context.Tag("order/OrderService")<
  OrderService,
  {
    readonly createOrder: (
      orderInput: OrderCreateInput
    ) => Effect.Effect<OrderWithRelations, CustomerNotFoundError | PersistenceError>
    readonly getOrderById: (orderId: string) => Effect.Effect<OrderWithRelations, OrderNotFoundError | PersistenceError>
    readonly listOrders: () => Effect.Effect<OrderWithRelations[], PersistenceError>
    readonly updateOrder: (
      orderId: string,
      updateInput: OrderUpdateInput
    ) => Effect.Effect<OrderWithRelations, OrderNotFoundError | PersistenceError>
    readonly cancelOrder: (
      orderId: string
    ) => Effect.Effect<OrderWithRelations, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly assignDriver: (
      orderId: string,
      driverId: string
    ) => Effect.Effect<
      OrderWithRelations,
      OrderNotFoundError | DriverNotFoundError | OrderStatusError | PersistenceError
    >
    readonly addPackageToOrder: (
      orderId: string,
      packageInput: AddPackageInput
    ) => Effect.Effect<OrderWithRelations, OrderNotFoundError | PersistenceError>
    readonly updatePackageStatus: (
      orderId: string,
      packageId: string,
      status: PackageStatus
    ) => Effect.Effect<OrderWithRelations, OrderNotFoundError | PackageNotFoundError | PersistenceError>
  }
>() {}

export type OrderServiceShape = Context.Tag.Service<OrderService>

export const OrderServiceLive = Layer.effect(
  OrderService,
  Effect.gen(function* () {
    const orderRepository = yield* OrderRepository
    const customerRepository = yield* CustomerRepository
    const eventPublisher = yield* EventPublisher
    const driverService = yield* DriverService

    return OrderService.of({
      createOrder: (orderInput: OrderCreateInput) => {
        return Effect.gen(function* () {
          yield* customerRepository.getCustomerById(orderInput.customerId)

          const result = yield* orderRepository.createOrder(orderInput)

          yield* eventPublisher.notify(result.events)

          return result.order
        }).pipe(
          Effect.catchTag("order/RecordNotFoundError", () =>
            Effect.fail(
              new CustomerNotFoundError({
                customerId: orderInput.customerId,
                message: `Customer with id ${orderInput.customerId} not found`,
              })
            )
          )
        )
      },

      getOrderById: (orderId: string) => {
        return orderRepository
          .getOrderById(orderId)
          .pipe(
            Effect.catchTag("order/RecordNotFoundError", (error) =>
              Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
            )
          )
      },

      listOrders: () => orderRepository.listOrders(),

      updateOrder: (orderId: string, updateInput: OrderUpdateInput) => {
        return orderRepository
          .updateOrder(orderId, updateInput)
          .pipe(
            Effect.catchTag("order/RecordNotFoundError", (error) =>
              Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
            )
          )
      },

      cancelOrder: (orderId: string) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          if (existingOrder.status === OrderStatus.COMPLETED || existingOrder.status === OrderStatus.CANCELLED) {
            return yield* Effect.fail(
              new OrderStatusError({
                orderId,
                currentStatus: existingOrder.status,
                message:
                  existingOrder.status === OrderStatus.CANCELLED
                    ? "Order is already cancelled"
                    : `Cannot cancel order with status ${existingOrder.status}`,
              })
            )
          }

          return yield* orderRepository.updateOrderStatus(orderId, OrderStatus.CANCELLED)
        }).pipe(
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          )
        )
      },

      assignDriver: (orderId: string, driverId: string) => {
        return Effect.gen(function* () {
          yield* driverService.getById(driverId)

          const existingOrder = yield* orderRepository
            .getOrderById(orderId)
            .pipe(
              Effect.catchTag("order/RecordNotFoundError", (error) =>
                Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
              )
            )

          if (existingOrder.status !== OrderStatus.PENDING && existingOrder.status !== OrderStatus.CONFIRMED) {
            return yield* Effect.fail(
              new OrderStatusError({
                orderId,
                currentStatus: existingOrder.status,
                message: `Cannot assign driver to order with status ${existingOrder.status}`,
              })
            )
          }

          const result = yield* orderRepository.assignDriver(orderId, driverId, new Date())

          yield* eventPublisher.notify(result.events)

          return result.order
        })
      },

      addPackageToOrder: (orderId: string, packageInput: AddPackageInput) => {
        return orderRepository
          .addPackageToOrder(orderId, packageInput)
          .pipe(
            Effect.catchTag("order/RecordNotFoundError", (error) =>
              Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
            )
          )
      },

      updatePackageStatus: (orderId: string, packageId: string, status: PackageStatus) => {
        return orderRepository
          .updatePackageStatus(orderId, packageId, status)
          .pipe(
            Effect.catchTag("order/RecordNotFoundError", (error) =>
              Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
            )
          )
      },
    })
  })
)
