"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MessageSquare, Mail, Lock, ArrowRight, AlertCircle } from "lucide-react"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setIsLoading(false)
      } else {
        // Redirect to dashboard on successful login
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <>
      <Header variant="public" />
      <div className="bg-background px-2.5 lg:px-0">
        <div className="container mx-auto relative border-l border-r border-slate-300 px-5 py-6 min-h-[calc(100vh-80px)]">
          <div className="flex flex-col items-center justify-center flex-1 my-auto">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <h1 className="text-foreground text-3xl font-bold mb-2">
                  Sign in to your account
                </h1>
                <p className="text-muted-foreground text-base">
                  Access your WhatsApp marketing automation platform
                </p>
              </div>

              <div className="p-8 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card">
                <form onSubmit={handleLogin} className="space-y-6">
                  {error && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
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
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) =>
                          setRememberMe(checked as boolean)
                        }
                        disabled={isLoading}
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm text-muted-foreground cursor-pointer"
                      >
                        Remember me
                      </Label>
                    </div>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-full border-2 border-green-950 hover:bg-green-950 hover:text-white transition-all"
                    disabled={isLoading || !email || !password}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        Signing in...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Sign In
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>

                <div className="mt-8 text-center space-y-4">
                  <div className="text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link
                      href="/signup"
                      className="text-primary font-medium hover:underline ml-1"
                    >
                      Create account
                    </Link>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full h-px bg-border" />
                    </div>
                    <span className="relative bg-white px-4 text-sm text-muted-foreground">
                      Or continue with
                    </span>
                  </div>

                  <Button
                    className="w-full h-12 rounded-full border-2 border-green-950 bg-white text-foreground hover:bg-green-950 hover:text-white transition-all"
                    onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                    disabled={isLoading}
                  >
                    <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </>
  )
}
