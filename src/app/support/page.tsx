"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import { PublicCTA } from "@/components/public-cta"
import {
  HelpCircle,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  Users,
  BookOpen,
  Zap,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  LifeBuoy
} from "lucide-react"

const faqCategories = [
  {
    title: "Getting Started",
    icon: Zap,
    faqs: [
      {
        question: "How do I set up my WhatsApp Business account?",
        answer: "To set up your WhatsApp Business account, first download the WhatsApp Business app or use our WhatsApp Business API integration. Complete your business profile with accurate information, verify your phone number, and connect your account to Prodigichat."
      },
      {
        question: "What are the system requirements?",
        answer: "Prodigichat works on all modern web browsers (Chrome, Firefox, Safari, Edge). For the WhatsApp Business API, you'll need a verified business phone number and access to the Meta Business Manager."
      },
      {
        question: "How long does setup take?",
        answer: "Basic setup can be completed in 15-30 minutes. Full API integration and campaign setup may take 1-2 hours depending on your business complexity."
      }
    ]
  },
  {
    title: "Billing & Pricing",
    icon: CheckCircle,
    faqs: [
      {
        question: "What is included in the free trial?",
        answer: "Our 14-day free trial includes full access to all features, up to 100 test messages, basic support, and access to our template library. No credit card required."
      },
      {
        question: "Can I change my plan anytime?",
        answer: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any billing adjustments."
      },
      {
        question: "Do you offer refunds?",
        answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact our support team for a full refund."
      }
    ]
  },
  {
    title: "WhatsApp Policies",
    icon: AlertCircle,
    faqs: [
      {
        question: "What are WhatsApp's messaging limits?",
        answer: "WhatsApp allows up to 250 marketing messages per 24 hours initially. This limit increases based on your business verification status and message quality."
      },
      {
        question: "How do opt-in requirements work?",
        answer: "You must obtain explicit consent before sending marketing messages. We provide opt-in templates and automated collection tools to ensure compliance."
      },
      {
        question: "What happens if I violate WhatsApp policies?",
        answer: "Policy violations can result in message restrictions, account suspension, or permanent bans. We help monitor compliance and provide guidance to avoid violations."
      }
    ]
  },
  {
    title: "Technical Support",
    icon: LifeBuoy,
    faqs: [
      {
        question: "How do I contact technical support?",
        answer: "You can reach our technical support team through the in-app chat, email at support@prodigichat.com, or by scheduling a call during business hours."
      },
      {
        question: "What are your support hours?",
        answer: "Our support team is available Monday through Friday, 9 AM to 6 PM IST. Emergency technical issues are handled 24/7 through our priority support line."
      },
      {
        question: "Do you offer training?",
        answer: "Yes, we provide comprehensive onboarding training, video tutorials, documentation, and live webinars. Enterprise customers also receive dedicated account management."
      }
    ]
  }
]

const contactMethods = [
  {
    title: "Live Chat",
    description: "Get instant help from our support team",
    icon: MessageSquare,
    action: "Start Chat",
    href: "#",
    available: "24/7"
  },
  {
    title: "Email Support",
    description: "Send us a detailed message about your issue",
    icon: Mail,
    action: "Send Email",
    href: "mailto:support@prodigichat.com",
    available: "24 hours response"
  },
  {
    title: "Phone Support",
    description: "Speak directly with a support specialist",
    icon: Phone,
    action: "Call Now",
    href: "tel:+91-9876543210",
    available: "Mon-Fri, 9AM-6PM IST"
  },
  {
    title: "Help Center",
    description: "Browse our comprehensive knowledge base",
    icon: BookOpen,
    action: "Browse Articles",
    href: "#",
    available: "Self-service"
  }
]

export default function SupportPage() {
  return (
    <>
      <Header variant="public" className="fixed top-0 left-0 right-0 z-50" />

      <main className="bg-background rounded-b-2xl md:rounded-b-4xl pt-32">
        {/* Hero Section */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-6">
                <HelpCircle className="h-4 w-4" />
                Support Center
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight mb-6">
                How can we
                <span className="text-primary"> help you</span>?
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get the support you need with our comprehensive help center, expert support team, and extensive documentation.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-12">Get in Touch</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {contactMethods.map((method, index) => (
                  <Card key={index} className="text-center hover:shadow-lg transition-shadow duration-300">
                    <CardContent className="p-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-full mb-4">
                        <method.icon className="h-6 w-6" />
                      </div>
                      <h3 className="font-semibold mb-2">{method.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{method.description}</p>
                      <div className="text-xs text-primary mb-4">{method.available}</div>
                      <Button size="sm" className="w-full">
                        {method.action}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
                <p className="text-muted-foreground">
                  Find quick answers to common questions about Prodigichat and WhatsApp marketing.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {faqCategories.map((category, categoryIndex) => (
                  <Card key={categoryIndex}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <category.icon className="h-5 w-5 text-primary" />
                        {category.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {category.faqs.map((faq, faqIndex) => (
                          <AccordionItem key={faqIndex} value={`item-${categoryIndex}-${faqIndex}`}>
                            <AccordionTrigger className="text-left">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Status & Updates */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">All Systems Operational</h3>
                      <p className="text-muted-foreground mb-4">
                        Prodigichat is running smoothly with 99.9% uptime. All services are operational and performing normally.
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <Link href="#" className="text-primary hover:underline">
                          View System Status
                        </Link>
                        <Link href="#" className="text-primary hover:underline">
                          Subscribe to Updates
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <PublicCTA
          title="Ready to Get Started?"
          description="Join thousands of businesses already using Prodigichat to connect with their customers."
          primaryButtonText="Start Free Trial"
          primaryButtonHref="/signup"
          secondaryButtonText="View Pricing"
          secondaryButtonHref="/pricing"
        />
      </main>

      <PublicFooter />
    </>
  )
}