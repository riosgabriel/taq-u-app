import { OrderCreateInput, OrderResponse } from "@order/dto/order-dto";
import { CustomerRepositoryLive } from "@order/repository/customer-repository";
import { OrderRepositoryLive } from "@order/repository/order-repository";
import { OrderService, OrderServiceLive } from "@order/services/order-service";
import { Effect, Schema, Console, pipe } from "effect";
import { Router, Response, Request } from "express";
import { PrismaLive } from "prisma-service";


export const OrderController = Router()

OrderController.post("/", async (req: Request, res: Response<OrderResponse | { message: string }>) => {
    const program = Effect.gen(function* (_) {
        const orderInput = yield* Schema.decodeUnknown(OrderCreateInput)(req.body)
        const orderService = yield* OrderService
        const order = yield* orderService.createOrder(orderInput)
        return res.json(OrderResponse.fromCustomer(order))
    })
    .pipe(
        Effect.catchTags({
            "ParseError": (error) => {
                Console.error(error)
                return Effect.sync(() => res.status(404).json({ message: error.message }))
            },
            "order/CustomerNotFoundError": (error) => {
                Console.error(error)
                return Effect.sync(() => res.status(404).json({ message: `Customer with id ${error.customerId} not found` }))
            },
        }),
        Effect.catchAll((error) => {
            Console.error(error)
            return Effect.sync(() => res.status(500).json({ message: "Internal Server Error" }))
        })
    )

    Effect.runPromise(program.pipe(
        Effect.provide(OrderServiceLive),
        Effect.provide(OrderRepositoryLive),
        Effect.provide(CustomerRepositoryLive),
        Effect.provide(PrismaLive)
    ))
})
