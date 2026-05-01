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
  Calendar,
  User,
  ArrowRight,
  BookOpen,
} from "lucide-react"

const blogPosts = [
  {
    id: 1,
    title: "10 WhatsApp Marketing Strategies That Drive Results",
    excerpt: "Discover proven strategies to boost engagement and conversions through WhatsApp marketing campaigns.",
    author: "Sarah Johnson",
    publishedAt: "2024-01-15",
    readTime: 8,
    category: "Strategy",
    image: "/images/blog/whatsapp-strategy.jpg"
  },
  {
    id: 2,
    title: "How to Automate WhatsApp Responses Without Losing Personal Touch",
    excerpt: "Learn the balance between automation and personalization in WhatsApp customer service.",
    author: "Mike Chen",
    publishedAt: "2024-01-12",
    readTime: 6,
    category: "Automation",
    image: "/images/blog/whatsapp-automation.jpg"
  },
  {
    id: 3,
    title: "WhatsApp Business API vs Regular WhatsApp: What's the Difference?",
    excerpt: "Understanding the key differences and benefits of WhatsApp Business API for your business.",
    author: "Emily Davis",
    publishedAt: "2024-01-10",
    readTime: 10,
    category: "API",
    image: "/images/blog/whatsapp-api.jpg"
  },
  {
    id: 4,
    title: "Measuring ROI in WhatsApp Marketing: Key Metrics to Track",
    excerpt: "Essential metrics and KPIs to measure the success of your WhatsApp marketing campaigns.",
    author: "David Wilson",
    publishedAt: "2024-01-08",
    readTime: 7,
    category: "Analytics",
    image: "/images/blog/whatsapp-analytics.jpg"
  },
  {
    id: 5,
    title: "Building WhatsApp Communities That Convert",
    excerpt: "Step-by-step guide to creating and nurturing WhatsApp communities that drive business growth.",
    author: "Lisa Anderson",
    publishedAt: "2024-01-05",
    readTime: 9,
    category: "Community",
    image: "/images/blog/whatsapp-community.jpg"
  },
  {
    id: 6,
    title: "WhatsApp Marketing Compliance: Rules You Must Follow",
    excerpt: "Important compliance guidelines and best practices for WhatsApp marketing campaigns.",
    author: "Robert Taylor",
    publishedAt: "2024-01-03",
    readTime: 8,
    category: "Compliance",
    image: "/images/blog/whatsapp-compliance.jpg"
  }
]

const categories = ["Strategy", "Automation", "API", "Analytics", "Community", "Compliance"]

const stats = [
  { label: "Blog Posts", value: "150+" },
  { label: "Expert Authors", value: "25+" },
  { label: "Monthly Readers", value: "50K+" },
  { label: "Topics Covered", value: "30+" },
]

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
            STATS BAR – blog stats
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
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
            FEATURED POSTS – highlighted articles
        ══════════════════════════════════════════ */}
        <section className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Featured Articles
              </h2>
              <p className="text-gray-300 text-xl max-w-3xl mx-auto">
                Hand-picked insights and strategies to transform your WhatsApp marketing
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
              {blogPosts.slice(0, 3).map((post) => (
                <div
                  key={post.id}
                  className="p-8 rounded-sm border border-slate-300 bg-white transition-all hover:shadow-card group"
                >
                  <div className="aspect-video relative overflow-hidden bg-linear-to-br from-primary/10 to-primary/5 rounded-md mb-6">
                    <img
                      src={post.image || "/images/blog/default.jpg"}
                      alt={post.title}
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
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
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            ALL POSTS – complete blog listing
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                All Articles
              </h2>
              <p className="text-gray-300 text-xl max-w-3xl mx-auto">
                Browse our complete collection of WhatsApp marketing insights
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pb-20">
              {blogPosts.map((post) => (
                <div
                  key={post.id}
                  className="p-6 rounded-sm border border-slate-300 bg-white transition-all hover:shadow-card group"
                >
                  <div className="flex gap-6">
                    <div className="aspect-square w-24 relative overflow-hidden bg-linear-to-br from-primary/10 to-primary/5 rounded-md flex-shrink-0">
                      <img
                        src={post.image || "/images/blog/default.jpg"}
                        alt={post.title}
                        className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex-1">
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
                      <h3 className="text-foreground text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                        <Link href={`/blog/${post.id}`}>{post.title}</Link>
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
            CTA SECTION – final call to action
        ══════════════════════════════════════════ */}
        <section className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="container mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center py-20">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Ready to Transform Your WhatsApp Marketing?
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-10">
                Join thousands of businesses using ProDigiChat to reach customers effectively.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full border border-slate-300"
                >
                  <Link href="/signup">
                    Get Started Free
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                >
                  <Link href="/demo">
                    Schedule Demo
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