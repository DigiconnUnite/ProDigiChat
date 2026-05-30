"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import StripesBackground from "@/components/ui/StripesBackground"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (res.status === 429) {
        setError("Too many requests. Please try again in a few minutes.")
        setIsLoading(false)
        return
      }

      // Always show the same confirmation, regardless of whether the
      // email exists — the API does not reveal account existence.
      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header variant="public" />
      <div className="bg-background px-2.5 lg:px-0 relative">
        <div className="max-w-[1440px] mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-t border-l border-r border-slate-300 px-5 z-20">
          <StripesBackground position="full" opacity="opacity-10" />
          <div className="flex flex-col items-center justify-center py-20 min-h-[calc(100vh-80px)]">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <h1 className="text-foreground text-2xl font-bold mb-1">
                  Reset your password
                </h1>
                <p className="text-muted-foreground text-sm">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              <div className="p-8 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card relative z-30">
                {submitted ? (
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <p className="text-sm text-foreground">
                      If an account exists for <strong>{email}</strong>, a
                      password reset link is on its way. Check your inbox (and
                      spam folder). The link expires in 1 hour.
                    </p>
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to sign in
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
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-12 border-2 border-green-950/20 focus:border-green-950 transition-colors"
                          disabled={isLoading}
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-full border-2 border-green-950 hover:bg-green-950 hover:text-white transition-all"
                      disabled={isLoading || !email}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center">
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          Send reset link
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      )}
                    </Button>

                    <div className="text-center">
                      <Link
                        href="/login"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back to sign in
                      </Link>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  )
}
