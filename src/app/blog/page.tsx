"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import { PublicCTA } from "@/components/public-cta"
import {
  Calendar,
  Clock,
  User,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Users,
  MessageSquare
} from "lucide-react"
import { blogPosts, getFeaturedPosts, getAllCategories, getRecentPosts } from "@/lib/blog-data"

export default function BlogPage() {
  const featuredPosts = getFeaturedPosts()
  const recentPosts = getRecentPosts(6)
  const categories = getAllCategories()

  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />

      <main className="bg-background rounded-b-2xl md:rounded-b-4xl pt-32">
        {/* Hero Section */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className=" mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
                <BookOpen className="h-4 w-4" />
                WhatsApp Marketing Insights
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                Latest from our
                <span className="text-primary"> Blog</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover expert tips, strategies, and insights to supercharge your WhatsApp marketing campaigns and grow your business.
              </p>
            </div>
          </div>
        </section>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="pb-16">
            <div className="container mx-auto px-4">
              <div className=" mx-auto">
                <div className="flex items-center gap-2 mb-8">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Featured Articles</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {featuredPosts.map((post) => (
                  <Card key={post.id} className="group hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                    <div className="aspect-video relative overflow-hidden bg-linear-to-br from-primary/10 to-primary/5">
                      {post.image ? (
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <BookOpen className="h-12 w-12 text-primary/50" />
                        </div>
                      )}
                      <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground">
                        Featured
                      </Badge>
                    </div>
                    <CardContent className="p-6">
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
                      <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                      </h3>
                      <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{post.author}</span>
                        </div>
                        <Link href={`/blog/${post.slug}`}>
                          <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                            Read More
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Categories and Recent Posts */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className=" mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Categories Sidebar */}
              <div className="lg:col-span-1">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Categories
                  </h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <Link
                        key={category}
                        href={`/blog?category=${encodeURIComponent(category)}`}
                        className="block px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                      >
                        {category}
                      </Link>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Recent Posts Grid */}
              <div className="lg:col-span-3">
                <div className="flex items-center gap-2 mb-8">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Recent Articles</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {recentPosts.map((post) => (
                    <Card key={post.id} className="group hover:shadow-lg transition-shadow duration-300">
                      <CardContent className="p-6">
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
                        <Badge variant="secondary" className="mb-3">
                          {post.category}
                        </Badge>
                        <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors">
                          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                        </h3>
                        <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{post.author}</span>
                          </div>
                          <Link href={`/blog/${post.slug}`}>
                            <Button variant="ghost" size="sm">
                              Read More
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <PublicCTA
          title="Ready to Transform Your WhatsApp Marketing?"
          description="Join thousands of businesses already using Prodigichat to engage customers and drive growth."
          primaryButtonText="Start Free Trial"
          primaryButtonHref="/signup"
          secondaryButtonText="View Features"
          secondaryButtonHref="/features"
        />
      </main>

      <PublicFooter />
    </>
  )
}