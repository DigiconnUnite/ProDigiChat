"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface PublicCTAProps {
  title: string
  description?: string
  primaryButtonText?: string
  primaryButtonHref?: string
  secondaryButtonText?: string
  secondaryButtonHref?: string
  variant?: "primary" | "green"
}

export function PublicCTA({
  title,
  description,
  primaryButtonText = "Get Started",
  primaryButtonHref = "/signup",
  secondaryButtonText,
  secondaryButtonHref,
  variant = "primary"
}: PublicCTAProps) {
  const isGreen = variant === "green"
  
  return (
    <section className="py-16 ">
      <div className="container bg-gray-950 text-white mx-auto rounded-4xl px-4 py-16 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold ${isGreen ? "text-white" : ""}`}>
          {title}
        </h2>
        {description && (
          <p className={`mt-3 text-lg max-w-xl mx-auto ${isGreen ? "text-green-200" : "text-primary-foreground/80"}`}>
            {description}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={primaryButtonHref}>
            <Button 
              size="lg" 
              variant={isGreen ? "secondary" : "secondary"}
              className={`w-full sm:w-auto ${isGreen ? "text-green-950" : "text-primary"}`}
            >
              {primaryButtonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          {secondaryButtonText && secondaryButtonHref && (
            <Link href={secondaryButtonHref}>
              <Button 
                size="lg" 
                variant="outline" 
                className={`w-full sm:w-auto ${
                  isGreen 
                    ? "border-white text-white hover:bg-white/10" 
                    : "bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                }`}
              >
                {secondaryButtonText}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
