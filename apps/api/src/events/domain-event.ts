export interface DomainEvent {
  readonly type: string
  readonly streamId: string
  readonly payload: unknown
  readonly timestamp: Date
}
