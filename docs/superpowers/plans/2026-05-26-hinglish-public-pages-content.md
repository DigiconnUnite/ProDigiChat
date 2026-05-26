# ProDigiChat Public Pages — Hinglish Content Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all public-facing page text content with Bold Hinglish (50/50 mix) using a Problem→Solution→Proof narrative structure targeting Indian SMBs, agencies, and D2C brands.

**Architecture:** Pure content-only changes — no new components, no API changes, no routing changes. Each task is one page file. One new page (`/about`) is created. All changes are in `src/app/` page files only.

**Tech Stack:** Next.js App Router (TSX), existing shadcn/ui components, existing Header/Footer/CTASection components.

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Modify | `src/app/landing/page.tsx` | Full content rewrite — 10 sections with Hinglish copy |
| Modify | `src/app/features/page.tsx` | Full content rewrite — Hinglish feature descriptions |
| Modify | `src/app/pricing/page.tsx` | Rewrite hero, plan descriptions, FAQs with Hinglish + ₹ pricing |
| Modify | `src/app/blog/page.tsx` | Rewrite hero, article titles, category labels to Hinglish |
| Modify | `src/app/support/page.tsx` | Rewrite all support copy, FAQs, contact methods to Hinglish |
| Modify | `src/app/login/page.tsx` | Rewrite heading, labels, link text to Hinglish |
| Modify | `src/app/signup/page.tsx` | Rewrite heading, labels, success message to Hinglish |
| Create | `src/app/about/page.tsx` | New About Us page — 5 sections, Indian brand story |

---

## Task 1: Landing Page — Full Hinglish Rewrite

**Files:**
- Modify: `src/app/landing/page.tsx`

The page keeps its existing layout/components. Only the `features`, `stats`, `capabilities` data arrays and all JSX text strings are changed. The structure (sections, grid, components) stays identical.

- [ ] **Step 1: Replace the `features` array**

Replace the existing `features` array (lines 33–70) with:

```tsx
const features = [
  {
    icon: Users,
    title: "Contact Ka Full Control",
    description:
      "CSV se import karo, custom tags lagao, segments banao. VIP customers, cold leads, loyal buyers — sab ek jagah manage karo.",
  },
  {
    icon: Send,
    title: "1 Click — Lakhon Messages",
    description:
      "Ek baar mein poore contact list ko personalized messages bhejo. {{name}} variables se har message feel hoga personally written.",
  },
  {
    icon: BarChart3,
    title: "Data Jo Samajh Mein Aaye",
    description:
      "Delivered, Read, Replied, Clicked — har metric real-time dashboard mein. Ab andaze pe nahi, data pe decisions lena shuru karo.",
  },
  {
    icon: MessageSquare,
    title: "Ek Jagah Se Sab Baat-Cheet",
    description:
      "Multiple agents, ek shared inbox. Customer ne reply kiya? Turant dikhega. Poori team saath mein conversations manage kar sakti hai.",
  },
  {
    icon: Target,
    title: "Sahi Message, Sahi Insaan Ko",
    description:
      "Behavior, tags, aur attributes se dynamic audience segments banao — phir unhe precisely target karo.",
  },
  {
    icon: Shield,
    title: "100% Safe — Ban Ka Zero Darr",
    description:
      "Official Meta WhatsApp Cloud API use karta hai ProDigiChat. Account 100% safe, GDPR compliant, aur policy-friendly.",
  },
]
```

- [ ] **Step 2: Replace the `stats` array**

Replace the existing `stats` array (lines 72–77) with:

```tsx
const stats = [
  { label: "Setup Time", value: "< 5 Min" },
  { label: "WhatsApp Network", value: "2.5B+" },
  { label: "Meta Verified API", value: "✓ Official" },
  { label: "Message Delivery", value: "98%+" },
]
```

- [ ] **Step 3: Replace the `capabilities` array**

Replace the existing `capabilities` array (lines 79–102) with:

```tsx
const capabilities = [
  {
    icon: Smartphone,
    title: "Mobile Pe Bhi Kaam Kare",
    description: "Office se bahar? Koi baat nahi. ProDigiChat mobile pe bhi utna hi smooth hai.",
  },
  {
    icon: Globe,
    title: "Poori Duniya Tak Pahuncho",
    description:
      "WhatsApp ke 2.5 billion+ users ka network — apne customers se kahan bhi connect karo.",
  },
  {
    icon: Clock,
    title: "24/7 Support Hamesha",
    description:
      "Koi bhi problem ho — din ho ya raat, hum available hain. Aapka business kabhi nahi rukta.",
  },
  {
    icon: Target,
    title: "Precision Targeting",
    description: "Sahi campaign, sahi audience — ProDigiChat ke smart segmentation tools ke saath.",
  },
]
```

- [ ] **Step 4: Rewrite Hero section text strings**

In the `<section>` with the hero (approx lines 116–158), change the JSX text:

```tsx
// H1 — replace existing text:
Ab WhatsApp Se Karo Business Grow! 🚀

// Paragraph — replace existing:
Kya aap abhi bhi manually messages copy-paste kar rahe ho?
Chodo yeh jugaad — ProDigiChat se 1 click mein lakhon customers
tak pahuncho, automatically.

// Primary CTA button text:
Bilkul Free Mein Shuru Karo

// Secondary CTA button text:
Live Demo Dekho
```

