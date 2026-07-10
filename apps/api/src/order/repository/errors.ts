import { Prisma } from "@prisma/client"
import { Data } from "effect"
import { UnknownException } from "effect/Cause"

export class RecordNotFoundError extends Data.TaggedError("order/RecordNotFoundError")<{
  readonly model: string
  readonly id: string
  readonly message: string
}> {}

export const isRecordNotFoundError = (error: UnknownException): boolean =>
  error.error instanceof Prisma.PrismaClientKnownRequestError && error.error.code === "P2025"
