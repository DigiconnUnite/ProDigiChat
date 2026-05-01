"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Send, Mail, Twitter, Linkedin, Facebook, Instagram, Youtube } from "lucide-react";
import { useState } from "react";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeMessage, setSubscribeMessage] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setSubscribeMessage('Please enter a valid email address');
      setTimeout(() => setSubscribeMessage(''), 3000);
      return;
    }

    setIsSubscribing(true);
    setSubscribeMessage('');

    try {
      // Simulate API call - replace with actual newsletter subscription
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubscribeMessage('Successfully subscribed!');
      setEmail('');
      setTimeout(() => setSubscribeMessage(''), 3000);
    } catch (error) {
      setSubscribeMessage('Subscription failed. Please try again.');
      setTimeout(() => setSubscribeMessage(''), 3000);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className=" border-green-900" style={{backgroundColor: '#072507'}}>
      <div className="container border-x border-green-800 mx-auto px-4 sm:px-0 py-6 sm:py-12">
        {/* TOP SECTION - Newsletter & Social */}
        <div className="pb-4 px-5 sm:pb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image
                src="/logo.svg"
                alt="Prodigichat Logo"
                width={40}
                height={40}
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg"
              />
              <span className="text-xl sm:text-2xl font-bold text-white">Prodigichat</span>
            </Link>

            {/* Newsletter Subscribe */}
            <div className="flex-1 max-w-xl">
              <form onSubmit={handleSubscribe} className="relative">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
                  <input
                    type="email"
                    placeholder="Enter your email for updates"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-32 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 hover:bg-white/20"
                    disabled={isSubscribing}
                  />
                  <button 
                    type="submit"
                    disabled={isSubscribing}
                    className="absolute right-1 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-full transition-all duration-300 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm shadow-lg hover:shadow-xl"
                  >
                    {isSubscribing ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Subscribing...
                      </span>
                    ) : (
                      'Subscribe'
                    )}
                  </button>
                </div>
                {subscribeMessage && (
                  <div className={`mt-2 text-sm text-center animate-fade-in ${
                    subscribeMessage.includes('Successfully') 
                      ? 'text-green-300' 
                      : 'text-red-300'
                  }`}>
                    {subscribeMessage}
                  </div>
                )}
              </form>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="#"
                className="p-1.5 sm:p-2 rounded-full bg-white text-green-950 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="#"
                className="p-1.5 sm:p-2 rounded-full bg-white text-green-950 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="#"
                className="p-1.5 sm:p-2 rounded-full bg-white text-green-950 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="#"
                className="p-1.5 sm:p-2 rounded-full bg-white text-green-950 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <Link
                href="#"
                className="p-1.5 sm:p-2 rounded-full bg-white text-green-950 hover:bg-green-500 hover:text-white hover:border-green-500 transition-all"
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* GRID LAYOUT */}
        <div className="grid  grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-green-800 border-y border-green-800">
          {/* Brand Column */}
          <div className="lg:col-span-3 px-5 space-y-4 py-4 pr-4 ">
            <h3 className="font-semibold mb-4 text-white">
              Why People Like Us
            </h3>
            <p className="text-sm text-green-200 leading-relaxed">
              Powerful WhatsApp marketing automation platform for businesses of
              all sizes.
            </p>
          </div>

          {/* Product Column */}
          <div className="lg:col-span-3 p-2 sm:p-4">
            <h3 className="font-semibold mb-2 sm:mb-4 text-white text-sm sm:text-base">Product</h3>
            <ul className="space-y-2 sm:space-y-3">
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
          <div className="lg:col-span-3 p-2 sm:p-4">
            <h3 className="font-semibold mb-2 sm:mb-4 text-white text-sm sm:text-base">Company</h3>
            <ul className="space-y-2 sm:space-y-3">
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
          <div className="lg:col-span-3 p-2 sm:p-4">
            <h3 className="font-semibold mb-2 sm:mb-4 text-white text-sm sm:text-base">Legal</h3>
            <ul className="space-y-2 sm:space-y-3">
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
        <div className="pt-4 sm:pt-8">
          <div className="flex flex-col px-5 sm:flex-row justify-between items-center gap-2 sm:gap-4">
            <p className="text-sm text-green-200">
              © {currentYear} <span className="text-orange-400 font-bold">Prodigichat</span>. All rights reserved.
            </p>

            <p className="text-sm text-green-300 order-first sm:order-0 mb-2 sm:mb-0">
              Developed by{" "}
              <Link
                href="https://digiconnunite.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Digiconn Unite Pvt. Ltd.
              </Link>
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
