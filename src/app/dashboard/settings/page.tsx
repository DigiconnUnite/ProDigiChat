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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

// Constants
import {
  SETTINGS_TABS,
  NOTIFICATION_FREQUENCY_OPTIONS,
} from "@/lib/constants/settings"

// Types
import { WhatsAppSettingsTab } from "@/components/settings/WhatsAppSettingsTab"
import { TeamSettingsTab } from "@/components/settings/TeamSettingsTab"
import { ApiKeysTab } from "@/components/settings/ApiKeysTab"
import { WebhooksTab } from "@/components/settings/WebhooksTab"
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

// Main Settings Page Component
function SettingsPageContent() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>(SETTINGS_TABS.WHATSAPP)
  
  // Get organization ID from session - REQUIRED for security
  // If no valid orgId exists, the user should not have access to settings
  const organizationId = (session?.user as any)?.organizationId
  
  // Redirect or show error if no organization ID
  if (!organizationId) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">No organization found. Please log in again.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle tab from URL query parameter
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && Object.values(SETTINGS_TABS).includes(tab as any)) {
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
    <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and platform configuration
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last updated: {new Date().toLocaleDateString()}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          <TabsTrigger value={SETTINGS_TABS.WHATSAPP}>WhatsApp</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.TEAM}>Team</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.API}>API Keys</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.WEBHOOKS}>Webhooks</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.PRIVACY}>Privacy</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.NOTIFICATIONS}>Notifications</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.BILLING}>Billing</TabsTrigger>
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

        {/* ==================== Privacy Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.PRIVACY} className="space-y-6">
          <PrivacySettingsTab organizationId={organizationId} />
        </TabsContent>

        {/* ==================== Notifications Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.NOTIFICATIONS} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>Configure email alerts for important events</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setNotificationSettings({
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
                    }}
                  >
                    Discard
                  </Button>
                  <Button
                    onClick={saveNotificationSettings}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Enable Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  checked={notificationSettings.email.enabled}
                  onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, email: { ...prev.email, enabled: checked } }))}
                />
              </div>

              {notificationSettings.email.enabled && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Email Frequency</Label>
                    <Select value={notificationSettings.email.frequency} onValueChange={(value) => setNotificationSettings((prev) => ({ ...prev, email: { ...prev.email, frequency: value } }))}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {NOTIFICATION_FREQUENCY_OPTIONS.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <Label>Notification Events</Label>
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
                      <div key={item.event} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch checked={notificationSettings.email.events.includes(item.event)} onCheckedChange={() => toggleNotificationEvent("email", item.event)} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>Configure browser push notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Enable Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive browser push notifications</p>
                </div>
                <Switch
                  checked={notificationSettings.push.enabled}
                  onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, push: { ...prev.push, enabled: checked } }))}
                />
              </div>
              {notificationSettings.push.enabled && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">Sound Alerts</p>
                      <p className="text-sm text-muted-foreground">Play sound when receiving notifications</p>
                    </div>
                    <Switch
                      checked={notificationSettings.push.soundEnabled || false}
                      onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, push: { ...prev.push, soundEnabled: checked } }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notification Events</Label>
                    {[
                      { event: "new.message", label: "New message", desc: "When you receive a new message" },
                      { event: "campaign.status", label: "Campaign status", desc: "When campaign status changes" },
                      { event: "team.activity", label: "Team activity", desc: "When team members take actions" },
                      { event: "system.updates", label: "System updates", desc: "Important system notifications" },
                    ].map((item) => (
                      <div key={item.event} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch checked={notificationSettings.push.events.includes(item.event)} onCheckedChange={() => toggleNotificationEvent("push", item.event)} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Slack Integration
              </CardTitle>
              <CardDescription>Send notifications to Slack</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Enable Slack Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications in Slack</p>
                </div>
                <Switch
                  checked={notificationSettings.slack.enabled}
                  onCheckedChange={(checked) => setNotificationSettings((prev) => ({ ...prev, slack: { ...prev.slack, enabled: checked } }))}
                />
              </div>
              {notificationSettings.slack.enabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
                    <Input id="slackWebhook" type="url" placeholder="https://hooks.slack.com/services/..." value={notificationSettings.slack.webhookUrl || ""} onChange={(e) => setNotificationSettings((prev) => ({ ...prev, slack: { ...prev.slack, webhookUrl: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slackChannel">Slack Channel (optional)</Label>
                    <Input id="slackChannel" placeholder="#general" value={notificationSettings.slack.channel || ""} onChange={(e) => setNotificationSettings((prev) => ({ ...prev, slack: { ...prev.slack, channel: e.target.value } }))} />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Notification Events</Label>
                    {[
                      { event: "campaign.completed", label: "Campaign completed", desc: "When a campaign finishes" },
                      { event: "campaign.failed", label: "Campaign failed", desc: "When a campaign fails" },
                      { event: "message.failed", label: "Message failed", desc: "When message delivery fails" },
                      { event: "low.balance", label: "Low balance", desc: "When credits are low" },
                    ].map((item) => (
                      <div key={item.event} className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                        <Switch checked={notificationSettings.slack.events.includes(item.event)} onCheckedChange={() => toggleNotificationEvent("slack", item.event)} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Billing Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.BILLING} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Plan
              </CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              {billingInfo ? (
                <div className="flex items-center justify-between p-6 rounded-lg bg-primary/5 border-2 border-primary">
                  <div>
                    <p className="text-2xl font-bold capitalize">{billingInfo.subscriptionTier}</p>
                    <p className="text-muted-foreground">
                      {billingInfo.plans.find((p) => p.id === billingInfo.subscriptionTier)?.price || 0}/month
                    </p>
                    <Badge className="mt-2 bg-green-100 text-green-800">{billingInfo.subscriptionStatus}</Badge>
                  </div>
                  <Button variant="outline">Upgrade Plan</Button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
              <CardDescription>Your current usage statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {billingInfo ? (
                <div className="space-y-6">
                  {[
                    { key: 'messagesThisMonth', label: 'Messages Sent' },
                    { key: 'contacts', label: 'Contacts' },
                    { key: 'campaigns', label: 'Campaigns' },
                  ].map((item) => {
                    const usage = billingInfo.usage[item.key as keyof typeof billingInfo.usage]
                    return (
                      <div key={item.key}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="font-medium">{usage.current.toLocaleString()} / {usage.limit.toLocaleString()}</p>
                        </div>
                        <Progress value={Math.min(usage.percentage, 100)} className="h-2" />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>Compare plans and upgrade</CardDescription>
            </CardHeader>
            <CardContent>
              {billingInfo ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {billingInfo.plans.map((plan) => (
                    <div key={plan.id} className={`p-4 rounded-lg border ${plan.id === billingInfo.subscriptionTier ? "border-primary bg-primary/5" : "border-border"}`}>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-2xl font-bold mt-2">
                        ${plan.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />{plan.limits.contacts.toLocaleString()} contacts</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />{plan.limits.messagesPerMonth.toLocaleString()} messages/mo</li>
                      </ul>
                      {plan.id !== billingInfo.subscriptionTier && (
                        <Button variant={plan.price === 0 ? "outline" : "default"} size="sm" className="w-full mt-4" onClick={() => toast({ title: "Coming Soon", description: "Plan upgrades will be available soon!" })}>
                          {plan.price === 0 ? "Current" : "Upgrade"}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Manage your payment details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border bg-secondary/50">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-16 rounded bg-gradient-to-r from-blue-600 to-blue-800 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">Visa ending in 4242</p>
                    <p className="text-sm text-muted-foreground">Expires 12/2025</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Update</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>View and download your invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: "INV-2024-001", date: "March 2024", amount: 79, status: "paid" },
                  { id: "INV-2024-002", date: "February 2024", amount: 79, status: "paid" },
                  { id: "INV-2024-003", date: "January 2024", amount: 79, status: "paid" },
                ].map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{invoice.id}</p>
                      <p className="text-sm text-muted-foreground">{invoice.date}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-medium">${invoice.amount}</p>
                      <Badge className="bg-green-100 text-green-800 border-green-200">{invoice.status}</Badge>
                      <Button variant="ghost" size="sm">
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangleIcon className="h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
                <div>
                  <p className="font-medium">Cancel Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    Cancel your subscription and downgrade to the free plan
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Cancel Subscription
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive bg-destructive/5">
                <div>
                  <p className="font-medium text-destructive">Delete Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your organization and all its data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  )
}

// Export with Suspense wrapper for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6 space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}