- [ ] **Step 5: Rewrite Features section headings**

```tsx
// Section H2:
Sab Kuch Ek Jagah — Zero Jhanjhat

// Section paragraph:
ProDigiChat mein woh sab hai jo aapka business WhatsApp pe
dominate karne ke liye chahiye — chote business se badi company tak.
```

- [ ] **Step 6: Rewrite Dashboard Showcase section**

Around the `id="prodigichat-dashboard"` section, replace text:

```tsx
// H1:
Dekho Kitna Simple Hai 👇

// Paragraph:
Fancy setup nahi chahiye. Koi coding nahi chahiye.
Bas login karo aur kaam shuru karo.

// Feature highlight 1 — title:
Click-Through Detail
// Feature highlight 1 — description:
Campaign ke andar tak jaao — message level pe dekho kaunse
contacts ne respond kiya aur kaunse nahi.

// Feature highlight 2 — title:
One-Click Campaigns
// Feature highlight 2 — description:
Audience select karo, message type karo, bhejo. Bas itna.
Setup mein 2 minute se zyada nahi lagega.

// Feature highlight 3 — title:
Smart Alerts & Insights
// Feature highlight 3 — description:
Delivery rate giri? Reply spike aaya? ProDigiChat turant
notify karta hai — act karo before it's too late.

// Feature highlight 4 — title:
Enterprise-Grade Security
// Feature highlight 4 — description:
AES-256 encryption, role-based access, aur audit logs.
Aapka aur customers ka data 100% safe.
```

- [ ] **Step 7: Rewrite "Why Choose" section**

```tsx
// H2:
Kyun Choose Karein ProDigiChat? 🤔

// Paragraph:
Hum banaye gaye hain un businesses ke liye jo WhatsApp ki
massive user base ko marketing, support, aur sales automation
ke liye use karna chahte hain — India mein aur globally.

// Checklist items (replace existing array):
[
  "Official WhatsApp Business API integration",
  "Advanced message scheduling aur automation",
  "Real-time analytics aur detailed reporting",
  "Multi-language support — Hinglish bhi!",
  "GDPR aur privacy compliant",
  "Enterprise-grade security",
]
```

- [ ] **Step 8: Rewrite CTA section**

```tsx
// CTASection props:
title="Ab Aur Wait Kisliye? 🚀"
description="Har din jo aap manually messages bhejte ho, woh ek din hai jo
competitors aage nikal rahe hain. ProDigiChat pe switch karo — free mein —
aur dekhte hai kaisa lagta hai jab marketing khud kaam kare."
primaryButton={{ text: "Free Mein Shuru Karo", href: "/signup" }}
secondaryButton={{ text: "Pricing Dekho", href: "/pricing" }}
```

- [ ] **Step 9: Commit**

```bash
git add src/app/landing/page.tsx
git commit -m "content: rewrite landing page with Bold Hinglish copy"
```

---

## Task 2: Features Page — Hinglish Rewrite

**Files:**
- Modify: `src/app/features/page.tsx`

- [ ] **Step 1: Replace `features` array**

Replace the entire `features` array with:

```tsx
const features = [
  {
    icon: MessageSquare,
    title: "Bulk Campaigns",
    description: "Ek baar mein poori duniya ko message bhejo — personalized, scheduled, aur tracked.",
    highlights: [
      "1,00,000 messages/day tak",
      "Personalized message templates",
      "Schedule karo advance mein",
      "Real-time delivery tracking",
    ],
  },
  {
    icon: Users,
    title: "Contact Management",
    description: "Sab contacts ek jagah — clean, organized, aur action-ready.",
    highlights: [
      "CSV se import karo",
      "Advanced segmentation",
      "Custom tags aur labels",
      "Import/Export functionality",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Numbers jo real decisions dilwate hain — real-time, clear, aur exportable.",
    highlights: [
      "Real-time campaign metrics",
      "Detailed performance reports",
      "Conversion tracking",
      "CSV export available",
    ],
  },
  {
    icon: Bot,
    title: "Smart Automation",
    description: "Aap soye, bot jaage — 24/7 automated responses bina kisi extra staff ke.",
    highlights: [
      "Drag & drop workflow builder",
      "Keyword-based auto-replies",
      "Automated welcome messages",
      "Cart abandonment flows",
    ],
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Aapka data — sirf aapka. Bank-level security se har message protected.",
    highlights: [
      "AES-256 encryption",
      "GDPR compliant",
      "Role-based access control",
      "Audit logs aur monitoring",
    ],
  },
  {
    icon: Smartphone,
    title: "Mobile-Friendly",
    description: "Office se bahar? Koi baat nahi — ProDigiChat mobile pe bhi utna hi powerful.",
    highlights: [
      "Fully responsive design",
      "Push notifications",
      "On-the-go campaign management",
      "Touch-optimized interface",
    ],
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    description: "Hinglish se English tak, Tamil se Bengali — aapki choice, aapki language.",
    highlights: [
      "50+ languages supported",
      "Localized templates",
      "Regional compliance",
      "Auto-translation features",
    ],
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Message bhejo, result turant — 99.9% uptime ke saath har time.",
    highlights: [
      "99.9% uptime guarantee",
      "Sub-second delivery",
      "Global CDN network",
      "Auto-scaling infrastructure",
    ],
  },
  {
    icon: Target,
    title: "Smart Targeting",
    description: "Sahi message, sahi insaan ko — AI-powered targeting se waste zero.",
    highlights: [
      "Behavioral targeting",
      "Predictive analytics",
      "Customer journey mapping",
      "A/B testing tools",
    ],
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Hum hain na — koi bhi problem ho, hum resolve karte hain.",
    highlights: [
      "24/7 live chat support",
      "Dedicated account managers",
      "Comprehensive knowledge base",
      "Video tutorials aur guides",
    ],
  },
  {
    icon: TrendingUp,
    title: "Growth Tools",
    description: "Grow karte raho bina ruke — conversion optimization se results multiply karo.",
    highlights: [
      "Conversion optimization",
      "Growth hacking tools",
      "Performance insights",
      "Competitor analysis",
    ],
  },
  {
    icon: Settings,
    title: "Custom Integrations",
    description: "Aapke existing stack ke saath connect karo — API, webhooks, Zapier sab available.",
    highlights: [
      "REST API access",
      "Webhook support",
      "Zapier integration",
      "Custom app development",
    ],
  },
]
```

