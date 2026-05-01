"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import {
  MessageSquare,
  Send,
  Users,
  BarChart3,
  CheckCircle2,
  Zap,
  Shield,
  Smartphone,
  Globe,
  Clock,
  Target,
  TrendingUp,
  Moon,
  Sun,
  Menu,
  X,
  CreditCard,
  Download,
  ArrowUp,
} from "lucide-react"

/* ── Design tokens matching the Aspect palette ── */
/* For a cleaner setup, add these to tailwind.config.ts theme.extend.colors */
const features = [
  {
    icon: Send,
    title: "Bulk Messaging",
    description:
      "Send personalized WhatsApp messages to thousands of contacts instantly.",
  },
  {
    icon: Users,
    title: "Contact Management",
    description:
      "Organize and segment your contacts with advanced filtering options.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Track delivery rates, open rates, and campaign performance in real-time.",
  },
  {
    icon: Zap,
    title: "Auto-Reply System",
    description:
      "Set up intelligent automated responses for customer inquiries.",
  },
  {
    icon: MessageSquare,
    title: "Multi-Agent Support",
    description:
      "Collaborate with your team through shared inbox functionality.",
  },
  {
    icon: Shield,
    title: "WhatsApp Business API",
    description:
      "Official API integration for reliable and compliant messaging.",
  },
]

const stats = [
  { label: "Messages Delivered", value: "10M+" },
  { label: "Active Users", value: "50K+" },
  { label: "Countries", value: "120+" },
  { label: "Uptime", value: "99.9%" },
]

const capabilities = [
  {
    icon: Smartphone,
    title: "Mobile-First Design",
    description: "Manage campaigns on the go with our responsive interface.",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description:
      "Connect with customers worldwide through WhatsApp's network.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description:
      "Round-the-clock assistance to ensure your campaigns run smoothly.",
  },
  {
    icon: Target,
    title: "Targeted Campaigns",
    description: "Reach the right audience with precision targeting tools.",
  },
]

