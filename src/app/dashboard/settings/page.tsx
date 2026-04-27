"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
  Settings2,
  Download as DownloadIcon,
  AlertTriangle as AlertTriangleIcon,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

// Constants
import {
  SETTINGS_TABS,
  TIMEZONE_OPTIONS,
  LANGUAGE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  CURRENCY_OPTIONS,
  NOTIFICATION_FREQUENCY_OPTIONS,
} from "@/lib/constants/settings"

// Validation helpers
import {
  validateEmail,
} from "@/lib/validations/settings"

// Types
import { WhatsAppSettingsTab } from "@/components/settings/WhatsAppSettingsTab"
import { TeamSettingsTab } from "@/components/settings/TeamSettingsTab"
import { ApiKeysTab } from "@/components/settings/ApiKeysTab"
import { ProfileSettingsTab } from "@/components/settings/ProfileSettingsTab"
import { WebhooksTab } from "@/components/settings/WebhooksTab"
import { PrivacySettingsTab } from "@/components/settings/PrivacySettingsTab"

interface GeneralSettings {
  companyName: string
  companyEmail: string
  website: string
  supportEmail: string
  address: string
  timezone: string
  language: string
  dateFormat: string
  currency: string
  businessHours: {
    startTime: string
    endTime: string
    workingDays: string[]
  }
}

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
  const [activeTab, setActiveTab] = useState<string>(SETTINGS_TABS.GENERAL)
  
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
  
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    companyName: "",
    companyEmail: "",
    website: "",
    supportEmail: "",
    address: "",
    timezone: "UTC",
    language: "en",
    dateFormat: "YYYY-MM-DD",
    currency: "USD",
    businessHours: {
      startTime: "09:00",
      endTime: "18:00",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
  })

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})

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
    fetchGeneralSettings()
    fetchNotificationSettings()
    fetchBillingInfo()
  }, [])

  const fetchGeneralSettings = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/settings/general?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setGeneralSettings({
          companyName: data.general?.companyName || "",
          companyEmail: data.general?.companyEmail || "",
          website: data.general?.website || "",
          supportEmail: data.general?.supportEmail || "",
          address: data.general?.address || "",
          timezone: data.general?.timezone || "UTC",
          language: data.general?.language || "en",
          dateFormat: data.general?.dateFormat || "YYYY-MM-DD",
          currency: data.general?.currency || "USD",
          businessHours: data.general?.businessHours || {
            startTime: "09:00",
            endTime: "18:00",
            workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          },
        })
      }
    } catch (error) {
      console.error("Error fetching general settings:", error)
      toast({
        title: "Error",
        description: "Failed to load general settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

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

  // Validate General Settings
  const validateGeneralSettings = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    if (generalSettings.companyEmail && !validateEmail(generalSettings.companyEmail)) {
      newErrors.companyEmail = "Please enter a valid email address"
    }
    
    if (generalSettings.companyName && generalSettings.companyName.length < 2) {
      newErrors.companyName = "Company name must be at least 2 characters"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Save General Settings
  const saveGeneralSettings = async () => {
    if (!validateGeneralSettings()) {
      toast({
        title: "Validation Error",
        description: "Please correct the errors before saving",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/settings/general?organizationId=${organizationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organizationId,
          name: generalSettings.companyName,
          email: generalSettings.companyEmail,
          timezone: generalSettings.timezone,
          language: generalSettings.language,
          dateFormat: generalSettings.dateFormat,
          currency: generalSettings.currency,
        }),
      })
      if (response.ok) {
        toast({
          title: "Settings saved",
          description: "Your general settings have been updated successfully.",
        })
        setErrors({})
      } else {
        throw new Error("Failed to save settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Save Notification Settings
  const saveNotificationSettings = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/settings/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: organizationId,
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
    <div className="container mx-auto py-6 space-y-6">
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
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 md:grid-cols-6 lg:grid-cols-9">
          <TabsTrigger value={SETTINGS_TABS.GENERAL}>General</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.PROFILE}>Profile</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.WHATSAPP}>WhatsApp</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.TEAM}>Team</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.API}>API Keys</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.WEBHOOKS}>Webhooks</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.PRIVACY}>Privacy</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.NOTIFICATIONS}>Notifications</TabsTrigger>
          <TabsTrigger value={SETTINGS_TABS.BILLING}>Billing</TabsTrigger>
        </TabsList>

        {/* ==================== General Settings Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.GENERAL} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>Update your company details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={generalSettings.companyName}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            companyName: e.target.value,
                          })
                        }
                        placeholder="Enter company name"
                        className={errors.companyName ? "border-destructive" : ""}
                      />
                      {errors.companyName && (
                        <p className="text-sm text-destructive">{errors.companyName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Company Email</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={generalSettings.companyEmail}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            companyEmail: e.target.value,
                          })
                        }
                        placeholder="contact@company.com"
                        className={errors.companyEmail ? "border-destructive" : ""}
                      />
                      {errors.companyEmail && (
                        <p className="text-sm text-destructive">{errors.companyEmail}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={generalSettings.website}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            website: e.target.value,
                          })
                        }
                        placeholder="https://yourcompany.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supportEmail">Support Email</Label>
                      <Input
                        id="supportEmail"
                        type="email"
                        value={generalSettings.supportEmail}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            supportEmail: e.target.value,
                          })
                        }
                        placeholder="support@company.com"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address">Company Address</Label>
                      <Input
                        id="address"
                        value={generalSettings.address}
                        onChange={(e) =>
                          setGeneralSettings({
                            ...generalSettings,
                            address: e.target.value,
                          })
                        }
                        placeholder="123 Business St, City, Country"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Regional Settings</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="timezone">Default Timezone</Label>
                        <Select
                          value={generalSettings.timezone}
                          onValueChange={(value) =>
                            setGeneralSettings({
                              ...generalSettings,
                              timezone: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONE_OPTIONS.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={generalSettings.language}
                          onValueChange={(value) =>
                            setGeneralSettings({
                              ...generalSettings,
                              language: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGE_OPTIONS.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="dateFormat">Date Format</Label>
                        <Select
                          value={generalSettings.dateFormat}
                          onValueChange={(value) =>
                            setGeneralSettings({
                              ...generalSettings,
                              dateFormat: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                          <SelectContent>
                            {DATE_FORMAT_OPTIONS.map((fmt) => (
                              <SelectItem key={fmt.value} value={fmt.value}>
                                {fmt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                          value={generalSettings.currency}
                          onValueChange={(value) =>
                            setGeneralSettings({
                              ...generalSettings,
                              currency: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCY_OPTIONS.map((curr) => (
                              <SelectItem key={curr.value} value={curr.value}>
                                {curr.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Business Hours</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={generalSettings.businessHours.startTime}
                          onChange={(e) =>
                            setGeneralSettings({
                              ...generalSettings,
                              businessHours: {
                                ...generalSettings.businessHours,
                                startTime: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={generalSettings.businessHours.endTime}
                          onChange={(e) =>
                            setGeneralSettings({
                              ...generalSettings,
                              businessHours: {
                                ...generalSettings.businessHours,
                                endTime: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Working Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                          <label
                            key={day}
                            className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer text-sm ${
                              generalSettings.businessHours.workingDays.includes(day)
                                ? "bg-green-100 border-green-300 text-green-800"
                                : "bg-muted border-border"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={generalSettings.businessHours.workingDays.includes(day)}
                              onChange={(e) => {
                                const newDays = e.target.checked
                                  ? [...generalSettings.businessHours.workingDays, day]
                                  : generalSettings.businessHours.workingDays.filter((d) => d !== day);
                                setGeneralSettings({
                                  ...generalSettings,
                                  businessHours: {
                                    ...generalSettings.businessHours,
                                    workingDays: newDays,
                                  },
                                });
                              }}
                              className="sr-only"
                            />
                            {day}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={saveGeneralSettings}
                      disabled={isSaving}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Profile Settings Tab ==================== */}
        <TabsContent value={SETTINGS_TABS.PROFILE} className="space-y-6">
          <ProfileSettingsTab organizationId={organizationId} />
        </TabsContent>

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
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>Configure email alerts for important events</CardDescription>
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

          <Button onClick={saveNotificationSettings} disabled={isSaving} className="bg-primary hover:bg-primary/90">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Notification Settings
          </Button>
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
  )
}

// Export with Suspense wrapper for useSearchParams
export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  )
}