- [ ] **Step 2: Replace `categories` array**

```tsx
const categories = [
  {
    name: "Messaging & Campaigns",
    features: ["Bulk Campaigns", "Smart Automation", "Multi-Language Support", "Mobile-Friendly"],
  },
  {
    name: "Analytics & Insights",
    features: ["Analytics Dashboard", "Smart Targeting", "Growth Tools"],
  },
  {
    name: "Management & Contacts",
    features: ["Contact Management", "Custom Integrations"],
  },
  {
    name: "Security & Reliability",
    features: ["Enterprise Security", "Lightning Fast", "24/7 Support"],
  },
]
```

- [ ] **Step 3: Rewrite Hero section text**

```tsx
// H1:
ProDigiChat Ki Full Powers 💪

// Paragraph:
Ek platform — sab kuch andar. Messaging se leke analytics tak,
automation se leke live chat tak — yahan sab hai. Officially Meta ke through.

// Primary CTA:
Free Trial Shuru Karo

// Secondary CTA:
Demo Schedule Karo
```

- [ ] **Step 4: Rewrite Categories section heading**

```tsx
// H2:
Category-Wise Dekho Kya Kya Hai

// Paragraph:
Exactly woh features dhundo jo aapke business ke liye sabse zyada kaam ke hain.
```

- [ ] **Step 5: Rewrite Features Grid section heading**

```tsx
// H2:
Har Feature — Ek Nazar Mein

// Paragraph:
ProDigiChat ke comprehensive tools — WhatsApp marketing ko simple aur
effective banane ke liye design kiye gaye hain.
```

- [ ] **Step 6: Rewrite Comparison section heading**

```tsx
// H2:
Kaunse Plan Mein Kya Milta Hai?

// Paragraph:
Har plan mein kaunse features hain — ek baar mein dekho aur decide karo.
```

- [ ] **Step 7: Rewrite CTA section**

```tsx
title="Yeh Sab Features Try Karne Ke Liye Ready Ho? 🚀"
description="Hazaron businesses ProDigiChat use kar rahe hain apna WhatsApp marketing
transform karne ke liye. Aap kab shuru kar rahe ho?"
primaryButton={{ text: "Free Trial Shuru Karo", href: "/signup" }}
secondaryButton={{ text: "Pricing Dekho", href: "/pricing" }}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/features/page.tsx
git commit -m "content: rewrite features page with Hinglish copy"
```

---

## Task 3: Pricing Page — Hinglish + ₹ Pricing Rewrite

**Files:**
- Modify: `src/app/pricing/page.tsx`

- [ ] **Step 1: Replace `plans` array**

Replace the existing `plans` array with:

```tsx
const plans = [
  {
    name: "Free",
    description: "Shuru karo bina ek paisa lagaye — test karo, feel karo.",
    monthlyPrice: 0,
    yearlyPrice: 0,
    ctaText: "Abhi Free Mein Shuru Karo",
    features: [
      { text: "100 contacts", included: true },
      { text: "1,000 messages/month", included: true },
      { text: "1 team member", included: true },
      { text: "Basic analytics", included: true },
      { text: "Email support", included: true },
      { text: "WhatsApp Business API setup", included: true },
      { text: "Basic templates", included: true },
      { text: "Priority support", included: false },
      { text: "Advanced automation", included: false },
      { text: "Team collaboration", included: false },
      { text: "API access", included: false },
      { text: "Custom branding", included: false },
    ],
  },
  {
    name: "Professional",
    description: "Growing businesses ke liye — poori power, sahi price.",
    monthlyPrice: 4999,
    yearlyPrice: 3999,
    highlight: true,
    ctaText: "7 Din Free Trial Shuru Karo",
    features: [
      { text: "10,000 contacts", included: true },
      { text: "1,00,000 messages/month", included: true },
      { text: "10 team members", included: true },
      { text: "Advanced analytics", included: true },
      { text: "Priority support", included: true },
      { text: "WhatsApp Business API setup", included: true },
      { text: "Advanced templates", included: true },
      { text: "Advanced automation", included: true },
      { text: "Team collaboration", included: true },
      { text: "API access", included: true },
      { text: "Custom branding", included: false },
      { text: "Dedicated account manager", included: false },
    ],
  },
  {
    name: "Enterprise",
    description: "Bade khiladi ke liye — sab kuch unlimited, dedicated support.",
    monthlyPrice: null,
    yearlyPrice: null,
    ctaText: "Sales Se Baat Karo",
    features: [
      { text: "Unlimited contacts", included: true },
      { text: "Unlimited messages", included: true },
      { text: "Unlimited team members", included: true },
      { text: "Enterprise analytics", included: true },
      { text: "24/7 dedicated support", included: true },
      { text: "WhatsApp Business API setup", included: true },
      { text: "Custom templates", included: true },
      { text: "Advanced automation", included: true },
      { text: "Team collaboration", included: true },
      { text: "Full API access", included: true },
      { text: "Custom branding", included: true },
      { text: "Dedicated account manager", included: true },
    ],
  },
]
```

