import { useState } from "react"
import { toast } from "sonner"
import { ApiError } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

export function LoginPage() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<"signin" | "register">("signin")

  const [signInEmail, setSignInEmail] = useState("")
  const [signInPassword, setSignInPassword] = useState("")

  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerPhone, setRegisterPhone] = useState("")

  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForms = () => {
    setSignInEmail("")
    setSignInPassword("")
    setRegisterName("")
    setRegisterEmail("")
    setRegisterPassword("")
    setRegisterPhone("")
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await login({ email: signInEmail, password: signInPassword })
      toast.success("Signed in")
      resetForms()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.error("Invalid email or password")
      } else {
        toast.error(err instanceof Error ? err.message : "Could not sign in")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (registerPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setIsSubmitting(true)

    try {
      await register({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        phone: registerPhone || undefined,
      })
      toast.success("Account created")
      resetForms()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Email already registered")
      } else {
        toast.error(err instanceof Error ? err.message : "Could not create account")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account</h2>
          <p className="text-gray-600">Sign in or create an account to manage your shipments</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "bg-yellow-50 text-yellow-800 border-b-2 border-yellow-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                mode === "register"
                  ? "bg-yellow-50 text-yellow-800 border-b-2 border-yellow-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="p-6">
            {mode === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="signin-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="signin-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    required
                    minLength={8}
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-yellow-600 text-white font-semibold rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full name
                  </label>
                  <input
                    id="register-name"
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    required
                    minLength={8}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">At least 8 characters</p>
                </div>
                <div>
                  <label htmlFor="register-phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone number <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="register-phone"
                    type="tel"
                    value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-4 py-2 bg-yellow-600 text-white font-semibold rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
