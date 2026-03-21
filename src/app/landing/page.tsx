"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import { MessageSquare, Send, Users, BarChart3, ArrowRight, CheckCircle2, Zap, LayoutDashboard, Megaphone, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: Send,
    title: "Bulk Messaging",
    description: "Send messages to thousands of contacts instantly with our optimized delivery system.",
  },
  {
    icon: Users,
    title: "Contact Management",
    description: "Organize and segment your contacts for targeted marketing campaigns.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Track message delivery, engagement rates, and campaign performance in real-time.",
  },
  {
    icon: Zap,
    title: "Automation",
    description: "Set up automated workflows for welcome messages, follow-ups, and more.",
  },
]

const benefits = [
  "WhatsApp Business API integration",
  "Unlimited message templates",
  "Real-time delivery tracking",
  "Multi-agent inbox",
  "Campaign scheduling",
  "Detailed analytics dashboards",
  "24/7 customer support",
  "Enterprise-grade security",
]

export default function LandingPage() {
  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />
      <div className=" bg-background rounded-b-4xl border">
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-32 pb-20 text-center">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Supercharge Your WhatsApp Marketing
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Reach your customers instantly with automated WhatsApp campaigns.
              Track engagement, manage contacts, and grow your business with our
              powerful platform.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
      </div>
        <PublicFooter />
    </>
  );
}