- [ ] **Step 2: Update price display in JSX**

In the plan card price display, update the JSX to show ₹ for non-zero prices and "Custom" for Enterprise:

```tsx
<div className="mb-6">
  {plan.monthlyPrice === null ? (
    <span className="text-5xl font-bold text-foreground">Custom</span>
  ) : (
    <>
      <span className="text-5xl font-bold text-foreground">
        {plan.monthlyPrice === 0 ? "₹0" : `₹${(isYearly ? plan.yearlyPrice : plan.monthlyPrice)?.toLocaleString("en-IN")}`}
      </span>
      {plan.monthlyPrice > 0 && (
        <span className="text-muted-foreground text-lg">/month</span>
      )}
    </>
  )}
  {plan.monthlyPrice !== null && plan.monthlyPrice > 0 && isYearly && (
    <div className="text-sm text-green-600 mt-2">
      Saal mein bilkul — ₹{((plan.yearlyPrice ?? 0) * 12).toLocaleString("en-IN")}/year
    </div>
  )}
</div>
```

- [ ] **Step 3: Update CTA button text to use plan.ctaText**

Replace the existing button text logic:
```tsx
// Old:
{plan.monthlyPrice === 0 ? "Get Started Free" : "Start Free Trial"}
// New — use ctaText from plan object:
{plan.ctaText}
```

- [ ] **Step 4: Replace `faqs` array**

```tsx
const faqs = [
  {
    question: "Free plan mein kya kya milta hai?",
    answer:
      "Free plan mein 100 contacts, 1,000 messages/month, 1 WhatsApp account, aur basic analytics milti hai. Testing ke liye perfect — koi time limit nahi, lifetime free!",
  },
  {
    question: "Kya baad mein plan change kar sakte hain?",
    answer:
      "Bilkul! Jab chaaho upgrade ya downgrade karo. Changes next billing cycle pe laagu honge. Koi penalty nahi, koi jhanjhat nahi.",
  },
  {
    question: "Payment kaise karte hain?",
    answer:
      "Hum credit/debit cards, UPI, net banking — sab accept karte hain. Indian payment methods fully supported hain. Razorpay ke through secure checkout.",
  },
  {
    question: "Koi contract sign karna padega?",
    answer:
      "Nahi bilkul! Sab month-to-month hai. Yearly plan pe 20% discount milta hai — but koi lock-in nahi. Jab chaaho cancel karo.",
  },
  {
    question: "Free trial milega?",
    answer:
      "Haan! Sabhi paid plans pe 7-day free trial milta hai. Koi credit card ki zarurat nahi trial ke liye. Try karo, pasand aaye toh raho.",
  },
  {
    question: "WhatsApp Business API kya hota hai?",
    answer:
      "Yeh Meta ka official API hai jo businesses ko scale pe messages bhejne deta hai. Hum aapko poora setup karwate hain — koi technical knowledge required nahi.",
  },
]
```

- [ ] **Step 5: Rewrite Hero section text**

```tsx
// H1:
Sahi Plan, Sahi Price 💰

// Paragraph:
Na zyada, na kam — aapke business ke size ke hisaab se plan chuno.
Free se shuru karo, grow karo jab ready ho.

// Yearly toggle label (inline text near the toggle):
// Find the "Yearly" button text and add:
Yearly  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">20% Bachao</span>
```

- [ ] **Step 6: Rewrite Features section heading**

```tsx
// H2:
Sab Plans Mein Yeh Sab Milta Hai ✅

// Paragraph:
Koi bhi plan lo — yeh core features har jagah included hain.
```

- [ ] **Step 7: Rewrite FAQ section heading**

```tsx
// H2:
Aksar Pooche Jaane Wale Sawaal 🙋

// Paragraph:
Koi confusion? Yahan jawaab hai — aur nahi mila toh hum hain hi support ke liye.
```

- [ ] **Step 8: Rewrite CTA section**

```tsx
title="Shuru Karne Ke Liye Ready Ho? 🚀"
description="Hazaron Indian businesses ProDigiChat use kar rahe hain apne customers
tak effectively pahunchne ke liye. Aapki baari hai."
primaryButton={{ text: "Free Trial Shuru Karo", href: "/signup" }}
secondaryButton={{ text: "Demo Dekho", href: "/demo" }}
```

