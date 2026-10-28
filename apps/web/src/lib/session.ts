import { useSyncExternalStore } from "react"

const TOKEN_KEY = "taqu_token"

export type SessionStatus = "anonymous" | "authenticated" | "expired"

interface SessionState {
  token: string | null
  status: SessionStatus
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage unavailable (private mode); the session just won't survive a reload.
  }
}

const initialToken = readStoredToken()
let state: SessionState = { token: initialToken, status: initialToken ? "authenticated" : "anonymous" }
const listeners = new Set<() => void>()

function setState(next: SessionState) {
  state = next
  writeStoredToken(next.token)
  listeners.forEach((listener) => listener())
}

export const session = {
  getToken: () => state.token,
  signIn: (token: string) => setState({ token, status: "authenticated" }),
  signOut: () => setState({ token: null, status: "anonymous" }),
  expire: () => setState({ token: null, status: "expired" }),
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => state,
}

export function useSession() {
  return useSyncExternalStore(session.subscribe, session.getSnapshot)
}
