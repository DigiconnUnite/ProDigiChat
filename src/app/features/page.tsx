"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Megaphone, TrendingUp, Workflow, BarChart3, Users, Shield, Zap, Globe, Phone, Layers, CheckCircle2, ArrowRight } from "lucide-react"
import { PublicFooter } from "@/components/public-footer"

interface FeatureCategory {
  id: string
  title: string
  description: string
  icon: any
  features: FeatureItem[]
}

interface FeatureItem {
  title: string
  description: string
}

const featureCategories: FeatureCategory[] = [
  {
    id: "campaigns",
    title: "Campaign Management",
    description: "Create, schedule, and manage targeted WhatsApp campaigns with advanced features",
    icon: Megaphone,
    features: [
      { title: "Multi-Step Campaign Wizard", description: "Guided wizard to create campaigns with audience selection, message composition, and scheduling" },
      { title: "Broadcast & Recurring", description: "One-time broadcasts and recurring scheduled campaigns for ongoing engagement" },
      { title: "A/B Testing", description: "Test multiple message variants to optimize performance" },
      { title: "Advanced Scheduling", description: "Schedule campaigns by timezone, set throttling rates, and manage time zones" },
      { title: "Message Templates", description: "Use pre-approved WhatsApp templates for compliance" },
      { title: "Personalization", description: "Dynamic tags and variables for personalized messages" },
    ],
  },
  {
    id: "automation",
    title: "Visual Automation",
    description: "Build complex customer journeys without writing code",
    icon: Workflow,
    features: [
      { title: "Drag-and-Drop Builder", description: "Intuitive visual interface for creating automation workflows" },
      { title: "Pre-Built Templates", description: "Ready-to-use automation workflows for common scenarios" },
      { title: "Multiple Triggers", description: "Contact added, message received, link clicked, and more" },
      { title: "Actions Library", description: "Send message, add tags, set attributes, and wait delays" },
      { title: "Conditional Logic", description: "Create branching paths with if/else conditions" },
      { title: "Wait Nodes", description: "Set delays between actions for perfect timing" },
      { title: "Human Handoff", description: "Escalate to human agents when needed" },
      { title: "Webhook Calls", description: "Integrate with external APIs and services" },
    ],
  },
  {
    id: "contacts",
    title: "Contacts & Segmentation",
    description: "Manage your audience with powerful tools",
    icon: Users,
    features: [
      { title: "Advanced Segmentation", description: "Create dynamic audience segments using multiple conditions" },
      { title: "Custom Attributes", description: "Store custom fields like lead score, last purchase, and more" },
      { title: "Tag Management", description: "Organize contacts with flexible tagging system" },
      { title: "Import/Export", description: "Bulk import contacts via CSV and export segments" },
      { title: "Contact Profiles", description: "Rich contact profiles with interaction history" },
      { title: "Opt-In/Out Management", description: "Manage consent and compliance" },
      { title: "Duplicate Detection", description: "Automatically identify and merge duplicate contacts" },
    ],
  },
  {
    id: "analytics",
    title: "Analytics & Reporting",
    description: "Get deep insights with comprehensive analytics",
    icon: BarChart3,
    features: [
      { title: "Real-Time Dashboards", description: "Live dashboards with interactive charts and metrics" },
      { title: "Campaign Reports", description: "Detailed performance reports for each campaign" },
      { title: "Automation Analytics", description: "Track workflow performance and drop-off points" },
      { title: "Contact Growth", description: "Monitor list growth and acquisition channels" },
      { title: "Message Analytics", description: "Track delivery, read, and click-through rates" },
      { title: "Custom Reports", description: "Build custom reports with drag-and-drop builder" },
      { title: "Data Export", description: "Export data in CSV, PDF, and more formats" },
      { title: "Funnel Analysis", description: "Analyze conversion funnels across campaigns" },
    ],
  },
  {
    id: "integrations",
    title: "Integrations & API",
    description: "Connect with your favorite tools and platforms",
    icon: Zap,
    features: [
      { title: "WhatsApp Business API", description: "Official integration for reliable message delivery" },
      { title: "CRM Platforms", description: "Connect with Salesforce, HubSpot, and more" },
      { title: "E-commerce", description: "Shopify, WooCommerce, and other platforms" },
      { title: "Webhooks", description: "Real-time sync and notifications" },
      { title: "REST API", description: "Full API access for custom integrations" },
      { title: "Custom Connectors", description: "Build custom integrations with webhook support" },
    ],
  },
  {
    id: "support",
    title: "Customer Support",
    description: "24/7 support and comprehensive documentation",
    icon: Shield,
    features: [
      { title: "24/7 Support", description: "Round-the-clock support with dedicated team" },
      { title: "Live Chat", description: "Real-time chat with your customers" },
      { title: "Knowledge Base", description: "Comprehensive documentation and guides" },
      { title: "Video Tutorials", description: "Step-by-step video tutorials and guides" },
      { title: "Community Forum", description: "Connect with other users and share tips" },
      { title: "Onboarding", description: "Guided onboarding for new team members" },
      { title: "Success Manager", description: "Dedicated success management team" },
    ],
  },
  {
    id: "security",
    title: "Security & Compliance",
    description: "Enterprise-grade security and data protection",
    icon: Globe,
    features: [
      { title: "End-to-End Encryption", description: "All data encrypted at rest and in transit" },
      { title: "GDPR Compliant", description: "Full GDPR compliance with data management tools" },
      { title: "SSO Support", description: "Single Sign-On and SAML integration" },
      { title: "2FA Authentication", description: "Two-factor authentication for all accounts" },
      { title: "Role-Based Access", description: "Granular permissions with RBAC system" },
      { title: "Activity Logs", description: "Complete audit trail of all actions" },
      { title: "Data Backup", description: "Automated daily backups with retention policies" },
      { title: "SOC 2 Certified", description: "Enterprise security certifications" },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business Platform",
    description: "Official WhatsApp Business API integration",
    icon: Phone,
    features: [
      { title: "Multi-Number Support", description: "Manage multiple WhatsApp Business Phone Numbers" },
      { title: "Template Management", description: "Create and submit message templates for approval" },
      { title: "Message Queue", description: "Robust queue system with retry logic" },
      { title: "Webhook Handling", description: "Real-time status updates and message receipts" },
      { title: "Quality Rating", description: "Monitor and maintain good quality rating" },
      { title: "Message Limits", description: "Track and manage message sending limits" },
      { title: "Media Management", description: "Upload and manage images, videos, and documents" },
    ],
  },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary to-background py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Powerful Features
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to supercharge your WhatsApp marketing
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/pricing">
                  <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                    Get Started Free
                  </Button>
                </Link>
              </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              All Features Explained
            </h2>
            <p className="text-muted-foreground">
              Comprehensive tools designed for every aspect of WhatsApp marketing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCategories.slice(0, 6).map((category) => (
              <Card key={category.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <category.icon className="h-8 w-8 text-primary" />
                    <div>
                      <CardTitle>{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {category.features.map((feature) => (
                      <li key={feature.title} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Why Choose WhatsApp CRM?
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Save Time & Resources",
                description: "Automate repetitive tasks and focus on strategy",
                icon: Zap,
              },
              {
                title: "Increase Engagement",
                description: "Higher open rates with personalized messaging",
                icon: MessageSquare,
              },
              {
                title: "Improve ROI",
                description: "Track performance and optimize campaigns",
                icon: BarChart3,
              },
              {
                title: "Scale Effortlessly",
                description: "Grow from 100 to 100,000+ contacts",
                icon: TrendingUp,
              },
              {
                title: "Stay Compliant",
                description: "WhatsApp API ensures policy compliance",
                icon: Shield,
              },
            ].map((benefit) => (
              <Card key={benefit.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <benefit.icon className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10" />
                    <CardTitle>{benefit.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-lg text-muted-foreground mb-4">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Loved by Marketers
            </h2>
            <p className="text-muted-foreground">
              Join thousands of satisfied customers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "\"WhatsApp CRM has transformed our marketing. The automation features saved us countless hours every week.\"",
                author: "Sarah Johnson",
                role: "Marketing Director",
                company: "Tech Startup Inc.",
              },
              {
                quote: "\"The visual automation builder is incredibly intuitive. We created complex workflows in minutes that used to take days.\"",
                author: "Mike Chen",
                role: "Growth Manager",
                company: "E-commerce Brand",
              },
              {
                quote: "\"Analytics are fantastic. We can now track everything in real-time and make data-driven decisions.\"",
                author: "Emily Rodriguez",
                role: "Analytics Lead",
                company: "Retail Chain",
              },
              {
                quote: "\"Customer support is excellent. The multi-agent inbox and quick replies have improved our response times by 60%.\"",
                author: "David Kim",
                role: "Customer Success Manager",
                company: "SaaS Company",
              },
              {
                quote: "\"Integration with our CRM was seamless. The webhook system keeps everything in sync automatically.\"",
                author: "Lisa Thompson",
                role: "Technical Lead",
                company: "Manufacturing Company",
              },
              {
                quote: "\"We scaled from 1,000 to 50,000 contacts without any issues. The platform handles everything smoothly.\"",
                author: "James Wilson",
                role: "Operations Manager",
                company: "Agency",
              },
            ].map((testimonial, index) => (
              <Card key={index} className="hover:shadow-md">
                <CardContent>
                  <div className="flex gap-4 mb-4">
                    {[1, 2, 3, 4, 5].map(() => (
                      <div key={Math.random()} className="w-3 h-3 rounded-full bg-primary/10" />
                    ))}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground mb-2">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground mb-1">{testimonial.role}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground italic">"{testimonial.quote}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-foreground mb-8 max-w-2xl mx-auto">
            Explore all features with our free trial or choose the perfect plan
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/pricing">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                View Pricing
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
