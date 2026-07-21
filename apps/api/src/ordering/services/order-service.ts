import { PersistenceError } from "@/persistence-errors"
import { OrderStatus, PackageStatus } from "@prisma/client"
import { CustomerRepository } from "customer/repository/customer-repository"
import { CustomerNotFoundError } from "customer/services/customer-service"
import { DriverNotFoundError, DriverService } from "delivery/services/driver-service"
import { Context, Data, Effect, Layer } from "effect"
import { EventPublisher } from "events/event-publisher"
import { transition as statusTransition } from "ordering/domain/order-status"
import { AddPackageInput, OrderCreateInput, OrderUpdateInput } from "ordering/dto/order-dto"
import { OrderRepository, OrderWithPackages } from "ordering/repository/order-repository"

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
    ) => Effect.Effect<OrderWithPackages, CustomerNotFoundError | PersistenceError>
    readonly getOrderById: (orderId: string) => Effect.Effect<OrderWithPackages, OrderNotFoundError | PersistenceError>
    readonly listOrders: () => Effect.Effect<OrderWithPackages[], PersistenceError>
    readonly updateOrder: (
      orderId: string,
      updateInput: OrderUpdateInput
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | PersistenceError>
    readonly cancelOrder: (
      orderId: string
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly confirmOrder: (
      orderId: string
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly assignDriver: (
      orderId: string,
      driverId: string
    ) => Effect.Effect<
      OrderWithPackages,
      OrderNotFoundError | DriverNotFoundError | OrderStatusError | PersistenceError
    >
    readonly pickupOrder: (
      orderId: string
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly deliverOrder: (
      orderId: string
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly addPackageToOrder: (
      orderId: string,
      packageInput: AddPackageInput
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | PersistenceError>
    readonly updatePackageStatus: (
      orderId: string,
      packageId: string,
      status: PackageStatus
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | PackageNotFoundError | PersistenceError>
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

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.CANCELLED)

          return yield* orderRepository.updateOrderStatus(orderId, validated)
        }).pipe(
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          ),
          Effect.catchTag("order/InvalidTransitionError", (error) =>
            Effect.fail(
              new OrderStatusError({
                orderId,
                currentStatus: error.currentStatus,
                message: error.message,
              })
            )
          )
        )
      },

      confirmOrder: (orderId: string) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.CONFIRMED)

          return yield* orderRepository.updateOrderStatus(orderId, validated)
        }).pipe(
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          ),
          Effect.catchTag("order/InvalidTransitionError", (error) =>
            Effect.fail(
              new OrderStatusError({
                orderId,
                currentStatus: error.currentStatus,
                message: error.message,
              })
            )
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

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.ASSIGNED)

          const result = yield* orderRepository.assignDriver(orderId, driverId, new Date())

          yield* eventPublisher.notify(result.events)

          return result.order
        }).pipe(
          Effect.catchTag("order/InvalidTransitionError", (error) =>
            Effect.fail(
              new OrderStatusError({
                orderId,
                currentStatus: error.currentStatus,
                message: error.message,
              })
            )
          )
        )
      },

      pickupOrder: (orderId: string) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.IN_PROGRESS)

          return yield* orderRepository.updateOrderStatus(orderId, validated)
        }).pipe(
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          ),
          Effect.catchTag("order/InvalidTransitionError", (error) =>
            Effect.fail(
              new OrderStatusError({
                orderId,
                currentStatus: error.currentStatus,
                message: error.message,
              })
            )
          )
        )
      },

      deliverOrder: (orderId: string) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.COMPLETED)

          return yield* orderRepository.updateOrderStatus(orderId, validated)
        }).pipe(
          Effect.catchTag("order/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          ),
          Effect.catchTag("order/InvalidTransitionError", (error) =>
            Effect.fail(
              new OrderStatusError({
                orderId,
                currentStatus: error.currentStatus,
                message: error.message,
              })
            )
          )
        )
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
