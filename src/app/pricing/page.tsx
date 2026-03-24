"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import { PublicCTA } from "@/components/public-cta"
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Star
} from "lucide-react"
import { useState } from "react"

const plans = [
  {
    name: "Starter",
    description: "Perfect for small businesses.",
    monthlyPrice: 29,
    yearlyPrice: 24,
    features: [
      { text: "1,000 contacts", included: true },
      { text: "10,000 messages/mo", included: true },
      { text: "3 team members", included: true },
      { text: "1 phone number", included: true },
      { text: "Bulk messaging", included: true },
      { text: "Contact management", included: true },
      { text: "Basic analytics", included: true },
      { text: "Email support", included: true },
      { text: "Advanced automation", included: false },
      { text: "Team inbox", included: false },
      { text: "API access", included: false },
    ]
  },
  {
    name: "Professional",
    description: "For growing businesses.",
    monthlyPrice: 79,
    yearlyPrice: 66,
    highlight: true,
    features: [
      { text: "10,000 contacts", included: true },
      { text: "100,000 messages/mo", included: true },
      { text: "10 team members", included: true },
      { text: "3 phone numbers", included: true },
      { text: "Bulk messaging", included: true },
      { text: "Contact management", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Priority support", included: true },
      { text: "Advanced automation", included: true },
      { text: "Team inbox", included: true },
      { text: "API access", included: true },
    ]
  },
  {
    name: "Enterprise",
    description: "For large organizations.",
    monthlyPrice: 199,
    yearlyPrice: 166,
    features: [
      { text: "Unlimited contacts", included: true },
      { text: "Unlimited messages", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Unlimited phone numbers", included: true },
      { text: "Bulk messaging", included: true },
      { text: "Contact management", included: true },
      { text: "Advanced analytics", included: true },
      { text: "24/7 dedicated support", included: true },
      { text: "Advanced automation", included: true },
      { text: "Team inbox", included: true },
      { text: "Full API access", included: true },
    ]
  }
]

const faqs = [
  {
    question: "What's included in the free trial?",
    answer: "The 14-day free trial gives you full access to all Professional plan features. No credit card required."
  },
  {
    question: "Can I change plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards and PayPal."
  },
  {
    question: "Is there a long-term contract?",
    answer: "No long-term contracts. All plans are month-to-month and you can cancel anytime."
  },
]

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />
      
      <main className="bg-background">
        {/* Hero */}
        <section className="pt-32 pb-16 bg-background rounded-b-[3rem]">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold">
              Pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the perfect plan for your business. Start with a 14-day free trial.
            </p>
            
            {/* Billing Toggle */}
            <div className="mt-8 inline-flex items-center gap-4 p-1 bg-muted rounded-full">
              <button
                onClick={() => setIsYearly(false)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  !isYearly ? "bg-background shadow" : ""
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsYearly(true)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  isYearly ? "bg-background shadow" : ""
                }`}
              >
                Yearly
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 -mt-8">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {plans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`border-border ${plan.highlight ? "border-primary border-2" : ""}`}
                >
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <span className="text-4xl font-bold">
                        ${isYearly ? plan.yearlyPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <ul className="space-y-3">
                      {plan.features.map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-center gap-3 text-sm">
                          {feature.included ? (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                          )}
                          <span className={feature.included ? "" : "text-muted-foreground/50"}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Link href="/signup" className="w-full">
                      <Button 
                        className="w-full" 
                        variant={plan.highlight ? "default" : "outline"}
                      >
                        Start Free Trial
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Simple FAQ */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="max-w-7xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="p-4">
                    <p className="font-medium">{faq.question}</p>
                    <p className="text-sm text-muted-foreground mt-2">{faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <PublicCTA
          title="Ready to get started?"
          description="Start your 14-day free trial today."
          primaryButtonText="Start Free Trial"
          primaryButtonHref="/signup"
          secondaryButtonText="Contact Sales"
          secondaryButtonHref="/contact"
        />
      </main>
      
      <PublicFooter />
    </>
  )
}
