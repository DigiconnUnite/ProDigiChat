"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import CTASection from "@/components/cta-section"
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Star,
  MessageSquare,
  Users,
  BarChart3,
  Zap,
  Shield,
  Smartphone,
  Globe,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react"
import { useState } from "react"

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started with WhatsApp marketing.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      { text: "100 contacts", included: true },
      { text: "1,000 messages/month", included: true },
      { text: "1 team member", included: true },
      { text: "Basic analytics", included: true },
      { text: "Email support", included: true },
      { text: "WhatsApp Business API setup", included: true },
      { text: "Basic templates", included: true },
      { text: "Priority support", included: false },
      { text: "Advanced automation", included: false },
      { text: "Team collaboration", included: false },
      { text: "API access", included: false },
      { text: "Custom branding", included: false },
    ]
  },
  {
    name: "Professional",
    description: "For growing businesses that need more power.",
    monthlyPrice: 60,
    yearlyPrice: 48,
    highlight: true,
    features: [
      { text: "10,000 contacts", included: true },
      { text: "100,000 messages/month", included: true },
      { text: "10 team members", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Priority support", included: true },
      { text: "WhatsApp Business API setup", included: true },
      { text: "Advanced templates", included: true },
      { text: "Advanced automation", included: true },
      { text: "Team collaboration", included: true },
      { text: "API access", included: true },
      { text: "Custom branding", included: false },
      { text: "Dedicated account manager", included: false },
    ]
  },
  {
    name: "Enterprise",
    description: "For large organizations with custom needs.",
    monthlyPrice: 120,
    yearlyPrice: 96,
    features: [
      { text: "Unlimited contacts", included: true },
      { text: "Unlimited messages", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Enterprise analytics", included: true },
      { text: "24/7 dedicated support", included: true },
      { text: "WhatsApp Business API setup", included: true },
      { text: "Custom templates", included: true },
      { text: "Advanced automation", included: true },
      { text: "Team collaboration", included: true },
      { text: "Full API access", included: true },
      { text: "Custom branding", included: true },
      { text: "Dedicated account manager", included: true },
    ]
  }
]

const faqs = [
  {
    question: "What's included in the free plan?",
    answer: "The free plan includes basic WhatsApp messaging features, up to 100 contacts, and 1,000 messages per month. Perfect for testing and small-scale use."
  },
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, PayPal, and wire transfers for Enterprise plans."
  },
  {
    question: "Is there a long-term contract?",
    answer: "No long-term contracts. All plans are month-to-month and you can cancel anytime. Yearly plans offer a 20% discount."
  },
  {
    question: "Do you offer a free trial?",
    answer: "Yes! All paid plans come with a 14-day free trial. No credit card required for the trial period."
  },
  {
    question: "What is WhatsApp Business API?",
    answer: "It's the official API from Meta that allows businesses to send messages at scale. We help you get set up and manage it easily."
  }
]

const features = [
  {
    icon: MessageSquare,
    title: "Bulk Messaging",
    description: "Send personalized messages to thousands of contacts instantly."
  },
  {
    icon: Users,
    title: "Contact Management",
    description: "Organize and segment your contacts with advanced filtering."
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track delivery rates, open rates, and campaign performance."
  },
  {
    icon: Zap,
    title: "Auto-Reply System",
    description: "Set up intelligent automated responses for customer inquiries."
  }
]

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <>
      {/* ─── HEADER ─── */}
      <Header
        variant="public"
        className="fixed top-0 left-0 right-0 z-50 border-b border-slate-300 bg-slate-900"
      />

      <main className="bg-background pt-16">

        {/* ══════════════════════════════════════════
            HERO SECTION – Pricing introduction
        ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-transparent px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-l border-r border-slate-300 px-5">
            <div className="text-center py-20">
              <h1 className="text-foreground text-4xl font-bold mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-8">
                Choose the perfect plan for your business. Start with our free plan or upgrade as you grow.
              </p>
              
              {/* Billing Toggle */}
              <div className="inline-flex items-center gap-4 p-1 bg-white border border-slate-300 rounded-full">
                <button
                  onClick={() => setIsYearly(false)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    !isYearly ? "bg-primary text-primary-foreground shadow" : "text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsYearly(true)}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                    isYearly ? "bg-primary text-primary-foreground shadow" : "text-foreground"
                  }`}
                >
                  Yearly
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PRICING CARDS – Main pricing plans
        ══════════════════════════════════════════ */}
        <section className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="grid lg:grid-cols-3 gap-6 py-20">
              {plans.map((plan, index) => (
                <div
                  key={index}
                  className={`relative p-8 rounded-xl border-2 transition-all hover:shadow-card group ${
                    plan.highlight 
                      ? "border-primary bg-primary/5" 
                      : "border-green-950 bg-white"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        Most Popular
                      </div>
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <h3 className="text-foreground text-2xl font-bold mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {plan.description}
                    </p>
                    
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-foreground">
                        ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-muted-foreground text-lg">/month</span>
                      {plan.monthlyPrice > 0 && isYearly && (
                        <div className="text-sm text-green-600 mt-2">
                          Billed annually (${plan.yearlyPrice * 12}/year)
                        </div>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-3 text-sm">
                        {feature.included ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className={feature.included ? "text-gray-700" : "text-gray-400"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/signup" className="block">
                    <Button 
                      className="w-full rounded-full h-12"
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.monthlyPrice === 0 ? "Get Started Free" : "Start Free Trial"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURES SECTION – Included features highlight
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Powerful features included in every plan to help you connect with customers.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-6 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card text-center"
                >
                  <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-foreground text-lg font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ SECTION – Frequently asked questions
        ══════════════════════════════════════════ */}
        <section className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Got questions? We've got answers.
              </p>
            </div>

            <div className="max-w-4xl mx-auto pb-20">
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card"
                  >
                    <h3 className="text-foreground text-lg font-semibold mb-3">
                      {faq.question}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA SECTION – Reusable component
        ══════════════════════════════════════════ */}
        <CTASection
          title="Ready to Get Started?"
          description="Join thousands of businesses using ProDigiChat to reach customers effectively."
          primaryButton={{
            text: "Start Free Trial",
            href: "/signup"
          }}
          secondaryButton={{
            text: "Schedule Demo",
            href: "/demo"
          }}
        />
      </main>

      <PublicFooter />
    </>
  )
}
