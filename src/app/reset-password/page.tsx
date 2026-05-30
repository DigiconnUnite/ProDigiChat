"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import StripesBackground from "@/components/ui/StripesBackground"

const PASSWORD_HINT =
  "At least 8 characters with uppercase, lowercase, a number, and a special character."

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [checking, setChecking] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [purpose, setPurpose] = useState<"reset" | "invite">("reset")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setChecking(false)
      setTokenValid(false)
      return
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json()
        setTokenValid(Boolean(data.valid))
        if (data.purpose) setPurpose(data.purpose)
      })
      .catch(() => setTokenValid(false))
      .finally(() => setChecking(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to reset password.")
        setIsLoading(false)
        return
      }
      setDone(true)
      setTimeout(() => router.push("/login"), 2500)
    } catch {
      setError("Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  const heading =
    purpose === "invite" ? "Set your password" : "Choose a new password"

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="text-foreground text-2xl font-bold mb-1">{heading}</h1>
      </div>

      <div className="p-8 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card relative z-30">
        {checking ? (
          <p className="text-center text-sm text-muted-foreground">
            Validating your link…
          </p>
        ) : !tokenValid ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
            <p className="text-sm text-foreground">
              This link is invalid or has expired. Request a new one to
              continue.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              Request a new link
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : done ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-sm text-foreground">
              Your password has been set. Redirecting you to sign in…
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                New password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 border-2 border-green-950/20 focus:border-green-950 transition-colors"
                  disabled={isLoading}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">{PASSWORD_HINT}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-sm font-medium">
                Confirm password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="pl-10 h-12 border-2 border-green-950/20 focus:border-green-950 transition-colors"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-full border-2 border-green-950 hover:bg-green-950 hover:text-white transition-all"
              disabled={isLoading || !password || !confirm}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">Saving…</span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {purpose === "invite" ? "Activate account" : "Reset password"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <>
      <Header variant="public" />
      <div className="bg-background px-2.5 lg:px-0 relative">
        <div className="max-w-[1440px] mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-t border-l border-r border-slate-300 px-5 z-20">
          <StripesBackground position="full" opacity="opacity-10" />
          <div className="flex flex-col items-center justify-center py-20 min-h-[calc(100vh-80px)]">
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">Loading…</p>
              }
            >
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  )
}