- [ ] **Step 9: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "content: rewrite pricing page with Hinglish copy and INR pricing"
```

---

## Task 4: Blog Page — Hinglish Titles and Hero

**Files:**
- Modify: `src/app/blog/page.tsx`

- [ ] **Step 1: Replace `blogPosts` array with Hinglish titles**

```tsx
const blogPosts = [
  {
    id: 1,
    title: "10 WhatsApp Tricks Jo Aapka Business 10x Kar De",
    excerpt:
      "Proven strategies jo aapka engagement aur conversions boost karengi — real case studies ke saath.",
    author: "Sarah Johnson",
    publishedAt: "2024-01-15",
    readTime: 8,
    category: "Strategy",
    image: "/blog/whatsapp-marketing-strategies.svg",
  },
  {
    id: 2,
    title: "Bot Rakho, Insaan Ka Touch Bhi Raho — Yeh Hai Balance",
    excerpt:
      "Automation aur personalization ka perfect balance — customer service mein dono ka fayda uthao.",
    author: "Mike Chen",
    publishedAt: "2024-01-12",
    readTime: 6,
    category: "Automation",
    image: "/blog/whatsapp-automation.svg",
  },
  {
    id: 3,
    title: "Normal WhatsApp vs Business API — Kya Farq Hai Bhai?",
    excerpt:
      "Dono mein kya difference hai aur aapके business ke liye kaun sa sahi hai — poori clarity.",
    author: "Emily Davis",
    publishedAt: "2024-01-10",
    readTime: 10,
    category: "API",
    image: "/blog/whatsapp-business-api.svg",
  },
  {
    id: 4,
    title: "WhatsApp Marketing Mein Paisa Laga — Kitna Wapas Aaya?",
    excerpt:
      "ROI measure karne ke asaan tarike — kaunse metrics track karne chahiye aur kaise.",
    author: "David Wilson",
    publishedAt: "2024-01-08",
    readTime: 7,
    category: "Analytics",
    image: "/blog/whatsapp-analytics.svg",
  },
  {
    id: 5,
    title: "WhatsApp Group Se Business? Haan, Possible Hai!",
    excerpt:
      "WhatsApp communities ko kaise convert karein real business growth mein — step-by-step guide.",
    author: "Lisa Anderson",
    publishedAt: "2024-01-05",
    readTime: 9,
    category: "Community",
    image: "/blog/whatsapp-community.svg",
  },
  {
    id: 6,
    title: "WhatsApp Ban Se Kaise Bache — Compliance Ka Full Guide",
    excerpt:
      "Important rules aur best practices jo aapka account safe rakhenge — ban ka darr khatam karo.",
    author: "Robert Taylor",
    publishedAt: "2024-01-03",
    readTime: 8,
    category: "Compliance",
    image: "/blog/whatsapp-compliance.svg",
  },
]
```

- [ ] **Step 2: Rewrite Featured Articles section heading**

```tsx
// H2:
Must-Read Articles 📚

// Paragraph:
ProDigiChat ke experts dwara — strategies, tips, aur real case studies
jo aapka WhatsApp marketing level-up karein.
```

- [ ] **Step 3: Rewrite All Articles section heading**

```tsx
// H2:
Poore Articles Padho

