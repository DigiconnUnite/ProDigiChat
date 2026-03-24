"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import { PublicCTA } from "@/components/public-cta"
import {
  Send,
  Users,
  BarChart3,
  Zap,
  MessageCircle,
  Workflow,
  Shield,
  Clock,
  Globe,
  ArrowRight,
  CheckCircle2
} from "lucide-react"

const featureCategories = [
  {
    title: "Messaging",
    icon: Send,
    features: [
      { name: "Bulk Messaging", description: "Send personalized messages to thousands of contacts simultaneously." },
      { name: "Rich Media Support", description: "Send images, videos, documents, and interactive buttons." },
      { name: "Template Management", description: "Create and manage WhatsApp message templates." },
    ]
  },
  {
    title: "Automation",
    icon: Zap,
    features: [
      { name: "Workflow Automation", description: "Create automation flows without coding." },
      { name: "Chatbots", description: "AI-powered chatbots for 24/7 customer support." },
      { name: "Auto Responses", description: "Instant replies for common queries." },
    ]
  },
  {
    title: "Contact Management",
    icon: Users,
    features: [
      { name: "Contact Import", description: "Import contacts from CSV, Excel, or CRM." },
      { name: "Segmentation", description: "Create targeted segments based on behavior." },
      { name: "Contact Profiles", description: "Complete profiles with interaction history." },
    ]
  },
  {
    title: "Analytics",
    icon: BarChart3,
    features: [
      { name: "Real-time Dashboard", description: "Live monitoring of campaigns and performance." },
      { name: "Campaign Reports", description: "Detailed reports with actionable insights." },
      { name: "Export Data", description: "Export reports in multiple formats." },
    ]
  },
  {
    title: "Collaboration",
    icon: MessageCircle,
    features: [
      { name: "Team Inbox", description: "Unified inbox for team collaboration." },
      { name: "Role Management", description: "Define roles and permissions." },
      { name: "Internal Chat", description: "Built-in team communication." },
    ]
  },
  {
    title: "Integration",
    icon: Workflow,
    features: [
      { name: "WhatsApp Business API", description: "Official API integration." },
      { name: "Third-party Tools", description: "Connect with Shopify, Zapier, and more." },
      { name: "Developer API", description: "Build custom integrations." },
    ]
  },
]

const platformFeatures = [
  { text: "Enterprise-grade security" },
  { text: "180+ countries supported" },
  { text: "99.9% uptime guarantee" },
  { text: "24/7 customer support" },
]

export default function FeaturesPage() {
  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />
      
      <main className="bg-background">
        {/* Hero */}
        <section className="pt-32 pb-16 bg-background rounded-b-[3rem]">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold">
              Features
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need for successful WhatsApp marketing.
            </p>
          </div>
        </section>

        {/* Feature Categories */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featureCategories.map((category, index) => (
                <Card key={index} className="border-border">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold">{category.title}</h3>
                    </div>
                    <ul className="space-y-3">
                      {category.features.map((feature, fIndex) => (
                        <li key={fIndex} className="text-sm">
                          <p className="font-medium">{feature.name}</p>
                          <p className="text-muted-foreground">{feature.description}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Features */}
        <section className="py-16 bg-green-950 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold">Platform Benefits</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-8">
              {platformFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <span>{feature.text}</span>
                </div>
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
          secondaryButtonText="View Pricing"
          secondaryButtonHref="/pricing"
        />
      </main>
      
      <PublicFooter />
    </>
  )
}
