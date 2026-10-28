import { type FormEvent, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage } from "@/lib/query"
import { useLogin } from "./use-auth"

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const login = useLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    login.mutate({ email: email.trim(), password })
  }

  return (
    <AuthCard title="Sign in" description="Track your shipments and send new packages.">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {searchParams.has("expired") && !login.isError && (
            <Alert>
              <AlertCircle />
              <AlertDescription>Your session expired. Sign in again to continue.</AlertDescription>
            </Alert>
          )}
          {login.isError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{errorMessage(login.error)}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {login.isPending && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link to={{ pathname: "/register", search: searchParams.toString() }} className="font-medium underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </AuthCard>
  )
}

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="mx-auto w-full max-w-sm pt-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children}
      </Card>
    </div>
  )
}
