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
  title: "WhatsApp Marketing Automation Platform",
  description: "A comprehensive platform for WhatsApp marketing automation, campaign management, and customer engagement.",
  keywords: [
    "WhatsApp",
    "Marketing Automation",
    "Campaign Management",
    "Customer Engagement",
    "WhatsApp Business API",
  ],
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
