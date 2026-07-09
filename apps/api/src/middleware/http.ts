export interface HttpResponse {
  readonly status: number
  readonly body: unknown
}

export const ok = (body: unknown): HttpResponse => ({ status: 200, body })
export const created = (body: unknown): HttpResponse => ({ status: 201, body })
export const badRequest = (message: string): HttpResponse => ({ status: 400, body: { error: message } })
export const notFound = (message: string): HttpResponse => ({ status: 404, body: { error: message } })
export const conflict = (message: string): HttpResponse => ({ status: 409, body: { error: message } })
