"use client"

import React, { use } from "react"
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
  ArrowLeft,
  Share2,
  BookOpen,
  ArrowRight,
  Tag
} from "lucide-react"
import { blogPosts, getPostBySlug, getRecentPosts } from "@/lib/blog-data"
import { notFound } from "next/navigation"

interface BlogDetailPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = use(params)
  const post = getPostBySlug(slug)
  const recentPosts = getRecentPosts(3)

  if (!post) {
    notFound()
  }

  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />

      <main className="bg-background pt-32">
        {/* Back Navigation */}
        <section className="pb-8">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Link href="/blog" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
              </Link>
            </div>
          </div>
        </section>

        {/* Article Header */}
        <section className="pb-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <Badge className="mb-4">{post.category}</Badge>
                <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight mb-6">
                  {post.title}
                </h1>
                <p className="text-lg text-muted-foreground mb-6">{post.excerpt}</p>

                {/* Article Meta */}
                <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{post.readTime} min read</span>
                  </div>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Featured Image */}
              {post.image && (
                <div className="aspect-video relative overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 mb-8">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Article Content */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="prose prose-lg max-w-none prose-headings:text-foreground prose-headings:font-bold prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-6 prose-strong:text-foreground prose-strong:font-semibold">
                <div className="text-foreground leading-relaxed space-y-4">
                  {post.content.split('\n').map((paragraph, index) => {
                    if (paragraph.startsWith('#')) {
                      const level = paragraph.match(/^#+/)?.[0].length || 1
                      const text = paragraph.replace(/^#+\s*/, '')
                      const HeadingTag = `h${Math.min(level + 1, 6)}` as keyof React.JSX.IntrinsicElements
                      return <HeadingTag key={index} className="font-bold text-foreground mt-8 mb-4 first:mt-0">{text}</HeadingTag>
                    }
                    if (paragraph.trim() === '') {
                      return <div key={index} className="h-4" />
                    }
                    return <p key={index} className="text-foreground leading-relaxed mb-4 last:mb-0">{paragraph}</p>
                  })}
                </div>
              </div>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <Tag className="h-4 w-4" />
                    <span className="font-semibold">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Related Articles */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold mb-8">Recent Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {recentPosts.filter(p => p.id !== post.id).map((recentPost) => (
                  <Card key={recentPost.id} className="group hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(recentPost.publishedAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {recentPost.readTime} min
                        </div>
                      </div>
                      <Badge variant="secondary" className="mb-3">
                        {recentPost.category}
                      </Badge>
                      <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors">
                        <Link href={`/blog/${recentPost.slug}`}>{recentPost.title}</Link>
                      </h3>
                      <p className="text-muted-foreground mb-4 line-clamp-2">{recentPost.excerpt}</p>
                      <Link href={`/blog/${recentPost.slug}`}>
                        <Button variant="ghost" size="sm" className="p-0 h-auto">
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
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