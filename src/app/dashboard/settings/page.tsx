"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useSession } from "next-auth/react"
import {
  Save,
  Bell,
  CreditCard,
  Loader2,
  Clock,
  Mail,
  MessageSquare,
  Check,
  Download as DownloadIcon,
  AlertTriangle as AlertTriangleIcon,
  AlertCircle,
  ExternalLink,
  Info,
  Shield,
  Settings2,
  Trash2,
  Zap,
  Globe,
  Webhook,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { StandardLayout } from "@/components/ui/standard-layout"

// Constants
import {
  SETTINGS_TABS,
  NOTIFICATION_FREQUENCY_OPTIONS,
} from "@/lib/constants/settings"

// Types
import WhatsAppSettingsTab from "@/components/settings/WhatsAppSettingsTab"
import { TeamSettingsTab } from "@/components/settings/TeamSettingsTab"
import { ApiKeysTab } from "@/components/settings/ApiKeysTab"
import { WebhooksTab } from "@/components/settings/WebhooksTab"
import { ProfileSettingsTab } from "@/components/settings/ProfileSettingsTab"
import { PrivacySettingsTab } from "@/components/settings/PrivacySettingsTab"

interface NotificationSettings {
  email: {
    enabled: boolean
    frequency: string
    events: string[]
  }
  push: {
    enabled: boolean
    soundEnabled: boolean
    events: string[]
  }
  slack: {
    enabled: boolean
    webhookUrl: string | null
    channel: string | null
    events: string[]
  }
}

interface BillingInfo {
  subscriptionTier: string
  subscriptionStatus: string
  usage: {
    contacts: { current: number; limit: number; percentage: number }
    campaigns: { current: number; limit: number; percentage: number }
    messagesThisMonth: { current: number; limit: number; percentage: number }
  }
  plans: Array<{
    id: string
    name: string
    price: number
    interval: string
    limits: Record<string, number>
  }>
}

// ═══════════════════════════════════════════════════════════════
// REUSABLE STYLED COMPONENTS (Matching WhatsApp Reference)
// ═══════════════════════════════════════════════════════════════

function StyledCard({
  children,
  className = "",
  title,
  description,
  titleIcon: TitleIcon,
  headerRight,
  accent = false,
  danger = false,
  warning = false,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  titleIcon?: any;
  headerRight?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
  warning?: boolean;
}) {
  const borderClass = danger
    ? "border-2 border-red-400"
    : warning
      ? "border-2 border-yellow-400"
      : accent
        ? "border-l-4 border-l-green-500 border-2 border-green-200 bg-green-50/50"
        : "border-2 border-green-950";

  return (
    <div className={`p-5 rounded-xl bg-white transition-all ${borderClass} ${className}`}>
      {(title || headerRight) && (
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                {TitleIcon && <TitleIcon className="h-5 w-5" />}
                {title}
              </h3>
            )}
            {description && (
              <p className="text-muted-foreground text-sm mt-1">{description}</p>
            )}
          </div>
          {headerRight && <div className="flex items-center gap-2 ml-4 flex-shrink-0">{headerRight}</div>}
        </div>
      )}
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 group">
      <div className="pr-4">
        <p className="font-medium text-foreground group-hover:text-primary transition-colors">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="flex-shrink-0" />
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      {description && <p className="text-muted-foreground text-sm mt-1">{description}</p>}
    </div>
  );
}

