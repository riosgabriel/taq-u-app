import { Prisma } from "@prisma/client"

export interface DomainEvent {
  readonly type: string
  readonly streamId: string
  readonly payload: Prisma.InputJsonValue
}
