"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Headphones, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")
    setSuccessMessage("")

    // Client-side validation
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters")
      setIsLoading(false)
      return
    }

    try {
      // Register the user
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!data.ok) {
        setErrorMessage(data.error || "Registration failed")
        return
      }

      setSuccessMessage("Account created! Signing you in...")

      // Auto sign-in after successful registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push("/")
        router.refresh()
      } else {
        // If auto sign-in fails, redirect to login
        router.push("/login")
      }
    } catch {
      setErrorMessage("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800 backdrop-blur-sm relative">
        <CardHeader className="space-y-4 text-center pb-2">
          {/* Logo */}
          <div className="mx-auto flex items-center justify-center">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Headphones className="h-6 w-6 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-zinc-100">
              Create your account
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              Get started with OpenWorkflow AI Employees
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* Error message */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          {/* Success message */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300 text-sm">
                Full name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="h-11 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-violet-500 focus-visible:ring-violet-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300 text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-violet-500 focus-visible:ring-violet-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300 text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-violet-500 focus-visible:ring-violet-500/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-300 text-sm">
                Confirm password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-11 bg-zinc-800/50 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 focus-visible:border-violet-500 focus-visible:ring-violet-500/20"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-medium shadow-lg shadow-violet-500/20"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pb-6">
          <p className="text-sm text-zinc-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
