"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Headphones, Github, Mail, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"

// ─── Login Form (uses useSearchParams, must be inside Suspense) ──────
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"
  const error = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(
    error === "CredentialsSignin" ? "Invalid email or password" : error ? "An error occurred during sign in" : ""
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrorMessage("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setErrorMessage("Invalid email or password")
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setErrorMessage("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl })
    } catch {
      setErrorMessage("Failed to sign in with " + provider)
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800 backdrop-blur-sm relative">
      <CardHeader className="space-y-4 text-center pb-2">
        {/* Logo */}
        <div className="mx-auto flex items-center justify-center">
          <div className="h-12 w-12 rounded-xl bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Headphones className="h-6 w-6 text-white" />
          </div>
        </div>
        <div>
          <CardTitle className="text-2xl font-bold text-zinc-100">
            Welcome back
          </CardTitle>
          <CardDescription className="text-zinc-400 mt-1">
            Sign in to your OpenWorkflow account
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

        {/* OAuth Buttons — only shown when providers are configured */}
        {(process.env.NEXT_PUBLIC_GITHUB_ENABLED === "true" || process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true") && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {process.env.NEXT_PUBLIC_GITHUB_ENABLED === "true" && (
                <Button
                  variant="outline"
                  className="h-11 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600"
                  onClick={() => handleOAuthSignIn("github")}
                  disabled={isLoading}
                  type="button"
                >
                  <Github className="h-4 w-4 mr-2" />
                  GitHub
                </Button>
              )}
              {process.env.NEXT_PUBLIC_GOOGLE_ENABLED === "true" && (
                <Button
                  variant="outline"
                  className="h-11 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 hover:border-zinc-600"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isLoading}
                  type="button"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Google
                </Button>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-900 px-2 text-zinc-500">or continue with email</span>
              </div>
            </div>
          </>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button
            type="submit"
            className="w-full h-11 bg-linear-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-medium shadow-lg shadow-violet-500/20"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pb-6">
        <p className="text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Create one
          </Link>
        </p>

      </CardFooter>
    </Card>
  )
}

// ─── Login Page (wraps LoginForm in Suspense for useSearchParams) ────
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      {/* Background gradient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <Suspense
        fallback={
          <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800 backdrop-blur-sm relative">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </CardContent>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