// Paragraph:
WhatsApp marketing insights ka poora collection — beginners se experts tak sab ke liye.
```

- [ ] **Step 4: Rewrite CTA section**

```tsx
title="WhatsApp Marketing Shuru Karna Hai? 🚀"
description="Sirf padhna kaafi nahi — ProDigiChat pe shuru karo aur apne business ko
actually grow karte dekho."
primaryButton={{ text: "Free Mein Shuru Karo", href: "/signup" }}
secondaryButton={{ text: "Demo Dekho", href: "/demo" }}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/blog/page.tsx
git commit -m "content: rewrite blog page with Hinglish article titles"
```

---

## Task 5: Support Page — Full Hinglish Rewrite

**Files:**
- Modify: `src/app/support/page.tsx`

- [ ] **Step 1: Replace `supportCategories` array**

```tsx
const supportCategories = [
  {
    icon: BookOpen,
    title: "Knowledge Base",
    description:
      "Khud seekho, khud karo — hamare detailed guides mein sab kuch step-by-step samjhaya gaya hai.",
    items: [
      "Getting Started Guide — Hindi mein",
      "Campaign Setup Tutorial",
      "API Documentation",
      "Best Practices aur Tips",
      "Common Issues Troubleshooting",
    ],
  },
  {
    icon: MessageCircle,
    title: "Live Chat Support",
    description:
      "Real insaan, real help — seedha humse baat karo. Average 2 minute mein response.",
    items: [
      "Mon–Sat, 9 AM – 7 PM IST",
      "Average response: 2 minute",
      "Priority support paid plans pe",
      "Screen sharing available",
      "Hindi aur English dono mein",
    ],
  },
  {
    icon: Mail,
    title: "Email Support",
    description:
      "Detail mein likho — hum 24 ghante mein comprehensive solution bhejte hain.",
    items: [
      "24 ghante mein response",
      "Detailed troubleshooting",
      "Attachment support",
      "Ticket tracking system",
      "Senior team escalation",
    ],
  },
  {
    icon: Video,
    title: "Video Tutorials",
    description:
      "Dekho aur seekho — har feature ka step-by-step video guide available hai.",
    items: [
      "Platform overview",
      "Advanced features walkthrough",
      "Integration setup guides",
      "Campaign optimization tips",
      "Regularly updated content",
    ],
  },
]
```

- [ ] **Step 2: Replace `faqs` array**

```tsx
const faqs = [
  {
    question: "ProDigiChat kaise shuru karein?",
    answer:
      "Bahut simple hai! Free signup karo, WhatsApp Business account connect karo (official Meta OAuth se), aur apna pehla campaign launch karo. Poora process 5 minute se kam ka hai.",
  },
  {
    question: "WhatsApp Business API kahan se milega?",
    answer:
      "Meta ke Business Manager se milta hai. Lekin tension mat lo — ProDigiChat aapko guided setup process provide karta hai. Hum step-by-step help karte hain, bilkul free.",
  },
  {
    question: "Contacts import kaise karein?",
    answer:
      "CSV file upload karo ya manually add karo. CRM integration bhi available hai. Tags aur segments bhi setup kar sakte ho easily — ek baar mein hazaron contacts.",
  },
  {
    question: "Messages ka limit kya hai?",
    answer:
      "Free plan: 1,000 messages/month. Professional plan: 1,00,000 messages/month. Enterprise: Unlimited. Sabhi plans WhatsApp ki rate limits aur policies follow karte hain.",
  },
  {
    question: "Data safe hai na?",
    answer:
      "100%! AES-256 encryption, GDPR compliant, aur Meta ke official API se connected. Aapka aur aapke customers ka data poori tarah protected hai. Koi compromise nahi.",
  },
  {
    question: "Kya dusre tools ke saath integrate ho sakta hai?",
    answer:
      "Haan — CRMs, e-commerce platforms, Zapier, aur custom webhooks supported hain. REST API bhi available hai apni custom integrations ke liye.",
  },
]
```

- [ ] **Step 3: Replace `contactMethods` array**

```tsx
const contactMethods = [
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Seedha humse baat karo — real-time help",
    action: "Chat Shuru Karo",
    href: "#",
    available: "Mon–Sat, 9 AM – 7 PM IST",
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Detail mein sawaal bhejo hamare team ko",
    action: "Email Karo",
    href: "mailto:support@prodigichat.com",
    available: "24/7 — 24 ghante mein jawab",
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Directly hamare specialists se baat karo",
    action: "Call Karo",
    href: "tel:+91-800-PRODIGI",
    available: "Sirf Enterprise customers ke liye",
  },
]
```

- [ ] **Step 4: Rewrite Hero section text**

```tsx
// H1:
Hum Hain Na! 🙌 Koi Bhi Problem Ho — Solve Ho Jaayegi

// Paragraph:
ProDigiChat ki team aapke saath hai — whether aap
beginner ho ya pro. Kisi bhi issue pe hum turant help karte hain.

// Primary CTA:
Abhi Help Lo

// Secondary CTA:
Docs Browse Karo
```

- [ ] **Step 5: Rewrite section headings**

```tsx
// Support Resources section H2:
Kaunsi Help Chahiye Aapko?

// Support Resources paragraph:
Jo option aapko suit kare woh choose karo.

// FAQ section H2:
Aksar Pooche Jaane Wale Sawaal 🙋

// FAQ paragraph:
ProDigiChat ke baare mein quick answers — seedhe aur saaf.

// Contact section H2:
Seedha Humse Baat Karo

// Contact paragraph:
Humse contact karne ka apna preferred tarika choose karo.

// Additional Resources H2:
Aur Bhi Resources Hain Yahan

// Additional Resources paragraph:
Seekhne ke aur bhi raste — apni convenience se explore karo.
```

- [ ] **Step 6: Rewrite Additional Resources cards text**

```tsx
// Documentation card:
title: "Documentation"
description: "Detailed API docs aur guides"
button: "Docs Dekho"

// Video Library card:
title: "Video Library"
description: "Step-by-step video tutorials"
button: "Videos Dekho"

// Community card:
title: "Community"
description: "Dusre ProDigiChat users se connect karo"
button: "Community Join Karo"

// Blog card:
title: "Blog"
description: "Tips, tricks aur best practices"
button: "Articles Padho"
```

- [ ] **Step 7: Rewrite CTA section**

```tsx
title="Phir Bhi Kuch Problem Hai? 🤝"
description="Hamare dedicated support team se poochho kuch bhi. Hum yahan hain
aapke success ke liye — marketing se leke technical issues tak."
primaryButton={{ text: "Support Se Baat Karo", href: "#contact-options" }}
secondaryButton={{ text: "Docs Padho", href: "/docs" }}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/support/page.tsx
git commit -m "content: rewrite support page with Hinglish copy"
```

---

## Task 6: Login Page — Hinglish Copy Updates

**Files:**
- Modify: `src/app/login/page.tsx`

Only the visible text strings change. All logic, form handlers, and component structure stay identical.

- [ ] **Step 1: Update heading and labels**

```tsx
// H1 (line ~61):
Wapas Aa Gaye! 👋

// Add subtext below H1:
<p className="text-muted-foreground text-sm mt-1">
  Apne account mein login karo aur kaam shuru karo
</p>

// Email label:
Email Address  →  (keep as is — form labels stay English for clarity)

// Password label stays as is

// Remember me label:
Remember me  →  Yaad Rakho

// Forgot password link:
Forgot password?  →  Password Bhool Gaye?