// Main Settings Page Component
function SettingsPageContent() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>(SETTINGS_TABS.WHATSAPP)
  const ALL_VALID_TABS = [...Object.values(SETTINGS_TABS), 'profile']
  
  // Get organization ID from session - REQUIRED for security
  const organizationId = (session?.user as any)?.organizationId
  
  // Redirect or show error if no organization ID
  if (!organizationId) {
    return (
      <StandardLayout>
        <StyledCard danger>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-red-800">Access Denied</h4>
              <p className="text-xs text-red-700 mt-1">No organization found. Please log in again.</p>
            </div>
          </div>
        </StyledCard>
      </StandardLayout>
    )
  }

  // Handle tab from URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ALL_VALID_TABS.includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])
  
  const [isSaving, setIsSaving] = useState(false)

  // Notifications State
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      enabled: true,
      frequency: "instant",
      events: ["campaign.completed", "campaign.failed", "message.failed"],
    },
    push: {
      enabled: true,
      soundEnabled: true,
      events: ["new.message", "campaign.status"],
    },
    slack: {
      enabled: false,
      webhookUrl: null,
      channel: null,
      events: ["campaign.completed", "campaign.failed"],
    },
  })

  // Billing State
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)

  // Fetch all settings on mount
  useEffect(() => {
    const initOrg = async () => {
      try {
        await fetch('/api/settings/init', { method: 'POST' })
      } catch (e) {
        console.log('Could not initialize demo org')
      }
    }
    initOrg()
    fetchNotificationSettings()
    fetchBillingInfo()
  }, [])

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch(`/api/settings/notifications?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          setNotificationSettings(data.settings)
        }
      }
    } catch (error) {
      console.error("Error fetching notification settings:", error)
    }
  }

  const fetchBillingInfo = async () => {
    try {
      const response = await fetch(`/api/settings/billing?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setBillingInfo({
          subscriptionTier: data.billing?.subscriptionTier || 'free',
          subscriptionStatus: data.billing?.subscriptionStatus || 'active',
          usage: data.usage,
          plans: data.plans,
        })
      }
    } catch (error) {
      console.error("Error fetching billing info:", error)
    }
  }

  // Save Notification Settings
  const saveNotificationSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/settings/notifications?organizationId=${organizationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: notificationSettings,
        }),
      })
      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Notification settings have been updated.",
        })
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle notification event
  const toggleNotificationEvent = (category: "email" | "push" | "slack", event: string) => {
    setNotificationSettings(prev => {
      const events = prev[category].events
      const newEvents = events.includes(event)
        ? events.filter(e => e !== event)
        : [...events, event]
      return {
        ...prev,
        [category]: {
          ...prev[category],
          events: newEvents,
        },
      }
    })
  }

  return (
    <StandardLayout>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8 h-auto p-1 bg-muted border rounded-lg">
          <TabsTrigger
            value={SETTINGS_TABS.WHATSAPP}
            className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            WhatsApp
          </TabsTrigger>
          <TabsTrigger
            value={SETTINGS_TABS.TEAM}
            className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Team
          </TabsTrigger>
          <TabsTrigger
            value={SETTINGS_TABS.API}
            className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            API Keys
          </TabsTrigger>
          <TabsTrigger
            value={SETTINGS_TABS.WEBHOOKS}
            className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Webhooks
          </TabsTrigger>
          <TabsTrigger
            value={SETTINGS_TABS.NOTIFICATIONS}
            className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Notifications
          </TabsTrigger>
          <TabsTrigger
            value={SETTINGS_TABS.BILLING}
            className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Billing
          </TabsTrigger>
          <TabsTrigger
            value={SETTINGS_TABS.PRIVACY}
            className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Privacy
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            Profile
          </TabsTrigger>
        </TabsList>

        {/* ==================== WhatsApp Settings Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.WHATSAPP} className="space-y-6">
          <WhatsAppSettingsTab organizationId={organizationId} />
        </TabsContent>

        {/* ==================== Team Settings Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.TEAM} className="space-y-6">
          <TeamSettingsTab organizationId={organizationId} />
        </TabsContent>

        {/* ==================== API Keys Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.API} className="space-y-6">
          <ApiKeysTab organizationId={organizationId} />
        </TabsContent>

        {/* ==================== Webhooks Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.WEBHOOKS} className="space-y-6">
          <WebhooksTab organizationId={organizationId} />
        </TabsContent>

        {/* ==================== Notifications Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.NOTIFICATIONS} className="space-y-6">
          {/* Email Notifications */}
          <StyledCard
            title={
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </div>
            }
            description="Configure email alerts for important events"
          >
            <ToggleRow
              title="Enable Email Notifications"
              description="Receive notifications via email"
              checked={notificationSettings.email.enabled}
              onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, email: { ...prev.email, enabled: checked } }))}
            />

            {notificationSettings.email.enabled && (
              <>
                <Separator className="bg-slate-200" />
                <div className="space-y-2 py-4">
                  <Label className="text-sm font-medium text-foreground">Email Frequency</Label>
                  <Select 
                    value={notificationSettings.email.frequency} 
                    onValueChange={(value) => setNotificationSettings((prev) => ({ ...prev, email: { ...prev.email, frequency: value } }))}
                  >
                    <SelectTrigger className="w-48 rounded-lg border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {NOTIFICATION_FREQUENCY_OPTIONS.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Separator className="bg-slate-200" />
                <div className="py-4">
                  <Label className="text-sm font-medium text-foreground mb-4 block">Notification Events</Label>
                  <div className="space-y-1">
                    {[
                      { event: "campaign.completed", label: "Campaign completed", desc: "When a campaign finishes sending" },
                      { event: "campaign.failed", label: "Campaign failed", desc: "When a campaign fails to send" },
                      { event: "campaign.launched", label: "Campaign launched", desc: "When a campaign starts sending" },
                      { event: "message.failed", label: "Message failed", desc: "When a message fails to deliver" },
                      { event: "message.read", label: "Message read", desc: "When a message is read by recipient" },
                      { event: "contact.opted_out", label: "Contact opted out", desc: "When a contact unsubscribes" },
                      { event: "contact.opted_in", label: "Contact opted in", desc: "When a contact subscribes" },
                      { event: "low.balance", label: "Low balance", desc: "When your credits are running low" },
                      { event: "team.invite", label: "Team invite", desc: "When a new team member is invited" },
                      { event: "system.update", label: "System update", desc: "When there's a system update" },
                    ].map((item) => (
                      <ToggleRow
                        key={item.event}
                        title={item.label}
                        description={item.desc}
                        checked={notificationSettings.email.events.includes(item.event)}
                        onCheckedChange={() => toggleNotificationEvent("email", item.event)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </StyledCard>

          {/* Push Notifications */}
          <StyledCard
            title={
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push Notifications
              </div>
            }
            description="Configure browser push notifications"
          >
            <ToggleRow
              title="Enable Push Notifications"
              description="Receive browser push notifications"
              checked={notificationSettings.push.enabled}
              onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, push: { ...prev.push, enabled: checked } }))}
            />
            
            {notificationSettings.push.enabled && (
              <>
                <Separator className="bg-slate-200" />
                <ToggleRow
                  title="Sound Alerts"
                  description="Play sound when receiving notifications"
                  checked={notificationSettings.push.soundEnabled || false}
                  onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, push: { ...prev.push, soundEnabled: checked } }))}
                />
                <Separator className="bg-slate-200" />
                <div className="py-4">
                  <Label className="text-sm font-medium text-foreground mb-4 block">Notification Events</Label>
                  <div className="space-y-1">
                    {[
                      { event: "new.message", label: "New message", desc: "When you receive a new message" },
                      { event: "campaign.status", label: "Campaign status", desc: "When campaign status changes" },
                      { event: "team.activity", label: "Team activity", desc: "When team members take actions" },
                      { event: "system.updates", label: "System updates", desc: "Important system notifications" },
                    ].map((item) => (
                      <ToggleRow
                        key={item.event}
                        title={item.label}
                        description={item.desc}
                        checked={notificationSettings.push.events.includes(item.event)}
                        onCheckedChange={() => toggleNotificationEvent("push", item.event)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </StyledCard>

          {/* Slack Integration */}
          <StyledCard
            title={
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Slack Integration
              </div>
            }
            description="Send notifications to Slack"
          >
            <ToggleRow
              title="Enable Slack Notifications"
              description="Receive notifications in Slack"
              checked={notificationSettings.slack.enabled}
              onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, slack: { ...prev.slack, enabled: checked } }))}
            />
            
            {notificationSettings.slack.enabled && (
              <>
                <Separator className="bg-slate-200" />
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="slackWebhook" className="text-sm font-medium text-foreground">
                      Slack Webhook URL
                    </Label>
                    <div className="relative">
                      <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="slackWebhook"
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={notificationSettings.slack.webhookUrl || ""}
                        onChange={(e) => setNotificationSettings((prev) => ({ ...prev, slack: { ...prev.slack, webhookUrl: e.target.value } }))}
                        className="pl-10 text-sm font-mono rounded-lg border-slate-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slackChannel" className="text-sm font-medium text-foreground">
                      Slack Channel (optional)
                    </Label>
                    <Input
                      id="slackChannel"
                      placeholder="#general"
                      value={notificationSettings.slack.channel || ""}
                      onChange={(e) => setNotificationSettings((prev) => ({ ...prev, slack: { ...prev.slack, channel: e.target.value } }))}
                      className="text-sm rounded-lg border-slate-300"
                    />
                  </div>
                </div>
                <Separator className="bg-slate-200" />
                <div className="py-4">
                  <Label className="text-sm font-medium text-foreground mb-4 block">Notification Events</Label>
                  <div className="space-y-1">
                    {[
                      { event: "campaign.completed", label: "Campaign completed", desc: "When a campaign finishes" },
                      { event: "campaign.failed", label: "Campaign failed", desc: "When a campaign fails" },
                      { event: "message.failed", label: "Message failed", desc: "When message delivery fails" },
                      { event: "low.balance", label: "Low balance", desc: "When credits are low" },
                    ].map((item) => (
                      <ToggleRow
                        key={item.event}
                        title={item.label}
                        description={item.desc}
                        checked={notificationSettings.slack.events.includes(item.event)}
                        onCheckedChange={() => toggleNotificationEvent("slack", item.event)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </StyledCard>

          {/* Sticky Save Bar */}
          <div className="p-5 rounded-xl border-2 border-slate-300 bg-white shadow-lg sticky bottom-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-sm text-muted-foreground">Changes apply to all notification channels</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-lg border-slate-300 text-sm"
                  onClick={() => fetchNotificationSettings()}
                >
                  Discard
                </Button>
                <Button
                  onClick={saveNotificationSettings}
                  disabled={isSaving}
                  className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Notification Settings
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ==================== Privacy Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.PRIVACY} className="space-y-6">
          <PrivacySettingsTab organizationId={organizationId} />
        </TabsContent>

        {/* ==================== Profile Tab ==================== */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileSettingsTab organizationId={organizationId} />
        </TabsContent>

        {/* ==================== Billing Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.BILLING} className="space-y-6">
          {/* Current Plan */}
          <StyledCard
            title={
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </div>
            }
            description="Your subscription details"
          >
            {billingInfo ? (
              <div className="flex items-center justify-between p-6 rounded-xl border-2 border-green-950 bg-green-50/50">
                <div>
                  <p className="text-2xl font-bold capitalize text-foreground">{billingInfo.subscriptionTier}</p>
                  <p className="text-muted-foreground mt-1">
                    ${billingInfo.plans.find((p) => p.id === billingInfo.subscriptionTier)?.price || 0}/month
                  </p>
                  <Badge className="mt-3 bg-green-100 text-green-800 border-green-200">{billingInfo.subscriptionStatus}</Badge>
                </div>
                <Button variant="outline" className="rounded-lg border-slate-300 text-sm">
                  Upgrade Plan
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </StyledCard>

          {/* Usage This Month */}
          <StyledCard
            title="Usage This Month"
            description="Your current usage statistics"
          >
            {billingInfo ? (
              <div className="space-y-6">
                {[
                  { key: 'messagesThisMonth', label: 'Messages Sent', icon: MessageSquare },
                  { key: 'contacts', label: 'Contacts', icon: Globe },
                  { key: 'campaigns', label: 'Campaigns', icon: Zap },
                ].map((item) => {
                  const usage = billingInfo.usage[item.key as keyof typeof billingInfo.usage]
                  const Icon = item.icon
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                        </div>
                        <p className="font-medium text-foreground">{usage.current.toLocaleString()} / {usage.limit.toLocaleString()}</p>
                      </div>
                      <Progress 
                        value={Math.min(usage.percentage, 100)} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">{usage.percentage.toFixed(1)}% used</p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </StyledCard>

          {/* Available Plans */}
          <StyledCard
            title="Available Plans"
            description="Compare plans and upgrade"
          >
            {billingInfo ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {billingInfo.plans.map((plan) => (
                  <div 
                    key={plan.id} 
                    className={`p-5 rounded-xl border-2 transition-all ${
                      plan.id === billingInfo.subscriptionTier 
                        ? "border-green-950 bg-green-50/50" 
                        : "border-slate-200 bg-white hover:border-green-950/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{plan.name}</p>
                      {plan.id === billingInfo.subscriptionTier && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-2xl font-bold mt-3 text-foreground">
                      ${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.limits.contacts.toLocaleString()} contacts
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.limits.messagesPerMonth.toLocaleString()} messages/mo
                      </li>
                    </ul>
                    {plan.id !== billingInfo.subscriptionTier && (
                      <Button 
                        variant={plan.price === 0 ? "outline" : "default"} 
                        size="sm" 
                        className="w-full mt-4 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => toast({ title: "Coming Soon", description: "Plan upgrades will be available soon!" })}
                      >
                        Upgrade
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </StyledCard>

          {/* Payment Method */}
          <StyledCard
            title="Payment Method"
            description="Manage your payment details"
          >
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">Payment management will be available when billing is fully configured.</p>
            </div>
            <div className="flex items-center justify-between p-5 rounded-xl border-2 border-slate-200 bg-slate-50/50 opacity-50 pointer-events-none">
              <div className="flex items-center gap-4">
                <div className="h-12 w-16 rounded-lg bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground">No payment method on file</p>
                  <p className="text-sm text-muted-foreground">Add a card to activate your subscription</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-sm">
                Add Card
              </Button>
            </div>
          </StyledCard>

          {/* Invoices */}
          <StyledCard
            title="Invoices"
            description="View and download your invoices"
          >
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center mb-3">
                <DownloadIcon className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-foreground">No invoices yet</p>
              <p className="text-xs text-muted-foreground mt-1">Invoices will appear here once you have an active paid subscription.</p>
            </div>
          </StyledCard>

          {/* Danger Zone */}
          <StyledCard
            title={
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangleIcon className="h-5 w-5" />
                Danger Zone
              </div>
            }
            description="Irreversible and destructive actions"
            danger
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-xl border-2 border-orange-300 bg-orange-50">
                <div>
                  <p className="font-medium text-foreground">Cancel Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    Cancel your subscription and downgrade to the free plan
                  </p>
                </div>
                <Button variant="outline" size="sm" className="rounded-lg border-orange-300 text-orange-700 hover:bg-orange-50 text-sm">
                  Cancel Subscription
                </Button>
              </div>
              <div className="flex items-center justify-between p-5 rounded-xl border-2 border-red-400 bg-red-50">
                <div>
                  <p className="font-medium text-red-700">Delete Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your organization and all its data
                  </p>
                </div>
                <Button variant="destructive" size="sm" className="rounded-lg text-sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Organization
                </Button>
              </div>
            </div>
          </StyledCard>
        </TabsContent>
      </Tabs>
    </StandardLayout>
  )
}

// Export with Suspense wrapper for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <StandardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </StandardLayout>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}