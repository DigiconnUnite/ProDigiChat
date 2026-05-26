"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import CTASection from "@/components/cta-section"
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
    title: "Bulk Campaigns",
    description: "Ek baar mein poori duniya ko message bhejo — personalized, scheduled, aur tracked.",
    highlights: [
      "1,00,000 messages/day tak",
      "Personalized message templates",
      "Schedule karo advance mein",
      "Real-time delivery tracking",
    ],
  },
  {
    icon: Users,
    title: "Contact Management",
    description: "Sab contacts ek jagah — clean, organized, aur action-ready.",
    highlights: [
      "CSV se import karo",
      "Advanced segmentation",
      "Custom tags aur labels",
      "Import/Export functionality",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Numbers jo real decisions dilwate hain — real-time, clear, aur exportable.",
    highlights: [
      "Real-time campaign metrics",
      "Detailed performance reports",
      "Conversion tracking",
      "CSV export available",
    ],
  },
  {
    icon: Bot,
    title: "Smart Automation",
    description: "Aap soye, bot jaage — 24/7 automated responses bina kisi extra staff ke.",
    highlights: [
      "Drag & drop workflow builder",
      "Keyword-based auto-replies",
      "Automated welcome messages",
      "Cart abandonment flows",
    ],
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Aapka data — sirf aapka. Bank-level security se har message protected.",
    highlights: [
      "AES-256 encryption",
      "GDPR compliant",
      "Role-based access control",
      "Audit logs aur monitoring",
    ],
  },
  {
    icon: Smartphone,
    title: "Mobile-Friendly",
    description: "Office se bahar? Koi baat nahi — ProDigiChat mobile pe bhi utna hi powerful.",
    highlights: [
      "Fully responsive design",
      "Push notifications",
      "On-the-go campaign management",
      "Touch-optimized interface",
    ],
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description: "Hinglish se English tak, Tamil se Bengali — aapki choice, aapki language.",
    highlights: [
      "50+ languages supported",
      "Localized templates",
      "Regional compliance",
      "Auto-translation features",
    ],
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Message bhejo, result turant — 99.9% uptime ke saath har time.",
    highlights: [
      "99.9% uptime guarantee",
      "Sub-second delivery",
      "Global CDN network",
      "Auto-scaling infrastructure",
    ],
  },
  {
    icon: Target,
    title: "Smart Targeting",
    description: "Sahi message, sahi insaan ko — AI-powered targeting se waste zero.",
    highlights: [
      "Behavioral targeting",
      "Predictive analytics",
      "Customer journey mapping",
      "A/B testing tools",
    ],
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Hum hain na — koi bhi problem ho, hum resolve karte hain.",
    highlights: [
      "24/7 live chat support",
      "Dedicated account managers",
      "Comprehensive knowledge base",
      "Video tutorials aur guides",
    ],
  },
  {
    icon: TrendingUp,
    title: "Growth Tools",
    description: "Grow karte raho bina ruke — conversion optimization se results multiply karo.",
    highlights: [
      "Conversion optimization",
      "Growth hacking tools",
      "Performance insights",
      "Competitor analysis",
    ],
  },
  {
    icon: Settings,
    title: "Custom Integrations",
    description: "Aapke existing stack ke saath connect karo — API, webhooks, Zapier sab available.",
    highlights: [
      "REST API access",
      "Webhook support",
      "Zapier integration",
      "Custom app development",
    ],
  },
]

const categories = [
  {
    name: "Messaging & Campaigns",
    features: ["Bulk Campaigns", "Smart Automation", "Multi-Language Support", "Mobile-Friendly"],
  },
  {
    name: "Analytics & Insights",
    features: ["Analytics Dashboard", "Smart Targeting", "Growth Tools"],
  },
  {
    name: "Management & Contacts",
    features: ["Contact Management", "Custom Integrations"],
  },
  {
    name: "Security & Reliability",
    features: ["Enterprise Security", "Lightning Fast", "24/7 Support"],
  },
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
          <div className="max-w-[1440px] mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-l border-r border-slate-300 px-5">
            <div className="text-center py-20">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-foreground text-4xl font-bold mb-4">
                ProDigiChat Ki Full Powers 💪
              </h1>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-8">
                Ek platform — sab kuch andar. Messaging se leke analytics tak, automation se leke live chat tak — yahan sab hai. Officially Meta ke through.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/signup">
                    Free Trial Shuru Karo
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link href="/support">
                    Demo Schedule Karo
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
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Category-Wise Dekho Kya Kya Hai
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Exactly woh features dhundo jo aapke business ke liye sabse zyada kaam ke hain.
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
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Har Feature — Ek Nazar Mein
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                ProDigiChat ke comprehensive tools — WhatsApp marketing ko simple aur effective banane ke liye design kiye gaye hain.
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
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Kaunse Plan Mein Kya Milta Hai?
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Har plan mein kaunse features hain — ek baar mein dekho aur decide karo.
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
            CTA SECTION – Reusable component
        ══════════════════════════════════════════ */}
        <CTASection
          title="Yeh Sab Features Try Karne Ke Liye Ready Ho? 🚀"
          description="Hazaron businesses ProDigiChat use kar rahe hain apna WhatsApp marketing transform karne ke liye. Aap kab shuru kar rahe ho?"
          primaryButton={{
            text: "Free Trial Shuru Karo",
            href: "/signup"
          }}
          secondaryButton={{
            text: "Pricing Dekho",
            href: "/pricing"
          }}
        />
      </main>

      <PublicFooter />
    </>
  )
}