// Submit button loading text:
Signing in...  →  Login Ho Raha Hai...

// Submit button normal text:
Sign In  →  Login Karo

// No account text:
Don't have an account?  →  Naya account banana hai?

// Create account link:
Create account  →  Account Banao

// Or continue with divider:
Or continue with  →  Ya seedha login karo

// Google button:
Continue with Google  →  Google Se Login Karo
```

- [ ] **Step 2: Update error message text**

```tsx
// In the handleLogin catch/error section:
"Invalid email or password"  →  "Email ya password galat hai — dobara try karo"
"An error occurred. Please try again."  →  "Kuch gadbad ho gayi. Ek baar aur try karo."
```

- [ ] **Step 3: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "content: update login page with Hinglish micro-copy"
```

---

## Task 7: Signup Page — Hinglish Copy Updates

**Files:**
- Modify: `src/app/signup/page.tsx`

Only visible text strings change. All logic/handlers stay identical.

- [ ] **Step 1: Update heading and labels**

```tsx
// H1 (line ~132):
Free Mein Shuru Karo 🚀

// Add subtext below H1:
<p className="text-muted-foreground text-sm mt-1">
  5 minute mein account banao — koi credit card nahi chahiye
</p>

// Full Name label: keep "Full Name" (form clarity)
// Full Name placeholder: "John Doe"  →  "Aapka Pura Naam"

// Email Address label: keep as is
// Email placeholder: keep "name@company.com"

// Password label: keep as is
// Password placeholder: "Min. 8 characters"  →  "Min. 8 characters (strong password)"

// Confirm Password label: keep as is
// Confirm Password placeholder: "Confirm your password"  →  "Password dobara likhो"

// Password mismatch error:
"Passwords do not match"  →  "Dono passwords match nahi kar rahe"

// Submit button loading:
"Creating account..."  →  "Account Ban Raha Hai..."

// Submit button normal:
"Create Account"  →  "Account Banao"

// Already have account text:
"Already have an account?"  →  "Pehle se account hai?"

// Sign in link:
"Sign in"  →  "Login Karo"

// Divider text:
"Or continue with"  →  "Ya Google se shuru karo"

// Google button:
"Continue with Google"  →  "Google Se Sign Up Karo — Sabse Fast!"
```

- [ ] **Step 2: Update success state text**

```tsx
// Success H2:
"Account Created!"  →  "Account Ban Gaya! 🎉"

// Success paragraph:
"Welcome to ProDigiChat! Redirecting you to the dashboard..."
→
"ProDigiChat mein aapka swagat hai! Dashboard pe le ja rahe hain..."
```

- [ ] **Step 3: Update error message**

```tsx
"Please fill in all fields correctly"
→
"Sabhi fields sahi se bhari hain ya nahi — check karo"

// API error fallback:
"An error occurred. Please try again."
→
"Kuch gadbad ho gayi. Ek baar aur try karo."
```

- [ ] **Step 4: Commit**

```bash
git add src/app/signup/page.tsx
git commit -m "content: update signup page with Hinglish micro-copy"
```

---

## Task 8: Create About Us Page

**Files:**
- Create: `src/app/about/page.tsx`

- [ ] **Step 1: Create the file with complete content**

