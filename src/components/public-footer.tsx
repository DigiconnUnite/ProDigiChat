import Link from "next/link";
import { MessageSquare, Send, Mail, Twitter, Linkedin, Facebook, Instagram, Youtube } from "lucide-react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-green-950 border-green-900">
      <div className="container mx-auto  py-12 ">
        {/* TOP SECTION - Newsletter & Social */}
        <div className=" pb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500 text-white">
                <Send className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-white">WhatsApp CRM</span>
            </Link>

            {/* Newsletter Subscribe */}
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <div className="flex">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-950" />
                    <input
                      type="email"
                      placeholder="Enter your email for updates"
                      className="w-full pl-10 pr-40 py-1.5 bg-background border border-white/20 text-black hover:text-white hover:bg-background/90  rounded-full placeholder-white-80 focus:outline-none focus:border-green-300  focus:ring-green-500 transition-colors"
                    />
                    <button className="absolute right-1 top-1/2 cursor-pointer -translate-y-1/2 px-4 py-1 bg-orange-500 text-white hover:bg-green-500 hover:text-white font-semibold rounded-full transition-colors whitespace-nowrap">
                      Subscribe
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <Link
                href="#"
                className="p-2 rounded-full bg-white text-green-950  hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="p-2 rounded-full bg-white  text-green-950  hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="p-2 rounded-full bg-white    text-green-950  hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="p-2 rounded-full bg-white  text-green-950   hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
              <Link
                href="#"
                className="p-2 rounded-full bg-white  text-green-950  hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-green-800 border-y border-green-800">
          {/* Brand Column */}
          <div className="lg:col-span-3 space-y-4 py-4 pr-4 ">
            <h3 className="font-semibold mb-4 text-white">
              Why People Like Us
            </h3>
            <p className="text-sm text-green-200 leading-relaxed">
              Powerful WhatsApp marketing automation platform for businesses of
              all sizes.
            </p>
          </div>

          {/* Product Column */}
          <div className="lg:col-span-3 p-4">
            <h3 className="font-semibold mb-4 text-white">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/features"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Login
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="lg:col-span-3 p-4">
            <h3 className="font-semibold mb-4 text-white">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/features"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/features"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/features"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Careers
                </Link>
              </li>
              <li>
                <Link
                  href="/features"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="lg:col-span-3 p-4">
            <h3 className="font-semibold mb-4 text-white">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-green-200 hover:text-white transition-colors"
                >
                  GDPR
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 ">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-green-200">
              © {currentYear} <span className="text-orange-400 font-bold">ProDigi Chat</span>. All rights reserved.
            </p>

            <div className="flex items-center gap-4">
              <Link
                href="#"
                className="text-sm text-green-200 hover:text-white transition-colors"
              >
                Twitter
              </Link>
              <Link
                href="#"
                className="text-sm text-green-200 hover:text-white transition-colors"
              >
                LinkedIn
              </Link>
              <Link
                href="#"
                className="text-sm text-green-200 hover:text-white transition-colors"
              >
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
