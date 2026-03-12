"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, ChevronRight, BarChart3, CheckCircle2, Zap, TrendingUp, MessageSquare, Users, Shield } from "lucide-react"
import { PublicFooter } from "@/components/public-footer"

interface PricingPlan {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  popular: boolean
  cta: string
}

const pricingPlans: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$0",
    period: "forever free",
    description: "Perfect for testing and small projects. Get started with essential WhatsApp marketing features.",
    features: [
      "Up to 500 contacts",
      "500 messages per month",
      "5 automation workflows",
      "Basic analytics",
      "Community support",
    ],
    popular: false,
    cta: "Start Free Trial",
  },
  {
    id: "professional",
    name: "Professional",
    price: "$49",
    period: "per month",
    description: "For growing businesses ready to scale their WhatsApp marketing operations.",
    features: [
      "10,000 contacts",
      "10,000 messages per month",
      "50 automation workflows",
      "Advanced analytics",
      "Priority support",
      "Campaign A/B testing",
      "Custom branding",
      "API access",
    ],
    popular: true,
    cta: "Start 14-Day Trial",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$199",
    period: "per month",
    description: "For large organizations with advanced needs and dedicated support.",
    features: [
      "Unlimited contacts",
      "Unlimited messages",
      "Unlimited automations",
      "Full analytics suite",
      "Dedicated account manager",
      "24/7 phone support",
      "Custom integrations",
      "White-label solution",
      "SSO & advanced security",
    ],
    popular: false,
    cta: "Contact Sales",
  },
]

const comparisonFeatures = [
  { name: "Messages/Month", starter: "500", professional: "10,000", enterprise: "Unlimited" },
  { name: "Contacts", starter: "500", professional: "10,000", enterprise: "Unlimited" },
  { name: "Automations", starter: "5", professional: "50", enterprise: "Unlimited" },
  { name: "Analytics", starter: "Basic", professional: "Advanced", enterprise: "Full Suite" },
  { name: "Support", starter: "Community", professional: "Priority", enterprise: "24/7" },
  { name: "API Access", starter: false, professional: true, enterprise: true },
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-muted-foreground">
              Choose the plan that fits your business needs. All plans include a 14-day free trial.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex items-center rounded-lg bg-muted p-1">
              <span className="text-sm font-medium mr-4">Bill</span>
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  billingCycle === "yearly"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Yearly <span className="ml-2 text-xs">Save 20%</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-300 ${
                  selectedPlan === plan.id
                    ? "ring-2 ring-primary scale-105 shadow-2xl"
                    : "hover:shadow-lg hover:scale-105"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 -right-3 z-10">
                    <Badge className="bg-primary text-primary-foreground text-xs font-semibold">
                      MOST POPULAR
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-primary">{plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <p className="text-center text-muted-foreground mb-6">
                    {plan.description}
                  </p>

                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.id === "starter" ? "/login" : `/pricing?plan=${plan.id}`}
                    className="block mt-6"
                  >
                    <Button
                      className="w-full bg-primary hover:bg-primary/90"
                      variant={plan.id === selectedPlan ? "default" : "outline"}
                    >
                      {plan.cta}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-foreground mb-8">
            Compare Plans Side by Side
          </h2>

          <Card>
            <CardContent className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 text-left text-sm font-semibold text-muted-foreground">
                      Feature
                    </th>
                    <th className="py-3 text-center text-sm font-semibold text-muted-foreground">
                      Starter
                    </th>
                    <th className="py-3 text-center text-sm font-semibold text-muted-foreground">
                      Professional
                    </th>
                    <th className="py-3 text-center text-sm font-semibold text-muted-foreground">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature) => (
                    <tr key={feature.name} className="border-b border-border/50">
                      <td className="py-4 text-sm font-medium">
                        {feature.name}
                      </td>
                      <td className="py-4 text-center text-sm">
                        <span className="font-semibold">{feature.starter}</span>
                      </td>
                      <td className="py-4 text-center text-sm">
                        <span className="font-semibold">{feature.professional}</span>
                      </td>
                      <td className="py-4 text-center text-sm">
                        <span className="font-semibold text-foreground">{feature.enterprise}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Breakdown */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Every Plan Includes
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Messages & Automation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>Messages & Automation</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Multi-step campaign wizard with A/B testing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Visual automation workflow builder</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Schedule campaigns with time zone support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Message templates & personalization</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>Analytics</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Real-time dashboards with charts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Campaign performance tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Contact growth analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Export data in multiple formats</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>Integrations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>WhatsApp Business API integration</span>
                  </li>
                    <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>CRM platform connectors (Shopify, Salesforce)</span>
                  </li>
                    <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Webhook & API access</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>E-commerce platform integrations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-8">
            Frequently Asked Questions
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {faqData.map((faq) => (
              <Card key={faq.id}>
                <CardHeader className="cursor-pointer">
                  <CardTitle className="font-semibold">
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {faq.answer}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-foreground mb-8 max-w-2xl mx-auto">
            Start your 14-day free trial. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Compare Plans
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto bg-background text-primary hover:bg-primary/90">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  )
}

// FAQ data
const faqData = [
  {
    id: 1,
    question: "What is WhatsApp Marketing Automation?",
    answer: "WhatsApp Marketing Automation is a platform that allows businesses to send automated messages, create targeted campaigns, and manage customer interactions on WhatsApp at scale. Our platform provides tools like campaign wizards, visual automation builders, and analytics to help you grow your business.",
  },
  {
    id: 2,
    question: "How does the free trial work?",
    answer: "The free trial gives you full access to all features for 14 days with no credit card required. After the trial, you can choose a paid plan that fits your needs.",
  },
  {
    id: 3,
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes will be prorated based on your remaining time in the current billing cycle.",
  },
  {
    id: 4,
    question: "Is my data secure?",
    answer: "Absolutely. We use enterprise-grade encryption for all data and follow industry best practices. Your data is protected and GDPR compliant.",
  },
  {
    id: 5,
    question: "Do I need to install anything?",
    answer: "No, everything is cloud-based. Just log in to your account from any web browser and start using WhatsApp Marketing Automation.",
  },
  {
    id: 6,
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.",
  },
]
