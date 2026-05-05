"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import {
  MessageSquare,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  Zap,
  Shield,
  Smartphone,
  Globe,
  Clock,
  Target,
  TrendingUp,
  ArrowRight,
  Star,
  Bot,
  Settings,
} from "lucide-react"

const features = [
  {
    icon: MessageSquare,
    title: "Bulk Messaging",
    description: "Send personalized messages to thousands of contacts instantly with advanced scheduling and delivery tracking.",
    highlights: [
      "Send up to 100,000 messages/day",
      "Personalized message templates",
      "Schedule campaigns in advance",
      "Real-time delivery tracking"
    ]
  },
  {
    icon: Users,
    title: "Contact Management",
    description: "Organize and segment your contacts with advanced filtering, tagging, and smart group management.",
    highlights: [
      "Unlimited contact storage",
      "Advanced segmentation",
      "Custom tags and labels",
      "Import/Export functionality"
    ]
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track delivery rates, open rates, and campaign performance with comprehensive analytics and reporting.",
    highlights: [
      "Real-time campaign metrics",
      "Detailed performance reports",
      "Conversion tracking",
      "Custom dashboard views"
    ]
  },
  {
    icon: Bot,
    title: "AI-Powered Automation",
    description: "Set up intelligent automated responses and chatbots to handle customer inquiries 24/7.",
    highlights: [
      "Smart chatbot builder",
      "Natural language processing",
      "Automated workflows",
      "Multi-language support"
    ]
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level security with end-to-end encryption, GDPR compliance, and advanced data protection.",
    highlights: [
      "End-to-end encryption",
      "GDPR compliant",
      "Role-based access control",
      "Audit logs and monitoring"
    ]
  },
  {
    icon: Smartphone,
    title: "Mobile Apps",
    description: "Manage your WhatsApp marketing on the go with our native iOS and Android mobile applications.",
    highlights: [
      "Native iOS & Android apps",
      "Push notifications",
      "Offline mode support",
      "Biometric authentication"
    ]
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description: "Connect with customers globally with support for 50+ languages and automatic translation.",
    highlights: [
      "50+ languages supported",
      "Auto-translation features",
      "Localized templates",
      "Regional compliance"
    ]
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience blazing-fast performance with optimized infrastructure and instant message delivery.",
    highlights: [
      "99.9% uptime guarantee",
      "Sub-second delivery",
      "Global CDN network",
      "Auto-scaling infrastructure"
    ]
  },
  {
    icon: Target,
    title: "Smart Targeting",
    description: "Reach the right audience with AI-powered targeting and behavioral analysis.",
    highlights: [
      "Behavioral targeting",
      "Predictive analytics",
      "Customer journey mapping",
      "A/B testing tools"
    ]
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Get help whenever you need it with our round-the-clock customer support team.",
    highlights: [
      "24/7 live chat support",
      "Dedicated account managers",
      "Comprehensive knowledge base",
      "Video tutorials and guides"
    ]
  },
  {
    icon: TrendingUp,
    title: "Growth Tools",
    description: "Scale your business with advanced growth tools and conversion optimization features.",
    highlights: [
      "Conversion optimization",
      "Growth hacking tools",
      "Performance insights",
      "Competitor analysis"
    ]
  },
  {
    icon: Settings,
    title: "Custom Integrations",
    description: "Connect with your favorite tools through our extensive API and integration marketplace.",
    highlights: [
      "REST API access",
      "Webhook support",
      "Zapier integration",
      "Custom app development"
    ]
  }
]

const categories = [
  {
    name: "Messaging & Communication",
    features: ["Bulk Messaging", "AI-Powered Automation", "Multi-Language Support", "Mobile Apps"]
  },
  {
    name: "Analytics & Insights",
    features: ["Analytics Dashboard", "Smart Targeting", "Growth Tools"]
  },
  {
    name: "Management & Organization",
    features: ["Contact Management", "Custom Integrations"]
  },
  {
    name: "Security & Reliability",
    features: ["Enterprise Security", "Lightning Fast", "24/7 Support"]
  }
]

export default function FeaturesPage() {
  return (
    <>
      {/* ─── HEADER ─── */}
      <Header
        variant="public"
        className="fixed top-0 left-0 right-0 z-50 border-b border-slate-300 bg-slate-900"
      />

      <main className="bg-background pt-16">

        {/* ══════════════════════════════════════════
            HERO SECTION – Features introduction
        ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-transparent px-2.5 lg:px-0">
          <div className="container mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-l border-r border-slate-300 px-5">
            <div className="text-center py-20">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-foreground text-4xl font-bold mb-4">
                Powerful Features for WhatsApp Marketing
              </h1>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-8">
                Everything you need to supercharge your WhatsApp marketing, engage customers, and grow your business.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/signup">
                    Start Free Trial
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link href="/demo">
                    Schedule Demo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CATEGORIES SECTION – Feature categories
        ══════════════════════════════════════════ */}
        <section className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Organized by Category
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Find exactly what you need with our organized feature categories
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
              {categories.map((category, index) => (
                <div
                  key={index}
                  className="p-6 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card"
                >
                  <h3 className="text-foreground text-lg font-semibold mb-4 text-center">
                    {category.name}
                  </h3>
                  <ul className="space-y-2">
                    {category.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURES GRID – Main features with detailed cards
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                All Features at a Glance
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Comprehensive tools designed to make WhatsApp marketing simple and effective
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="p-8 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group"
                >
                  <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-foreground text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.highlights.map((highlight, highlightIndex) => (
                      <li key={highlightIndex} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            COMPARISON SECTION – Feature comparison
        ══════════════════════════════════════════ */}
        <section className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Compare Plans & Features
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                See which features are included in each plan
              </p>
            </div>

            <div className="overflow-x-auto pb-20">
              <div className="min-w-full">
                <div className="grid grid-cols-12 gap-4 text-sm">
                  <div className="col-span-5 font-semibold text-foreground">Feature</div>
                  <div className="col-span-2 text-center font-semibold text-foreground">Free</div>
                  <div className="col-span-2 text-center font-semibold text-foreground">Professional</div>
                  <div className="col-span-3 text-center font-semibold text-foreground">Enterprise</div>
                </div>
                <div className="mt-4 space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 text-sm border-t border-gray-200 pt-3">
                      <div className="col-span-5">
                        <div className="flex items-center gap-2">
                          <feature.icon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-gray-700">{feature.title}</span>
                        </div>
                      </div>
                      <div className="col-span-2 text-center">
                        {index < 3 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        {index < 8 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400 mx-auto" />
                        )}
                      </div>
                      <div className="col-span-3 text-center">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA SECTION – Final call to action
        ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-transparent px-2.5 lg:px-0">
          <div className="container mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-l border-r border-t border-slate-300 px-5">
            <div className="text-center py-20">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Ready to Experience These Features?
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-10">
                Join thousands of businesses using ProDigiChat to transform their WhatsApp marketing.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full border border-slate-300"
                >
                  <Link href="/signup">
                    Start Free Trial
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                >
                  <Link href="/pricing">
                    View Pricing
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  )
}