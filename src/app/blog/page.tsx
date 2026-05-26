"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
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
  Calendar,
  User,
  ArrowRight,
  BookOpen,
} from "lucide-react"

const blogPosts = [
  {
    id: 1,
    title: "10 WhatsApp Tricks Jo Aapka Business 10x Kar De",
    excerpt: "Proven strategies jo aapka engagement aur conversions boost karengi — real case studies ke saath.",
    author: "Sarah Johnson",
    publishedAt: "2024-01-15",
    readTime: 8,
    category: "Strategy",
    image: "/blog/whatsapp-marketing-strategies.svg",
  },
  {
    id: 2,
    title: "Bot Rakho, Insaan Ka Touch Bhi Raho — Yeh Hai Balance",
    excerpt: "Automation aur personalization ka perfect balance — customer service mein dono ka fayda uthao.",
    author: "Mike Chen",
    publishedAt: "2024-01-12",
    readTime: 6,
    category: "Automation",
    image: "/blog/whatsapp-automation.svg",
  },
  {
    id: 3,
    title: "Normal WhatsApp vs Business API — Kya Farq Hai Bhai?",
    excerpt: "Dono mein kya difference hai aur aapke business ke liye kaun sa sahi hai — poori clarity.",
    author: "Emily Davis",
    publishedAt: "2024-01-10",
    readTime: 10,
    category: "API",
    image: "/blog/whatsapp-business-api.svg",
  },
  {
    id: 4,
    title: "WhatsApp Marketing Mein Paisa Laga — Kitna Wapas Aaya?",
    excerpt: "ROI measure karne ke asaan tarike — kaunse metrics track karne chahiye aur kaise.",
    author: "David Wilson",
    publishedAt: "2024-01-08",
    readTime: 7,
    category: "Analytics",
    image: "/blog/whatsapp-analytics.svg",
  },
  {
    id: 5,
    title: "WhatsApp Group Se Business? Haan, Possible Hai!",
    excerpt: "WhatsApp communities ko kaise convert karein real business growth mein — step-by-step guide.",
    author: "Lisa Anderson",
    publishedAt: "2024-01-05",
    readTime: 9,
    category: "Community",
    image: "/blog/whatsapp-community.svg",
  },
  {
    id: 6,
    title: "WhatsApp Ban Se Kaise Bache — Compliance Ka Full Guide",
    excerpt: "Important rules aur best practices jo aapka account safe rakhenge — ban ka darr khatam karo.",
    author: "Robert Taylor",
    publishedAt: "2024-01-03",
    readTime: 8,
    category: "Compliance",
    image: "/blog/whatsapp-compliance.svg",
  },
]

const categories = ["Strategy", "Automation", "API", "Analytics", "Community", "Compliance"]


export default function BlogPage() {
  return (
    <>
      {/* ─── HEADER ─── */}
      <Header
        variant="public"
        className="fixed top-0 left-0 right-0 z-50 border-b border-slate-300 bg-slate-900"
      />

      <main className="bg-background pt-18">

        {/* ══════════════════════════════════════════
            FEATURED POSTS – highlighted articles
        ══════════════════════════════════════════ */}
        <section className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Must-Read Articles 📚
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                ProDigiChat ke experts dwara — strategies, tips, aur real case studies jo aapka WhatsApp marketing level-up karein.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {blogPosts.slice(0, 3).map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group overflow-hidden"
                >
                  <div className="aspect-video relative overflow-hidden bg-linear-to-br from-primary/10 to-primary/5 rounded-md mb-6 border border-slate-300">
                    <img
                      src="/blog-1.png"
                      alt={post.title}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 pt-0">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {post.readTime} min read
                      </div>
                    </div>
                    <h3 className="text-foreground text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                      <Link href={`/blog/${post.id}`}>{post.title}</Link>
                    </h3>
                    <p className="text-gray-700 leading-relaxed mb-4">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{post.author}</span>
                      </div>
                      <Link href={`/blog/${post.id}`}>
                        <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ALL POSTS – complete blog listing
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Poore Articles Padho
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                WhatsApp marketing insights ka poora collection — beginners se experts tak sab ke liye.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pb-20">
              {blogPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group"
                >
                  <div className="flex gap-6  pr-3">
                    <div className="aspect-video w-64 relative overflow-hidden bg-linear-to-br from-primary/10 to-primary/5 rounded-xl shrink-0 border border-slate-300">
                      <img
                        src="/blog-1.png"
                        alt={post.title}
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1 min-w-0 py-3 pr-0">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {post.readTime} min read
                        </div>
                      </div>
                      <h3 className="text-foreground text-lg font-semibold mb-2 group-hover:text-primary transition-colors min-w-0 flex-1">
                        <Link href={`/blog/${post.id}`} className="truncate block w-full">{post.title}</Link>
                      </h3>
                      <p className="text-gray-700 text-sm leading-relaxed mb-3 line-clamp-2">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{post.author}</span>
                        </div>
                        <Link href={`/blog/${post.id}`}>
                          <Button variant="ghost" size="sm">
                            Read More
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA SECTION – Reusable component
        ══════════════════════════════════════════ */}
        <CTASection
          title="WhatsApp Marketing Shuru Karna Hai? 🚀"
          description="Sirf padhna kaafi nahi — ProDigiChat pe shuru karo aur apne business ko actually grow karte dekho."
          primaryButton={{
            text: "Free Mein Shuru Karo",
            href: "/signup"
          }}
          secondaryButton={{
            text: "Support Se Baat Karo",
            href: "/support"
          }}
        />
      </main>

      <PublicFooter />
    </>
  )
}