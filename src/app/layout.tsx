import type { Metadata } from "next";
import { Commissioner } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/auth-provider";
import { NotificationProvider } from "@/components/notification-provider";

const googleSans = Commissioner({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Prodigichat - WhatsApp Marketing Automation Platform",
    template: "%s | Prodigichat",
  },
  description: "Supercharge your WhatsApp marketing with Prodigichat. Send bulk messages, automate campaigns, track analytics, and grow your business with the most complete WhatsApp marketing solution.",
  keywords: [
    "WhatsApp Marketing",
    "WhatsApp Business API",
    "Bulk Messaging",
    "Marketing Automation",
    "Campaign Management",
    "Customer Engagement",
    "WhatsApp Automation",
    "Business Messaging",
    "Prodigichat",
  ],
  authors: [{ name: "Digiconn Unite Pvt. Ltd." }],
  creator: "Prodigichat",
  publisher: "Digiconn Unite Pvt. Ltd.",
  metadataBase: new URL("https://prodigichat.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://prodigichat.com",
    siteName: "Prodigichat",
    title: "Prodigichat - WhatsApp Marketing Automation Platform",
    description: "Supercharge your WhatsApp marketing with Prodigichat. Send bulk messages, automate campaigns, and grow your business.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Prodigichat - WhatsApp Marketing Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Prodigichat - WhatsApp Marketing Automation Platform",
    description: "Supercharge your WhatsApp marketing with Prodigichat. Send bulk messages, automate campaigns, and grow your business.",
    images: ["/og-image.png"],
    creator: "@prodigichat",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="scrollbar-hide">
      <body className={`${googleSans.variable} font-sans bg-green-950 antialiased scrollbar-hide`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
