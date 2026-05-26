"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import StripesBackground from "@/components/ui/StripesBackground"
import CTASection from "@/components/cta-section"
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
    icon: Users,
    title: "Contact Ka Full Control",
    description:
      "CSV se import karo, custom tags lagao, segments banao. VIP customers, cold leads, loyal buyers — sab ek jagah manage karo.",
  },
  {
    icon: Send,
    title: "1 Click — Lakhon Messages",
    description:
      "Ek baar mein poore contact list ko personalized messages bhejo. {{name}} variables se har message feel hoga personally written.",
  },
  {
    icon: BarChart3,
    title: "Data Jo Samajh Mein Aaye",
    description:
      "Delivered, Read, Replied, Clicked — har metric real-time dashboard mein. Ab andaze pe nahi, data pe decisions lena shuru karo.",
  },
  {
    icon: MessageSquare,
    title: "Ek Jagah Se Sab Baat-Cheet",
    description:
      "Multiple agents, ek shared inbox. Customer ne reply kiya? Turant dikhega. Poori team saath mein conversations manage kar sakti hai.",
  },
  {
    icon: Target,
    title: "Sahi Message, Sahi Insaan Ko",
    description:
      "Behavior, tags, aur attributes se dynamic audience segments banao — phir unhe precisely target karo.",
  },
  {
    icon: Shield,
    title: "100% Safe — Ban Ka Zero Darr",
    description:
      "Official Meta WhatsApp Cloud API use karta hai ProDigiChat. Account 100% safe, GDPR compliant, aur policy-friendly.",
  },
]

const stats = [
  { label: "Setup Time", value: "< 5 Min" },
  { label: "WhatsApp Network", value: "2.5B+" },
  { label: "Meta Verified API", value: "✓ Official" },
  { label: "Message Delivery", value: "98%+" },
]

