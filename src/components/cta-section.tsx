"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import StripesBackground from "@/components/ui/StripesBackground"

interface CTASectionProps {
  title: string
  description: string
  primaryButton: {
    text: string
    href: string
    variant?: "default" | "outline"
  }
  secondaryButton?: {
    text: string
    href: string
  }
  backgroundVariant?: "light" | "dark"
  className?: string
}

export default function CTASection({
  title,
  description,
  primaryButton,
  secondaryButton,
  backgroundVariant = "light",
  className = ""
}: CTASectionProps) {
  return (
    <section className={`relative overflow-hidden bg-transparent border-slate-300 px-2.5 lg:px-0 ${className}`}>
      <div className="max-w-[1440px] mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-t border-l border-r border-slate-300 px-5">
        <StripesBackground position="full" opacity="opacity-10" />
        <div className="text-center py-20">
          <h2 className="text-foreground text-4xl font-bold mb-4">
            {title}
          </h2>
          <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-10">
            {description}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              asChild 
              size="lg" 
              className="rounded-full"
              variant={primaryButton.variant || "default"}
            >
              <Link href={primaryButton.href}>
                {primaryButton.text}
              </Link>
            </Button>
            {secondaryButton && (
              <Button 
                asChild 
                variant="outline" 
                size="lg" 
                className="rounded-full"
              >
                <Link href={secondaryButton.href}>
                  {secondaryButton.text}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
