"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import { PublicCTA } from "@/components/public-cta"
import {
  MessageSquare,
  Send,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Clock,
  Star
} from "lucide-react"

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
  {
    icon: MessageSquare,
    title: "Multi-Agent Inbox",
    description: "Collaborate with your team to manage customer conversations efficiently.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption and GDPR compliance to keep your data safe.",
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
      
      <main className=" bg-background rounded-b-2xl md:rounded-b-4xl">
        {/* Hero Section - Simple & Clean */}
        <section className="pt-32 pb-20  ">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground leading-tight">
                Supercharge Your
                <span className="text-primary"> WhatsApp Marketing</span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground">
                Reach your customers instantly with automated WhatsApp campaigns.
                Track engagement, manage contacts, and grow your business.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/features">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Learn More
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Simple CTA */}
        <PublicCTA
          title="Ready to Get Started?"
          description="Join thousands of businesses already using Prodigichat to connect with their customers."
          primaryButtonText="Start Free Trial"
          primaryButtonHref="/signup"
          secondaryButtonText="View Pricing"
          secondaryButtonHref="/pricing"
        />
      </main>
      
      <PublicFooter />
    </>
  )
}