const capabilities = [
  {
    icon: Smartphone,
    title: "Mobile Pe Bhi Kaam Kare",
    description: "Office se bahar? Koi baat nahi. ProDigiChat mobile pe bhi utna hi smooth hai.",
  },
  {
    icon: Globe,
    title: "Poori Duniya Tak Pahuncho",
    description:
      "WhatsApp ke 2.5 billion+ users ka network — apne customers se kahan bhi connect karo.",
  },
  {
    icon: Clock,
    title: "24/7 Support Hamesha",
    description:
      "Koi bhi problem ho — din ho ya raat, hum available hain. Aapka business kabhi nahi rukta.",
  },
  {
    icon: Target,
    title: "Precision Targeting",
    description: "Sahi campaign, sahi audience — ProDigiChat ke smart segmentation tools ke saath.",
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
          <div className="max-w-[1440px] mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-l border-r border-slate-300 px-5">
            <StripesBackground position="full" opacity="opacity-10" />

            <div className="grid gap-12 pt-12 lg:grid-cols-[1fr_1fr] lg:pt-20 lg:pl-12 pb-0 lg:pb-0 min-h-[400px] lg:min-h-[500px] relative z-30">
              <div className="flex flex-col items-start justify-center  gap-5 lg:gap-8">
                <h1 className="text-foreground text-3xl font-medium tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                  Ab WhatsApp Se Karo Business Grow! 🚀
                </h1>
                <p className="text-muted-foreground text-base md:text-lg lg:text-xl leading-relaxed">
                  Kya aap abhi bhi manually messages copy-paste kar rahe ho? Chodo yeh jugaad — ProDigiChat se 1 click mein lakhon customers tak pahuncho, automatically.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild size="lg" className="rounded-full">
                    <Link href="/signup">
                      Bilkul Free Mein Shuru Karo
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="rounded-full">
                    <Link href="/support">
                      Live Demo Dekho
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  ✅ No credit card needed &nbsp;✅ 5 minute setup &nbsp;✅ Cancel anytime
                </p>
              </div>

              <div className="relative z-30">
                <img
                  src="/hero-image.png"
                  alt="ProDigiChat dashboard showing messaging interface"
                  className="absolute bottom-0 right-0 w-full max-w-150 h-auto object-contain"
                  loading="lazy"
                  width={600}
                  height={657}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            STATS BAR – dark, bordered container
        ══════════════════════════════════════════ */}
        <section className="bg-transparent  px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 text-center">
              {stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-foreground text-2xl font-bold mb-1">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FEATURES GRID – light section, subtle cards
        ══════════════════════════════════════════ */}
        <section className="bg-transparent  border-slate-300 px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5 ">
            {/* Section header */}
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Sab Kuch Ek Jagah — Zero Jhanjhat
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                ProDigiChat mein woh sab hai jo aapka business WhatsApp pe dominate karne ke liye chahiye — chote business se badi company tak.
              </p>
            </div>

            {/* Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="p-8 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group"
                >
                  <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-foreground text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
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
          <div className="max-w-[1440px] mx-auto relative border-l border-t border-r border-gray-300 px-0">
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
                        <span className="text-gray-900 text-sm">Up to 1,000 contacts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Basic analytics</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">1 WhatsApp Business account</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Email support</span>
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
                        <span className="text-gray-900 text-sm">All Free plan features</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Up to 10,000 contacts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Advanced analytics & reporting</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">3 WhatsApp Business accounts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Priority support</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Custom templates</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative p-3 sm:border-b-0">
                <div className="text-gray-900 shadow-sm border-gray-300 h-full rounded-lg border bg-white">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-gray-900 text-2xl font-semibold">Enterprise</h3>
                    <p className="text-gray-900 mt-2 text-lg font-medium">Custom pricing</p>
                  </div>
                  <div className="p-6 pt-0 flex flex-col space-y-6">
                    <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white shadow-sm hover:bg-gray-50 h-10 rounded-lg px-8">
                      Contact sales
                    </button>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">All Startup plan features</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Unlimited contacts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Unlimited WhatsApp accounts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Custom integrations</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">Dedicated account manager</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check text-green-600 w-4 h-4">
                          <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                        <span className="text-gray-900 text-sm">SLA guarantee</span>
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
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-gray-300 px-0">
            <div className="grid grid-cols-1 gap-4 border-b border-gray-300 px-6 pb-6 pt-20 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pb-12 lg:pt-32">
              <h1 className="text-foreground text-3xl font-semibold tracking-tight">Dekho Kitna Simple Hai 👇</h1>
              <p className="text-gray-600 text-base">Fancy setup nahi chahiye. Koi coding nahi chahiye. Bas login karo aur kaam shuru karo — aur real-time mein dekho sab kuch kaise kaam karta hai.</p>
            </div>
            <div className="relative bg-linear-0 bg-linear-to-brrom-lime-50 to-green-50">
              <div className="z-10 p-5 lg:p-20">
                <div className="bg-white border rounded-sm p-2 sm:p-3 md:p-4 lg:rounded-md">
                  <div className="relative  aspect-video size-4xl overflow-hidden rounded-sm lg:rounded-md">
                    <img src="/blog-1.png" alt="ProDigiChat product interface showing messaging dashboard" className="absolute inset-0 size-full object-contain object-top-left" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start overflow-x-auto border-b border-t border-gray-300 bg-transparent lg:flex-row">
              <div className="text-foreground h-full min-h-56 w-full px-6 py-12 text-start lg:p-8  border-gray-300 last:border-0 lg:border-b-0 lg:border-r border-gray-300">
                <div className="flex h-full w-full justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">Click-Through Detail</h3>
                    <p className="mt-2 text-sm text-gray-600">Campaign ke andar tak jaao — message level pe dekho kaunse contacts ne respond kiya aur kaunse nahi.</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-4 h-4">
                    <path d="M15 13a3 3 0 1 0-6 0"></path>
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"></path>
                    <circle cx="12" cy="8" r="2"></circle>
                  </svg>
                </div>
              </div>
              <div className="text-foreground h-full min-h-56 w-full px-6 py-12 text-start lg:p-8 border-b  last:border-0 lg:border-b-0 lg:border-r border-gray-300">
                <div className="flex h-full w-full justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">One-Click Campaigns</h3>
                    <p className="mt-2 text-sm text-gray-600">Audience select karo, message type karo, bhejo. Bas itna. Setup mein 2 minute se zyada nahi lagega.</p>
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
                    <p className="mt-2 text-sm text-gray-600">Delivery rate giri? Reply spike aaya? ProDigiChat turant notify karta hai — act karo before it's too late.</p>
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
                    <p className="mt-2 text-sm text-gray-600">AES-256 encryption, role-based access, aur audit logs. Aapka aur customers ka data 100% safe.</p>
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
          <div className="max-w-[1440px] mx-auto relative border-l border-r border-slate-300 px-5">
            <div className="grid lg:grid-cols-2 gap-16 items-center py-20">
              {/* Left – copy + checklist */}
              <div>
                <h2 className="text-foreground text-4xl font-bold mb-6">
                  Kyun Choose Karein ProDigiChat? 🤔
                </h2>
                <p className="text-muted-foreground text-xl mb-8 leading-relaxed">
                  Hum banaye gaye hain un businesses ke liye jo WhatsApp ki
                  massive user base ko marketing, support, aur sales automation
                  ke liye use karna chahte hain — India mein aur globally.
                </p>

                <div className="space-y-4">
                  {[
                    "Official WhatsApp Business API integration",
                    "Advanced message scheduling aur automation",
                    "Real-time analytics aur detailed reporting",
                    "Multi-language support — Hinglish bhi!",
                    "GDPR aur privacy compliant",
                    "Enterprise-grade security",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right – 2×2 capability cards */}
              <div className="grid grid-cols-2 gap-4">
                {capabilities.map((capability, i) => (
                  <div
                    key={i}
                    className="bg-card p-6 rounded-xl border-2 border-green-950 transition-colors hover:bg-card/80"
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
            FINAL CTA – Reusable component
        ══════════════════════════════════════════ */}
        <CTASection
          title="Ab Aur Wait Kisliye? 🚀"
          description="Har din jo aap manually messages bhejte ho, woh ek din hai jo competitors aage nikal rahe hain. ProDigiChat pe switch karo — free mein — aur dekhte hai kaisa lagta hai jab marketing khud kaam kare."
          primaryButton={{
            text: "Free Mein Shuru Karo",
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