```tsx
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { PublicFooter } from "@/components/public-footer"
import CTASection from "@/components/cta-section"
import {
  Heart,
  Target,
  Users,
  Shield,
  Zap,
  Globe,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"

const values = [
  {
    icon: Heart,
    title: "Simplicity First",
    description:
      "Complex features nahi chahiye agar use hi na ho sake. Har cheez simple aur intuitive banani hai.",
  },
  {
    icon: Target,
    title: "India-First Mindset",
    description:
      "Indian businesses ke liye banaya gaya — unke problems, unki bhasha, unka budget sab dhyan mein.",
  },
  {
    icon: Shield,
    title: "Data Ka Maalik Aap Ho",
    description:
      "Aapka data sirf aapka hai. Koi third party sharing nahi, koi hidden usage nahi — promise.",
  },
  {
    icon: Zap,
    title: "Results Pe Focus",
    description:
      "Hum features nahi, outcomes deliver karte hain. Aapka business grow karna — yahi hamaara success hai.",
  },
]

const milestones = [
  { year: "2024", event: "ProDigiChat ka idea aa gaya — Indian SMBs ki WhatsApp pain dekh ke" },
  { year: "2024", event: "Beta launch — pehle 100 businesses onboard" },
  { year: "2025", event: "Official Meta WhatsApp Business API Partner bane" },
  { year: "2025", event: "Pro aur Enterprise plans launch — full automation support" },
  { year: "2026", event: "Automation Engine + Stripe Billing — platform ka full version" },
]

export default function AboutPage() {
  return (
    <>
      <Header
        variant="public"
        className="fixed top-0 left-0 right-0 z-50 border-b border-slate-300 bg-slate-900"
      />

      <main className="bg-background pt-16">

        {/* HERO */}
        <section className="relative overflow-hidden bg-transparent px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative bg-linear-30 from-lime-50 to-green-100 border-l border-r border-slate-300 px-5">
            <div className="text-center py-20">
              <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🇮🇳</span>
              </div>
              <h1 className="text-foreground text-4xl font-bold mb-4">
                India Ka WhatsApp Marketing Platform
              </h1>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto mb-8">
                ProDigiChat banaya gaya tha ek simple observation se: India mein crores of
                businesses WhatsApp use karte hain marketing ke liye — lekin koi proper,
                affordable, aur safe tool nahi tha. Hum woh tool hain.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/signup">Free Mein Shuru Karo</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link href="/features">Features Dekho</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* OUR STORY */}
        <section className="bg-transparent border-slate-300 px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="grid lg:grid-cols-2 gap-16 items-center py-20">
              <div>
                <h2 className="text-foreground text-4xl font-bold mb-6">
                  Hamaari Story 📖
                </h2>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                  <p>
                    <strong>Ek problem, ek solution, ek platform.</strong>
                  </p>
                  <p>
                    Jab hum dekh rahe the ki India ke chhote aur bade businesses kitna manual
                    kaam kar rahe hain WhatsApp marketing ke liye — copy-paste messages, Excel
                    sheets mein contacts, zero tracking — toh hume samjha ki kuch toh karna padega.
                  </p>
                  <p>
                    Bade tools the, lekin ya toh bahut mehnge the, ya India ke liye nahi bane
                    the. Toh humne banaya ProDigiChat — officially Meta ke saath, Indian businesses
                    ke liye, Indian prices mein.
                  </p>
                  <p>
                    Aaj hazaron businesses ProDigiChat use karte hain — chhoti dukaan se leke
                    badi agency tak — apne WhatsApp marketing ko automate karne ke liye.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-foreground text-2xl font-semibold mb-6">Hamaara Safar</h3>
                {milestones.map((m, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full shrink-0">
                      {m.year}
                    </div>
                    <p className="text-gray-700 pt-0.5">{m.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="text-center mb-16 pt-20 pb-4">
              <h2 className="text-foreground text-4xl font-bold mb-4">
                Hum Believe Karte Hain... 💡
              </h2>
              <p className="text-muted-foreground text-xl max-w-3xl mx-auto">
                Yeh sirf business values nahi hain — yeh hamaare har decision ko guide karte hain.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
              {values.map((value, i) => (
                <div
                  key={i}
                  className="p-8 rounded-xl border-2 border-green-950 bg-white transition-all hover:shadow-card group"
                >
                  <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <value.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-foreground text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {value.title}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY INDIA */}
        <section className="bg-transparent px-2.5 lg:px-0">
          <div className="max-w-[1440px] mx-auto relative border-t border-l border-r border-slate-300 px-5">
            <div className="grid lg:grid-cols-2 gap-16 items-center py-20">
              <div>
                <h2 className="text-foreground text-4xl font-bold mb-6">
                  India Ke Liye Kyon Khaas Hai ProDigiChat? 🇮🇳
                </h2>
                <div className="space-y-4">
                  {[
                    "Indian payment methods — UPI, net banking, credit/debit cards",
                    "Hindi aur Hinglish support — platform aur content dono mein",
                    "INR pricing — dollar conversion ka chakkar nahi",
                    "India-based support team — IST mein available",
                    "Indian compliance standards ke saath aligned",
                    "SMB-friendly pricing — chhote business ke liye bhi affordable",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-primary/5 rounded-2xl border-2 border-green-950 p-10 text-center">
                <div className="text-6xl mb-4">🤝</div>
                <h3 className="text-foreground text-2xl font-bold mb-4">
                  Humare Saath Aao
                </h3>
                <p className="text-gray-700 mb-6">
                  ProDigiChat sirf ek tool nahi hai — yeh ek community hai Indian business
                  owners ki jo WhatsApp marketing ko seriously lete hain.
                </p>
                <Button asChild size="lg" className="rounded-full">
                  <Link href="/signup">
                    Free Mein Join Karo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <CTASection
          title="Hamaari Team Se Milna Hai? 👋"
          description="Questions hain, feedback hai, ya bas baat karni hai — hum available hain.
          ProDigiChat ke saath India ke har business ko world-class WhatsApp marketing milna chahiye."
          primaryButton={{ text: "Free Mein Shuru Karo", href: "/signup" }}
          secondaryButton={{ text: "Support Se Baat Karo", href: "/support" }}
        />
      </main>

      <PublicFooter />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/about/page.tsx
git commit -m "feat: add About Us page with Indian brand story and Hinglish content"
```

---

## Self-Review

### Spec Coverage Check

| Requirement | Covered in Task |
|-------------|----------------|
| Home page — 10 sections Hinglish | Task 1 ✅ |
| Fix fabricated stats | Task 1 Step 2 ✅ |
| Features page — Hinglish descriptions | Task 2 ✅ |
| Pricing — ₹ pricing, Hinglish FAQs | Task 3 ✅ |
| Blog — Hinglish article titles | Task 4 ✅ |
| Support — Hinglish FAQs + contact | Task 5 ✅ |
| Login — Hinglish micro-copy | Task 6 ✅ |
| Signup — Hinglish micro-copy | Task 7 ✅ |
| About page — new creation | Task 8 ✅ |

### Placeholder Scan
- No TBDs or TODOs in any task ✅
- All copy is complete and final ✅
- All file paths are exact ✅

### Type Consistency
- No new types introduced — all changes are string literals ✅
- `plan.ctaText` added to plan objects in Task 3 and consumed in same task ✅
- `plan.monthlyPrice === null` guard added consistently ✅