export default function LandingPage() {
  return (
    <>
     

      {/* ─── HEADER ─── */}
      <Header
        variant="public"
        className="fixed top-0 left-0 right-0 z-50 border-b border-slate-300 bg-slate-900"
      />

      <main className="bg-background">
        {/* ══════════════════════════════════════════
            HERO SECTION – Financial Dashboard Theme
        ══════════════════════════════════════════ */}
     
        <section className="relative overflow-hidden bg-transparent px-2.5 lg:px-0 pt-18">
          <div className="container mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-l border-r border-slate-300 px-5">

            <div className="grid gap-12 py-12 lg:grid-cols-[1fr_auto] lg:py-20 lg:pl-12">
              <div className="flex flex-col items-start justify-center  gap-5 lg:gap-8">
                <h1 className="text-foreground text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                  All Your WhatsApp Conversations in One Unified Dashboard
                </h1>
                <p className="text-muted-foreground text-base md:text-lg lg:text-xl leading-relaxed">
                  Manage bulk messaging, automate responses, and track campaign
                  performance. Reach customers instantly through the world&apos;s most
                  popular messaging platform.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="rounded-full">
                    <Link href="/pricing">
                      Try for free
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full">
                    <Link href="/pricing">
                      Book a demo
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="bg-muted inline-block w-full rounded-md p-3 sm:p-4 lg:w-[522px]">
                <div className="relative aspect-[522/572] w-full overflow-hidden rounded-md">
                  <img
                    src="/images/homepage/aspect-hero-image.webp"
                    alt="ProDigiChat dashboard showing messaging interface"
                    className="absolute inset-0 h-full w-full object-cover object-left-top"
                    loading="lazy"
                    width={522}
                    height={572}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            STATS BAR – dark, bordered container
        ══════════════════════════════════════════ */}
        <section className="bg-transparent  px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 text-center">
              {stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-foreground text-3xl font-bold mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-300 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURES GRID – light section, subtle cards
        ══════════════════════════════════════════ */}
        <section className="bg-transparent  border-slate-300 px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5 ">
            {/* Section header */}
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-gray-300 text-xl max-w-3xl mx-auto">
                Powerful features designed to help you connect with customers and
                grow your business through WhatsApp.
              </p>
            </div>

            {/* Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="p-8 rounded-sm border border-slate-300 bg-white transition-all hover:shadow-card"
                >
                  <div className="bg-primary/10 w-14 h-14 rounded-sm flex items-center justify-center mb-6">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-foreground text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            PRICING SECTION – three columns
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="container mx-auto relative border-l border-t border-r border-gray-300 px-0">
            <div className="px-6 py-8 lg:px-8 lg:py-16">
              <div className="flex flex-col items-center gap-4 lg:gap-6">
                <h1 className="text-gray-900 text-4xl font-semibold tracking-tight">Pricing</h1>
                <p className="text-gray-600 text-base">Choose the plan that fits your needs</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked="true"
                    data-state="checked"
                    value="on"
                    className="peer focus-visible:ring-blue-500 focus-visible:ring-offset-2 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 bg-white"
                    aria-label="Toggle annual vs. monthly billing"
                  >
                    <span data-state="checked" className="bg-gray-900 pointer-events-none block h-4 w-4 rounded-full shadow-lg transition-transform translate-x-4"></span>
                  </button>
                  <span className="text-gray-900 text-sm font-medium">Billed annually</span>
                </div>
              </div>
            </div>
            <div className="grid border-t border-gray-300 sm:grid-cols-2 lg:grid-cols-3">
              <div className="relative border-r border-gray-300 p-3 sm:border-b-0">
                <div className="text-gray-900 shadow-sm border-gray-300 h-full rounded-lg border bg-white/50">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-gray-900 text-2xl font-semibold">Free</h3>
                    <p className="text-gray-900 mt-2 text-lg font-medium">$0</p>
                  </div>
                  <div className="p-6 pt-0 flex flex-col space-y-6">
                    <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white shadow-sm hover:bg-gray-50 h-10 rounded-lg px-8">
                      Get started
                    </button>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Unlimited members</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">2 teams</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">500 issues</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Slack and Github integrations</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative border-r border-gray-300 bg-linear-to-b from-lime-50 to-green-50 p-3 sm:border-b-0">
                <div className="text-gray-900 shadow-sm border-gray-300 h-full  rounded-lg border bg-white/50">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-gray-900 text-2xl font-semibold">Startup</h3>
                    <p className="text-gray-900 mt-2 text-lg font-medium">$60 per user/annum</p>
                  </div>
                  <div className="p-6 pt-0 flex flex-col space-y-6">
                    <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-white shadow-sm hover:bg-gray-800 border border-gray-700 h-10 rounded-lg px-8">
                      7 day free trial
                    </button>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">All free plan features and...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">ProDigiChat AI</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Unlimited teams</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Unlimited issues and file uploads</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">ProDigiChat Insights</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Admin roles</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative p-3 sm:border-b-0">
                <div className="text-gray-900 shadow-sm border-gray-300 h-full rounded-lg border bg-white">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-gray-900 text-2xl font-semibold">Enterprise</h3>
                    <p className="text-gray-900 mt-2 text-lg font-medium">$120 per user/annum</p>
                  </div>
                  <div className="p-6 pt-0 flex flex-col space-y-6">
                    <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white shadow-sm hover:bg-gray-50 h-10 rounded-lg px-8">
                      Get started
                    </button>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">All free plan features and...</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">ProDigiChat AI</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Unlimited teams</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Unlimited issues and file uploads</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">ProDigiChat Insights</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Admin roles</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            DASHBOARD SECTION – product showcase
        ══════════════════════════════════════════ */}
        <section id="prodigichat-dashboard" className="relative overflow-hidden bg-transparent px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-gray-300 px-0">
            <div className="grid grid-cols-1 gap-4 border-b border-gray-300 px-6 pb-6 pt-20 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-12 lg:pt-32">
              <h1 className="text-foreground text-3xl font-semibold tracking-tight">See Every Message, Understand Every Campaign, and Act with Unmatched Speed</h1>
              <p className="text-gray-600 text-base">Our unified dashboard brings all your contacts, campaigns, and analytics into a single panoramic view—updated in real time.</p>
            </div>
            <div className="relative bg-linear-0 bg-gradient-to-br from-lime-50 to-green-50">
              <div className="z-10 p-5 lg:p-20">
                <div className="bg-white border rounded-sm p-2 sm:p-3 md:p-4 lg:rounded-md">
                  <div className="relative  aspect-video size-4xl overflow-hidden rounded-sm lg:rounded-md">
                    <img src="/images/homepage/dashboard/dashboard.webp" alt="ProDigiChat product interface showing messaging dashboard" className="absolute inset-0 size-full object-contain object-left-top" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start overflow-x-auto border-b border-t border-gray-300 bg-transparent lg:flex-row">
              <div className="text-foreground h-full min-h-56 w-full px-6 py-12 text-start lg:p-8  border-gray-300 last:border-0 lg:border-b-0 lg:border-r border-gray-300">
                <div className="flex h-full w-full justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">Click-Through Detail</h3>
                    <p className="mt-2 text-sm text-gray-600">Drill from high‑level numbers straight into the underlying messages, contacts, and campaign performance.</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-4 h-4">
                    <path d="M15 13a3 3 0 1 0-6 0"></path>
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"></path>
                    <circle cx="12" cy="8" r="2"></circle>
                  </svg>
                </div>
              </div>
              <div className="text-foreground h-full min-h-56 w-full px-6 py-12 text-start lg:p-8 border-b border-gray-300 last:border-0 lg:border-b-0 lg:border-r border-gray-300">
                <div className="flex h-full w-full justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">One-Click Campaigns</h3>
                    <p className="mt-2 text-sm text-gray-600">Launch WhatsApp campaigns in seconds—no complex setup required, just select contacts and send.</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-4 h-4">
                    <path d="m3 16 4 4 4-4"></path>
                    <path d="M7 20V4"></path>
                    <path d="m21 8-4-4-4 4"></path>
                    <path d="M17 4v16"></path>
                  </svg>
                </div>
              </div>
              <div className="text-foreground h-full min-h-56 w-full px-6 py-12 text-start lg:p-8 border-b border-gray-300 last:border-0 lg:border-b-0 lg:border-r border-gray-300">
                <div className="flex h-full w-full justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">Smart Alerts & Insights</h3>
                    <p className="mt-2 text-sm text-gray-600">Set thresholds once and get proactive notifications when delivery rates dip, responses spike, or engagement changes.</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-4 h-4">
                    <rect width="7" height="12" x="2" y="6" rx="1"></rect>
                    <path d="M13 8.32a7.43 7.43 0 0 1 0 7.36"></path>
                    <path d="M16.46 6.21a11.76 11.76 0 0 1 0 11.58"></path>
                    <path d="M19.91 4.1a15.91 15.91 0 0 1 .01 15.8"></path>
                  </svg>
                </div>
              </div>
              <div className="text-foreground h-full min-h-56 w-full px-6 py-12 text-start lg:p-8 border-b border-gray-300 last:border-0 lg:border-b-0 lg:border-r border-gray-300">
                <div className="flex h-full w-full justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">Enterprise-Grade Security</h3>
                    <p className="mt-2 text-sm text-gray-600">AES‑256 encryption, SOC&nbsp;2 Type II compliance, and MFA baked in to keep every message—and every customer—safe.</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-4 h-4">
                    <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v1"></path>
                    <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                    <rect width="8" height="5" x="2" y="13" rx="1"></rect>
                    <path d="M8 13v-2a2 2 0 1 0-4 0v2"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CAPABILITIES – dark section, dark cards
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="grid lg:grid-cols-2 gap-16 items-center py-20">
              {/* Left – copy + checklist */}
              <div>
                <h2 className="text-foreground text-4xl font-bold mb-6">
                  Why Choose ProDigiChat?
                </h2>
                <p className="text-muted-foreground text-xl mb-8 leading-relaxed">
                  We&apos;re built for businesses that want to leverage
                  WhatsApp&apos;s massive user base for marketing, customer
                  support, and sales automation.
                </p>

                <div className="space-y-4">
                  {[
                    "Official WhatsApp Business API integration",
                    "Advanced message scheduling and automation",
                    "Real-time analytics and reporting",
                    "Multi-language support",
                    "GDPR and privacy compliant",
                    "Enterprise-grade security",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right – 2×2 capability cards */}
              <div className="grid grid-cols-2 gap-4">
                {capabilities.map((capability, i) => (
                  <div
                    key={i}
                    className="bg-card p-6 rounded-sm border border-slate-300 transition-colors hover:bg-card/80"
                  >
                    <capability.icon className="h-8 w-8 text-primary mb-4" />
                    <h3 className="font-semibold text-card-foreground mb-2">
                      {capability.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {capability.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* ══════════════════════════════════════════
            FINAL CTA – dark, mirrors hero button style
        ══════════════════════════════════════════ */}
        <section className="bg-transparent  border-slate-300 px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center py-20">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Ready to Transform Your WhatsApp Marketing?
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-10">
                Join thousands of businesses using ProDigiChat to reach customers
                effectively.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring bg-card text-card-foreground shadow-sm hover:bg-card/90 border border-slate-300 h-12 px-6 py-[14px]"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 h-12 px-6 py-[14px]"
                >
                  Schedule Demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </>
  )
}