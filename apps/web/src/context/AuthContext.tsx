import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { api, ApiError, setAuthTokenGetter, setUnauthorizedHandler } from "@/lib/api"
import type { CustomerResponse } from "@/types/customer"
import type { LoginInput, RegisterInput } from "@/types/auth"

const TOKEN_KEY = "taqu_token"

interface AuthContextValue {
  customer: CustomerResponse | null
  token: string | null
  isLoading: boolean
  login: (data: LoginInput) => Promise<void>
  register: (data: RegisterInput) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerResponse | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const tokenRef = useRef<string | null>(null)

  const persistAuth = useCallback((newToken: string, newCustomer: CustomerResponse) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    tokenRef.current = newToken
    setToken(newToken)
    setCustomer(newCustomer)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    tokenRef.current = null
    setToken(null)
    setCustomer(null)
  }, [])

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const login = useCallback(
    async (data: LoginInput) => {
      const response = await api.login(data)
      persistAuth(response.token, response.customer)
    },
    [persistAuth]
  )

  const register = useCallback(
    async (data: RegisterInput) => {
      const response = await api.register(data)
      persistAuth(response.token, response.customer)
    },
    [persistAuth]
  )

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current)
  }, [])

  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuth()
    })
  }, [clearAuth])

  useEffect(() => {
    let cancelled = false

    async function hydrate() {
      const storedToken = localStorage.getItem(TOKEN_KEY)
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      tokenRef.current = storedToken
      setToken(storedToken)

      try {
        const me = await api.getMe()
        if (!cancelled) {
          setCustomer(me)
        }
      } catch (err) {
        if (!cancelled && err instanceof ApiError && err.status === 401) {
          clearAuth()
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [clearAuth])

  return (
    <AuthContext.Provider value={{ customer, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
