import { session } from "@/lib/session"

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api"

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

interface RequestOptions {
  body?: unknown
  headers?: Record<string, string>
}

async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const token = session.getToken()

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the API running?")
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    // Only a rejected token means the session is over; a 401 from /auth/login is bad credentials.
    if (response.status === 401 && token) session.expire()
    throw new ApiError(response.status, data?.error ?? data?.message ?? response.statusText)
  }

  return data as T
}

export const http = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>("POST", path, { body, headers }),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
}
