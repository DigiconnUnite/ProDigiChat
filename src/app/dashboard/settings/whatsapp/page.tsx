/**
 * WhatsApp Settings Page
 * 
 * This page redirects to the main settings page with WhatsApp tab active.
 * Accessible at /dashboard/settings/whatsapp for backward compatibility.
 */

"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function WhatsAppSettingsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to main settings page with WhatsApp tab active
    router.replace("/dashboard/settings?tab=whatsapp");
  }, [router]);
  
  return (
    <div className="container mx-auto py-8 max-w-4xl flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to WhatsApp settings...</p>
      </div>
    </div>
  );
}
