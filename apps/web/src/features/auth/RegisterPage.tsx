import { type FormEvent, useState } from "react"
import { Link, useSearchParams } from "react-router"
import { AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { errorMessage } from "@/lib/query"
import { AuthCard } from "./LoginPage"
import { useRegister } from "./use-auth"

const MIN_PASSWORD_LENGTH = 8

export function RegisterPage() {
  const [searchParams] = useSearchParams()
  const register = useRegister()
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" })

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    register.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim() || undefined,
    })
  }

  return (
    <AuthCard title="Create an account" description="It takes less than a minute.">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {register.isError && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{errorMessage(register.error)}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" autoComplete="name" required value={form.name} onChange={update("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={update("email")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={form.password}
              onChange={update("password")}
            />
            <p className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters.</p>
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending && <Loader2 className="animate-spin" />}
            Create account
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to={{ pathname: "/login", search: searchParams.toString() }} className="font-medium underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </AuthCard>
  )
}
