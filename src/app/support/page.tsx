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
  Headphones,
  Mail,
  Phone,
  HelpCircle,
  FileText,
  Video,
  MessageCircle,
  ExternalLink,
} from "lucide-react"

const supportCategories = [
  {
    icon: BookOpen,
    title: "Knowledge Base",
    description: "Browse our comprehensive guides and tutorials to get the most out of ProDigiChat.",
    items: [
      "Getting Started Guide",
      "Campaign Setup Tutorial",
      "API Documentation",
      "Best Practices",
      "Troubleshooting Common Issues"
    ]
  },
  {
    icon: MessageCircle,
    title: "Live Chat Support",
    description: "Get instant help from our support team through live chat during business hours.",
    items: [
      "Available 9 AM - 6 PM EST",
      "Average response time: 2 minutes",
      "Priority support for paid plans",
      "Screen sharing capabilities",
      "Multi-language support"
    ]
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Send us detailed questions and receive comprehensive responses from our experts.",
    items: [
      "Response within 24 hours",
      "Detailed troubleshooting",
      "Attachment support",
      "Ticket tracking system",
      "Escalation to senior team"
    ]
  },
  {
    icon: Video,
    title: "Video Tutorials",
    description: "Watch step-by-step video guides to master ProDigiChat features and workflows.",
    items: [
      "Platform overview",
      "Advanced features walkthrough",
      "Integration setup guides",
      "Campaign optimization tips",
      "Regularly updated content"
    ]
  }
]

const faqs = [
  {
    question: "How do I get started with ProDigiChat?",
    answer: "Getting started is easy! Sign up for a free account, complete the onboarding process, connect your WhatsApp Business API, and start creating your first campaign."
  },
  {
    question: "What is WhatsApp Business API and how do I get it?",
    answer: "WhatsApp Business API is the official API for businesses to communicate with customers at scale. You can apply through Meta's Business Manager or use our guided setup process."
  },
  {
    question: "Can I import my existing contacts?",
    answer: "Yes! You can import contacts via CSV file, connect your CRM, or manually add them. We support various contact management features including segmentation and tagging."
  },
  {
    question: "What are the messaging limits?",
    answer: "Free plan: 100 messages/day, Startup: 5,000 messages/day, Enterprise: Unlimited. All plans comply with WhatsApp's rate limits and policies."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely! We use AES-256 encryption, are SOC 2 Type II compliant, and follow GDPR regulations. Your data and customer communications are fully protected."
  },
  {
    question: "Can I integrate with other tools?",
    answer: "Yes! We offer integrations with popular CRMs, e-commerce platforms, and marketing tools. Check our integrations page for the full list."
  }
]

const contactMethods = [
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with our support team in real-time",
    action: "Start Chat",
    href: "#",
    available: "Mon-Fri, 9 AM - 6 PM EST"
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Send detailed questions to our team",
    action: "Send Email",
    href: "mailto:support@prodigichat.com",
    available: "24/7 response within 24 hours"
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Speak directly with our support specialists",
    action: "Call Now",
    href: "tel:+1-800-PRODIGI",
    available: "Enterprise customers only"
  }
]

export default function SupportPage() {
  return (
    <>
      {/* ─── HEADER ─── */}
      <Header
        variant="public"
        className="fixed top-0 left-0 right-0 z-50 border-b border-slate-300 bg-slate-900"
      />

      <main className="bg-background pt-16">

        {/* ══════════════════════════════════════════
            HERO SECTION – Support introduction
        ══════════════════════════════════════════ */}
        <section className="relative overflow-hidden bg-transparent px-2.5 lg:px-0">
          <div className="max-w-1440px mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-l border-r border-slate-300 px-5">
            <div className="text-center py-20">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Headphones className="h-10 w-10 text-primary" />
              </div>
              <h1 className="text-foreground text-4xl font-bold mb-4">
                How Can We Help You?
              </h1>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-8">
                Get the support you need to make the most of ProDigiChat. Our team is here to help you succeed.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="lg" className="rounded-full">
                  <Link href="#contact-options">
                    Get Support Now
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link href="#knowledge-base">
                    Browse Resources
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SUPPORT CATEGORIES – Main support options
        ══════════════════════════════════════════ */}
        <section id="knowledge-base" className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="max-w-1440px mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Support Resources
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Choose the support option that works best for you
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pb-20">
              {supportCategories.map((category, index) => (
                <div
                  key={index}
                  className="p-8 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group"
                >
                  <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
                    <category.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-foreground text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-6">
                    {category.description}
                  </p>
                  <ul className="space-y-2">
                    {category.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            FAQ SECTION – Frequently asked questions
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="max-w-1440px mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Quick answers to common questions about ProDigiChat
              </p>
            </div>

            <div className="max-w-4xl mx-auto pb-20">
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="p-6 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card"
                  >
                    <div className="flex items-start gap-4">
                      <HelpCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="text-foreground text-lg font-semibold mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-gray-700 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CONTACT OPTIONS – Direct contact methods
        ══════════════════════════════════════════ */}
        <section id="contact-options" className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="max-w-1440px mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Get in Touch
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Choose your preferred way to reach our support team
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 pb-20">
              {contactMethods.map((method, index) => (
                <div
                  key={index}
                  className="p-8 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group text-center"
                >
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <method.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-foreground text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {method.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {method.description}
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    {method.available}
                  </p>
                  <Button asChild className="w-full rounded-full">
                    <Link href={method.href}>
                      {method.action}
                      {method.href.startsWith('http') || method.href.startsWith('tel:') || method.href.startsWith('mailto:') ? (
                        <ExternalLink className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowRight className="ml-2 h-4 w-4" />
                      )}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            RESOURCES SECTION – Additional help resources
        ══════════════════════════════════════════ */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="max-w-1440px mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Additional Resources
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Explore more ways to learn and get help
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
              <div className="p-6 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group text-center">
                <FileText className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-foreground text-lg font-semibold mb-2">Documentation</h3>
                <p className="text-gray-700 text-sm mb-4">Detailed API docs and guides</p>
                <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                  View Docs <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group text-center">
                <Video className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-foreground text-lg font-semibold mb-2">Video Library</h3>
                <p className="text-gray-700 text-sm mb-4">Step-by-step video tutorials</p>
                <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                  Watch Videos <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-foreground text-lg font-semibold mb-2">Community</h3>
                <p className="text-gray-700 text-sm mb-4">Connect with other users</p>
                <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                  Join Community <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="p-6 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group text-center">
                <BookOpen className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-foreground text-lg font-semibold mb-2">Blog</h3>
                <p className="text-gray-700 text-sm mb-4">Tips and best practices</p>
                <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground">
                  Read Articles <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════
            CTA SECTION – Reusable component
        ══════════════════════════════════════════ */}
        <CTASection
          title="Still Need Help?"
          description="Our dedicated support team is ready to assist you with any questions or challenges."
          primaryButton={{
            text: "Start Free Trial",
            href: "/signup"
          }}
          secondaryButton={{
            text: "Schedule Demo",
            href: "/demo"
          }}
        />
      </main>

      <PublicFooter />
    </>
  )
}