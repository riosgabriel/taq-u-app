import { PersistenceError } from "@/persistence-errors"
import { OrderStatus, PackageStatus } from "@prisma/client"
import { CustomerRepository } from "customer/repository/customer-repository"
import { CustomerNotFoundError } from "customer/services/customer-service"
import { DriverNotFoundError, DriverService } from "delivery/services/driver-service"
import { Context, Data, Effect, Layer } from "effect"
import { DriverId, OrderId, PackageId } from "@/ids"
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
    readonly getOrderById: (orderId: OrderId) => Effect.Effect<OrderWithPackages, OrderNotFoundError | PersistenceError>
    readonly listOrders: () => Effect.Effect<OrderWithPackages[], PersistenceError>
    readonly updateOrder: (
      orderId: OrderId,
      updateInput: OrderUpdateInput
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | PersistenceError>
    readonly cancelOrder: (
      orderId: OrderId
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly confirmOrder: (
      orderId: OrderId
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly assignDriver: (
      orderId: OrderId,
      driverId: DriverId
    ) => Effect.Effect<
      OrderWithPackages,
      OrderNotFoundError | DriverNotFoundError | OrderStatusError | PersistenceError
    >
    readonly pickupOrder: (
      orderId: OrderId
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly deliverOrder: (
      orderId: OrderId
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | OrderStatusError | PersistenceError>
    readonly addPackageToOrder: (
      orderId: OrderId,
      packageInput: AddPackageInput
    ) => Effect.Effect<OrderWithPackages, OrderNotFoundError | PersistenceError>
    readonly findPackageByTrackingNumber: (
      trackingNumber: string
    ) => Effect.Effect<
      {
        package: { id: PackageId; trackingNumber: string; status: string }
        order: { id: OrderId; pickupAddress: string; deliveryAddress: string; pickupDate: Date; customerName: string }
      },
      PackageNotFoundError | PersistenceError
    >
    readonly updatePackageStatus: (
      orderId: OrderId,
      packageId: PackageId,
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
          Effect.catchTag("persistence/RecordNotFoundError", () =>
            Effect.fail(
              new CustomerNotFoundError({
                customerId: orderInput.customerId,
                message: `Customer with id ${orderInput.customerId} not found`,
              })
            )
          )
        )
      },

      getOrderById: (orderId: OrderId) => {
        return orderRepository
          .getOrderById(orderId)
          .pipe(
            Effect.catchTag("persistence/RecordNotFoundError", (error) =>
              Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
            )
          )
      },

      listOrders: () => orderRepository.listOrders(),

      updateOrder: (orderId: OrderId, updateInput: OrderUpdateInput) => {
        return orderRepository
          .updateOrder(orderId, updateInput)
          .pipe(
            Effect.catchTag("persistence/RecordNotFoundError", (error) =>
              Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
            )
          )
      },

      cancelOrder: (orderId: OrderId) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.CANCELLED)

          return yield* orderRepository.updateOrderStatus(orderId, validated)
        }).pipe(
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          ),
          Effect.catchTag("order/InvalidOrderStatusTransitionError", (error) =>
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

      confirmOrder: (orderId: OrderId) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.CONFIRMED)

          return yield* orderRepository.updateOrderStatus(orderId, validated)
        }).pipe(
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          ),
          Effect.catchTag("order/InvalidOrderStatusTransitionError", (error) =>
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

      assignDriver: (orderId: OrderId, driverId: DriverId) => {
        return Effect.gen(function* () {
          yield* driverService.getById(driverId)

          const existingOrder = yield* orderRepository
            .getOrderById(orderId)
            .pipe(
              Effect.catchTag("persistence/RecordNotFoundError", (error) =>
                Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
              )
            )

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.ASSIGNED)

          const result = yield* orderRepository.assignDriver(orderId, driverId, new Date(), validated)

          yield* eventPublisher.notify(result.events)

          return result.order
        }).pipe(
          Effect.catchTag("order/InvalidOrderStatusTransitionError", (error) =>
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

      pickupOrder: (orderId: OrderId) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.IN_PROGRESS)

          return yield* orderRepository.updateOrderStatus(orderId, validated)
        }).pipe(
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          ),
          Effect.catchTag("order/InvalidOrderStatusTransitionError", (error) =>
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

      deliverOrder: (orderId: OrderId) => {
        return Effect.gen(function* () {
          const existingOrder = yield* orderRepository.getOrderById(orderId)

          const validated = yield* statusTransition(existingOrder.status, OrderStatus.COMPLETED)

          return yield* orderRepository.updateOrderStatus(orderId, validated)
        }).pipe(
          Effect.catchTag("persistence/RecordNotFoundError", (error) =>
            Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
          ),
          Effect.catchTag("order/InvalidOrderStatusTransitionError", (error) =>
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

      addPackageToOrder: (orderId: OrderId, packageInput: AddPackageInput) => {
        return orderRepository
          .addPackageToOrder(orderId, packageInput)
          .pipe(
            Effect.catchTag("persistence/RecordNotFoundError", (error) =>
              Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
            )
          )
      },

      findPackageByTrackingNumber: (trackingNumber: string) => {
        return Effect.gen(function* () {
          const result = yield* orderRepository.findPackageByTrackingNumber(trackingNumber)
          if (!result) {
            return yield* Effect.fail(
              new PackageNotFoundError({
                packageId: trackingNumber,
                message: `Package with tracking number ${trackingNumber} not found`,
              })
            )
          }
          return result
        })
      },

      updatePackageStatus: (orderId: OrderId, packageId: PackageId, status: PackageStatus) => {
        return orderRepository
          .updatePackageStatus(orderId, packageId, status)
          .pipe(
            Effect.catchTag("persistence/RecordNotFoundError", (error) =>
              Effect.fail(new OrderNotFoundError({ orderId, message: error.message }))
            )
          )
      },
    })
  })
)
