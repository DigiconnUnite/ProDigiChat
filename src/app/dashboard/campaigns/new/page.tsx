"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Users, 
  MessageSquare, 
  Clock, 
  FileText,
  Send,
  Calendar,
  Settings,
  AlertCircle,
  Loader2,
  Plus,
  X,
  Image,
  Paperclip,
  Video,
  FileAudio,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { StandardLayout } from "@/components/ui/standard-layout"
import { cn } from "@/lib/utils"
import { TemplatePreview } from "@/components/templates/template-preview"
import { HeaderContent, HeaderType } from "@/types/template"

// ═══════════════════════════════════════════════════════════════
// REUSABLE STYLED COMPONENTS
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
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  description?: string;
  titleIcon?: any;
  headerRight?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
}) {
  const borderClass = danger
    ? "border-2 border-red-400"
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

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface CampaignFormData {
  name: string
  type: "broadcast" | "recurring" | "ab_test"
  description: string
  audienceSegmentId: string
  audienceType: "existing" | "all" | "new"
  segmentName: string
  segmentRules: SegmentRule[]
  messageType: "template" | "freeform"
  templateId: string
  templateVariables: Record<string, string>
  freeformMessage: string
  mediaAttachments: MediaAttachment[]
  sendNow: boolean
  scheduledDate: string
  scheduledTime: string
  timezone: string
  throttleRate: number
  recurringType: "none" | "daily" | "weekly" | "monthly"
  recurringEndDate: string
  fromNumber: string
  useOptedInOnly: boolean
  trackClicks: boolean
}

interface SegmentRule {
  id: string
  field: string
  operator: string
  value: string
}

interface MediaAttachment {
  id: string
  type: "image" | "video" | "audio" | "document"
  url: string
  name: string
}

interface Template {
  id: string
  name: string
  category: string
  status: string
  content: string
  variables: string[]
}

interface CampaignPreviewData {
  header?: HeaderContent
  body: string
  footer?: string
  buttons: any[]
  variables: { index: number; sampleValue: string }[]
}

interface Segment {
  id: string
  name: string
  memberCount: number
}

interface WhatsAppAccount {
  id: string
  accountName: string
  businessAccountName?: string
  displayName?: string
  phoneNumber?: string
  phoneNumbers?: WhatsAppNumber[]
}

interface WhatsAppNumber {
  id: string
  phoneNumber: string
  displayName: string
  qualityScore?: string
}

const timezones = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Calcutta", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney" },
]

const steps = [
  { id: 1, name: "Campaign Details", icon: FileText },
  { id: 2, name: "Audience", icon: Users },
  { id: 3, name: "Message", icon: MessageSquare },
  { id: 4, name: "Schedule", icon: Clock },
  { id: 5, name: "Review & Launch", icon: Send },
]

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function NewCampaignPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Data from API
  const [segments, setSegments] = useState<Segment[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<WhatsAppNumber[]>([])
  const [whatsAppAccounts, setWhatsAppAccounts] = useState<WhatsAppAccount[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [isLoadingData, setIsLoadingData] = useState(true)
  
  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true)
      try {
        const segmentsRes = await fetch('/api/segments?includeCount=true')
        const segmentsData = await segmentsRes.json()
        if (segmentsData.success) {
          setSegments(segmentsData.data || [])
        }
        
        const templatesRes = await fetch('/api/templates?status=approved')
        const templatesData = await templatesRes.json()
        if (templatesData.templates) {
          const formattedTemplates: Template[] = templatesData.templates.map((t: any) => ({
            id: t.id,
            name: t.name,
            category: t.category,
            status: t.status,
            content: t.translations?.[0]?.body || '',
            variables: t.variables || []
          }))
          setTemplates(formattedTemplates)
        }
        
        const phoneRes = await fetch('/api/whatsapp/phone-numbers')
        const phoneData = await phoneRes.json()
        if (phoneData.success) {
          setPhoneNumbers(phoneData.data || [])
        }
        
        const accountsRes = await fetch('/api/settings/whatsapp')
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json()
          if (accountsData.accounts) {
            setWhatsAppAccounts(accountsData.accounts || [])
            if (accountsData.accounts.length === 1 && !formData.fromNumber) {
              setFormData(prev => ({ ...prev, fromNumber: accountsData.accounts[0].id }))
            }
            if (accountsData.defaultAccountId && !formData.fromNumber) {
              setFormData(prev => ({ ...prev, fromNumber: accountsData.defaultAccountId }))
            }
          }
        }

        const contactsRes = await fetch('/api/contacts?limit=1')
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json()
          if (contactsData.success) {
            setTotalContacts(contactsData.optedIn || 0)
          }
        }
      } catch (error) {
        console.error('Error fetching campaign data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    fetchData()

    // Re-fetch account list when user returns to this tab (e.g. after connecting WhatsApp)
    const handleFocus = () => fetchData()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])
  
  const [formData, setFormData] = useState<CampaignFormData>({
    name: "",
    type: "broadcast",
    description: "",
    audienceSegmentId: "",
    audienceType: "all",
    segmentName: "",
    segmentRules: [],
    messageType: "template",
    templateId: "",
    templateVariables: {},
    freeformMessage: "",
    mediaAttachments: [],
    sendNow: true,
    scheduledDate: "",
    scheduledTime: "",
    timezone: "America/New_York",
    throttleRate: 100,
    recurringType: "none",
    recurringEndDate: "",
    fromNumber: "",
    useOptedInOnly: true,
    trackClicks: true,
  })

  const [previewVariables, setPreviewVariables] = useState<{ index: number; sampleValue: string }[]>([])

  const updateFormData = useCallback((updates: Partial<CampaignFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    const newErrors = { ...errors }
    Object.keys(updates).forEach(key => {
      delete newErrors[key]
    })
    setErrors(newErrors)
  }, [errors])

  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = "Campaign name is required"
        if (!formData.type) newErrors.type = "Campaign type is required"
        break
      case 2:
        if (formData.audienceType === "existing" && !formData.audienceSegmentId) {
          newErrors.audienceSegmentId = "Please select an audience segment"
        }
        if (formData.audienceType === "new" && !formData.segmentName.trim()) {
          newErrors.segmentName = "Segment name is required"
        }
        break
      case 3:
        if (formData.messageType === "template" && !formData.templateId) {
          newErrors.templateId = "Please select a template"
        }
        if (formData.messageType === "freeform" && !formData.freeformMessage.trim()) {
          newErrors.freeformMessage = "Message content is required"
        }
        break
      case 4:
        if (!formData.sendNow && !formData.scheduledDate) {
          newErrors.scheduledDate = "Please select a schedule date"
        }
        if (!formData.sendNow && !formData.scheduledTime) {
          newErrors.scheduledTime = "Please select a schedule time"
        }
        break
      case 5:
        if (!formData.fromNumber) newErrors.fromNumber = "Please select a WhatsApp number"
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
    }
  }, [currentStep, validateStep])

  const handleBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!validateStep(5)) return
    
    setIsSubmitting(true)
    
    try {
      const campaignData = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        audienceSegmentId: formData.audienceType === "existing" ? formData.audienceSegmentId : null,
        fromNumber: formData.fromNumber,
        messageContent: JSON.stringify({
          type: formData.messageType,
          templateId: formData.templateId,
          templateVariables: formData.templateVariables,
          freeformMessage: formData.freeformMessage,
          mediaAttachments: formData.mediaAttachments,
        }),
        schedule: JSON.stringify({
          sendNow: formData.sendNow,
          scheduledAt: formData.sendNow ? null : `${formData.scheduledDate}T${formData.scheduledTime}`,
          timezone: formData.timezone,
          throttleRate: formData.throttleRate,
          recurringType: formData.recurringType,
          recurringEndDate: formData.recurringEndDate,
        }),
      }

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
      })

      if (!response.ok) throw new Error("Failed to create campaign")

      const result = await response.json()
      
      if (formData.sendNow && result.data?.id) {
        const launchResponse = await fetch(`/api/campaigns/${result.data.id}/launch`, {
          method: "POST"
        })
        const launchResult = await launchResponse.json()
        console.log('[Campaign] Launch result:', launchResult)
        
        if (!launchResponse.ok || !launchResult.success) {
          throw new Error(launchResult.error || 'Failed to launch campaign')
        }
      }

      router.push("/dashboard/campaigns")
    } catch (error) {
      console.error("Error creating campaign:", error)
      setErrors({ submit: "Failed to create campaign. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, router, validateStep])

  const selectedSegment = segments.find(s => s.id === formData.audienceSegmentId)
  const selectedTemplate = templates.find(t => t.id === formData.templateId)

  useEffect(() => {
    if (selectedTemplate && selectedTemplate.variables) {
      const vars = selectedTemplate.variables.map((v, index) => ({
        index: index + 1,
        sampleValue: formData.templateVariables[v] || ''
      }))
      setPreviewVariables(vars)
    } else {
      setPreviewVariables([])
    }
  }, [selectedTemplate, formData.templateVariables])

  const getTemplatePreviewData = (): CampaignPreviewData => {
    if (!selectedTemplate) {
      return { body: 'Select a template to preview', buttons: [], variables: [] }
    }
    let body = selectedTemplate.content
    previewVariables.forEach(v => {
      const regex = new RegExp(`\\{\\{${v.index}\\}\\}`, 'g')
      body = body.replace(regex, v.sampleValue || `{{${v.index}}}`)
    })
    return { body, footer: '', buttons: [], variables: previewVariables }
  }

  const getFreeformPreviewData = (): CampaignPreviewData => {
    let body = formData.freeformMessage || 'Type your message to preview...'
    body = body.replace(/\{\{contact\.name\}\}/g, 'John Doe')
    body = body.replace(/\{\{contact\.firstName\}\}/g, 'John')
    body = body.replace(/\{\{contact\.lastName\}\}/g, 'Doe')
    body = body.replace(/\{\{contact\.phone\}\}/g, '+1234567890')
    return { body, buttons: [], variables: [] }
  }

  const previewData = formData.messageType === 'template' ? getTemplatePreviewData() : getFreeformPreviewData()

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Campaign Details</h2>
              <p className="text-muted-foreground text-sm mt-1">Enter the basic information about your campaign</p>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">Campaign Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  placeholder="e.g., Summer Sale 2024"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  className={cn("rounded-lg border-slate-300 text-sm", errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Campaign Type <span className="text-red-500">*</span></Label>
                <RadioGroup
                  value={formData.type}
                  onValueChange={(value) => updateFormData({ type: value as any })}
                  className="grid gap-4 sm:grid-cols-3"
                >
                  <Label
                    htmlFor="broadcast"
                    className={cn(
                      "flex items-center space-x-3 p-4 rounded-xl border-2 bg-white hover:border-green-950 transition-all cursor-pointer",
                      formData.type === "broadcast" ? "border-green-950 bg-green-50/50" : "border-slate-200"
                    )}
                  >
                    <RadioGroupItem value="broadcast" id="broadcast" className="mt-0.5" />
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <Send className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground block">Broadcast</span>
                        <p className="text-xs text-muted-foreground">One-time message to all recipients</p>
                      </div>
                    </div>
                  </Label>
                  <Label
                    htmlFor="recurring"
                    className={cn(
                      "flex items-center space-x-3 p-4 rounded-xl border-2 bg-white hover:border-green-950 transition-all cursor-pointer",
                      formData.type === "recurring" ? "border-green-950 bg-green-50/50" : "border-slate-200"
                    )}
                  >
                    <RadioGroupItem value="recurring" id="recurring" className="mt-0.5" />
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Settings className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground block">Recurring</span>
                        <p className="text-xs text-muted-foreground">Scheduled messages on repeat</p>
                      </div>
                    </div>
                  </Label>
                  <Label
                    htmlFor="ab_test"
                    className="flex items-center space-x-3 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
                  >
                    <RadioGroupItem value="ab_test" id="ab_test" disabled className="mt-0.5" />
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-200 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground block">A/B Test</span>
                        <p className="text-xs text-muted-foreground">Test different variants</p>
                        <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">Coming Soon</Badge>
                      </div>
                    </div>
                  </Label>
                </RadioGroup>
                {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose of this campaign..."
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={3}
                  className="rounded-lg border-slate-300 text-sm"
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Select Audience</h2>
              <p className="text-muted-foreground text-sm mt-1">Choose who will receive your campaign messages</p>
            </div>

            <Tabs
              value={formData.audienceType}
              onValueChange={(value) => updateFormData({ audienceType: value as any })}
            >
              <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted border rounded-lg">
                <TabsTrigger value="all" className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  All Contacts
                </TabsTrigger>
                <TabsTrigger value="existing" className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Existing Segment
                </TabsTrigger>
                <TabsTrigger value="new" className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Create New
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <div className="p-8 rounded-xl border-2 border-green-950 bg-green-50/50 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">All Contacts</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This campaign will be sent to all opted-in contacts
                  </p>
                  <div className="text-4xl font-bold text-green-600">
                    {isLoadingData ? <span className="text-sm text-gray-400 font-normal">Loading...</span> :
                      totalContacts > 0 ? totalContacts.toLocaleString() : "0"}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Opted-in contacts</p>
                </div>
              </TabsContent>

              <TabsContent value="existing" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Select Segment</Label>
                    <Select
                      value={formData.audienceSegmentId}
                      onValueChange={(value) => updateFormData({ audienceSegmentId: value })}
                    >
                      <SelectTrigger className={cn("rounded-lg border-slate-300 text-sm", errors.audienceSegmentId && "border-destructive")}>
                        <SelectValue placeholder="Select a segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {segments.length > 0 ? segments.map((segment) => (
                          <SelectItem key={segment.id} value={segment.id}>
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{segment.name}</span>
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{segment.memberCount}</Badge>
                            </div>
                          </SelectItem>
                        )) : (
                          <div className="p-4 text-sm text-muted-foreground text-center w-full">No segments available</div>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.audienceSegmentId && <p className="text-sm text-destructive">{errors.audienceSegmentId}</p>}
                  </div>

                  {selectedSegment && (
                    <StyledCard accent>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-green-900">{selectedSegment.name}</p>
                          <p className="text-sm text-green-700">{selectedSegment.memberCount} recipients</p>
                        </div>
                      </div>
                    </StyledCard>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="new" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="segmentName" className="text-sm font-medium text-foreground">Segment Name</Label>
                    <Input
                      id="segmentName"
                      placeholder="e.g., High-Value Customers"
                      value={formData.segmentName}
                      onChange={(e) => updateFormData({ segmentName: e.target.value })}
                      className={cn("rounded-lg border-slate-300 text-sm", errors.segmentName && "border-destructive")}
                    />
                    {errors.segmentName && <p className="text-sm text-destructive">{errors.segmentName}</p>}
                  </div>
                  <Separator className="bg-slate-200" />
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">Segment Rules</Label>
                    <p className="text-xs text-muted-foreground">Add rules to define which contacts should be included</p>
                    {formData.segmentRules.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-xl">
                        <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No rules added yet</p>
                        <Button variant="outline" size="sm" className="mt-3 rounded-lg border-slate-300 text-xs" onClick={() => {
                          updateFormData({ segmentRules: [{ id: Date.now().toString(), field: "optInStatus", operator: "equals", value: "opted_in" }] })
                        }}>
                          <Plus className="h-4 w-4 mr-1" /> Add Rule
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.segmentRules.map((rule, index) => (
                          <div key={rule.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200">
                            <Select value={rule.field} onValueChange={(value) => {
                              const newRules = [...formData.segmentRules]
                              newRules[index].field = value
                              updateFormData({ segmentRules: newRules })
                            }}>
                              <SelectTrigger className="w-[150px] rounded-lg border-slate-300 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="optInStatus">Opt-in Status</SelectItem>
                                <SelectItem value="tags">Tags</SelectItem>
                                <SelectItem value="createdAt">Date Added</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input placeholder="Value" value={rule.value} onChange={(e) => {
                              const newRules = [...formData.segmentRules]
                              newRules[index].value = e.target.value
                              updateFormData({ segmentRules: newRules })
                            }} className="flex-1 rounded-lg border-slate-300 text-sm" />
                            <Button variant="ghost" size="icon" onClick={() => {
                              updateFormData({ segmentRules: formData.segmentRules.filter((_, i) => i !== index) })
                            }} className="rounded-lg text-muted-foreground hover:text-foreground">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs" onClick={() => {
                          updateFormData({ segmentRules: [...formData.segmentRules, { id: Date.now().toString(), field: "optInStatus", operator: "equals", value: "" }] })
                        }}>
                          <Plus className="h-4 w-4 mr-1" /> Add Another Rule
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Message Content</h2>
              <p className="text-muted-foreground text-sm mt-1">Create your WhatsApp message</p>
            </div>

            <Tabs
              value={formData.messageType}
              onValueChange={(value) => updateFormData({ messageType: value as any })}
            >
              <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted border rounded-lg">
                <TabsTrigger value="template" className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Use Template
                </TabsTrigger>
                <TabsTrigger value="freeform" className="text-sm py-2.5 rounded-md text-muted-foreground data-[state=active]:border-2 data-[state=active]:border-green-950 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  Freeform Message
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Select Template</Label>
                    <Select
                      value={formData.templateId}
                      onValueChange={(value) => updateFormData({ templateId: value })}
                    >
                      <SelectTrigger className={cn("rounded-lg border-slate-300 text-sm", errors.templateId && "border-destructive")}>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.status === "approved").length > 0 ? (
                          templates.filter(t => t.status === "approved").map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{template.category}</Badge>
                                <span>{template.name}</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-4 text-sm text-muted-foreground text-center w-full">No approved templates available</div>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.templateId && <p className="text-sm text-destructive">{errors.templateId}</p>}
                  </div>

                  {selectedTemplate && (
                    <StyledCard>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-foreground">{selectedTemplate.name}</span>
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">{selectedTemplate.category}</Badge>
                      </div>
                      <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50/50">
                        <p className="text-sm whitespace-pre-wrap text-foreground">{selectedTemplate.content}</p>
                      </div>
                      {selectedTemplate.variables.length > 0 && (
                        <div className="mt-6 space-y-3">
                          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fill Template Variables</Label>
                          {selectedTemplate.variables.map((variable, index) => (
                            <div key={variable} className="flex items-center gap-3">
                              <span className="text-sm font-medium w-28 text-foreground">{`{{${index + 1}}}`} <span className="text-muted-foreground">({variable})</span></span>
                              <Input
                                placeholder={`Enter ${variable}`}
                                value={formData.templateVariables[variable] || ""}
                                onChange={(e) => {
                                  const newVars = { ...formData.templateVariables, [variable]: e.target.value }
                                  updateFormData({ templateVariables: newVars })
                                  setPreviewVariables(prev => prev.map(v =>
                                    v.index === index + 1 ? { ...v, sampleValue: e.target.value } : v
                                  ))
                                }}
                                className="rounded-lg border-slate-300 text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </StyledCard>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="freeform" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="freeformMessage" className="text-sm font-medium text-foreground">Message Content</Label>
                    <Textarea
                      id="freeformMessage"
                      placeholder="Type your message here..."
                      value={formData.freeformMessage}
                      onChange={(e) => updateFormData({ freeformMessage: e.target.value })}
                      rows={6}
                      className={cn("rounded-lg border-slate-300 text-sm", errors.freeformMessage && "border-destructive")}
                    />
                    {errors.freeformMessage && <p className="text-sm text-destructive">{errors.freeformMessage}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Use {"{{contact.name}}"} for personalization</span>
                      <span className={formData.freeformMessage.length > 4000 ? "text-red-500 font-medium" : ""}>{formData.freeformMessage.length}/4096</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Media Attachments (Optional)</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs"><Image className="h-4 w-4 mr-1" />Image</Button>
                      <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs"><Video className="h-4 w-4 mr-1" />Video</Button>
                      <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs"><FileAudio className="h-4 w-4 mr-1" />Audio</Button>
                      <Button variant="outline" size="sm" className="rounded-lg border-slate-300 text-xs"><Paperclip className="h-4 w-4 mr-1" />Document</Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Schedule Campaign</h2>
              <p className="text-muted-foreground text-sm mt-1">Choose when to send your campaign</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-foreground">When to Send</Label>
                <RadioGroup
                  value={formData.sendNow ? "now" : "later"}
                  onValueChange={(value) => updateFormData({ sendNow: value === "now" })}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <Label
                    htmlFor="sendNow"
                    className={cn(
                      "flex items-center space-x-3 p-4 rounded-xl border-2 bg-white hover:border-green-950 transition-all cursor-pointer",
                      formData.sendNow ? "border-green-950 bg-green-50/50" : "border-slate-200"
                    )}
                  >
                    <RadioGroupItem value="now" id="sendNow" className="mt-0.5" />
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                        <Send className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground block">Send Immediately</span>
                      </div>
                    </div>
                  </Label>
                  <Label
                    htmlFor="scheduleLater"
                    className={cn(
                      "flex items-center space-x-3 p-4 rounded-xl border-2 bg-white hover:border-green-950 transition-all cursor-pointer",
                      !formData.sendNow ? "border-green-950 bg-green-50/50" : "border-slate-200"
                    )}
                  >
                    <RadioGroupItem value="later" id="scheduleLater" className="mt-0.5" />
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-foreground block">Schedule for Later</span>
                      </div>
                    </div>
                  </Label>
                </RadioGroup>
              </div>

              {!formData.sendNow && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduledDate" className="text-sm font-medium text-foreground">Date</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => updateFormData({ scheduledDate: e.target.value })}
                      className={cn("rounded-lg border-slate-300 text-sm", errors.scheduledDate && "border-destructive")}
                    />
                    {errors.scheduledDate && <p className="text-sm text-destructive">{errors.scheduledDate}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledTime" className="text-sm font-medium text-foreground">Time</Label>
                    <Input
                      id="scheduledTime"
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => updateFormData({ scheduledTime: e.target.value })}
                      className={cn("rounded-lg border-slate-300 text-sm", errors.scheduledTime && "border-destructive")}
                    />
                    {errors.scheduledTime && <p className="text-sm text-destructive">{errors.scheduledTime}</p>}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-medium text-foreground">Timezone</Label>
                <Select value={formData.timezone} onValueChange={(value) => updateFormData({ timezone: value })}>
                  <SelectTrigger id="timezone" className="rounded-lg border-slate-300 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.type === "recurring" && (
                <>
                  <Separator className="bg-slate-200" />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recurringType" className="text-sm font-medium text-foreground">Repeat</Label>
                      <Select value={formData.recurringType} onValueChange={(value) => updateFormData({ recurringType: value as any })}>
                        <SelectTrigger id="recurringType" className="rounded-lg border-slate-300 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Don&apos;t repeat</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {formData.recurringType !== "none" && (
                      <div className="space-y-2">
                        <Label htmlFor="recurringEndDate" className="text-sm font-medium text-foreground">End Date (Optional)</Label>
                        <Input
                          id="recurringEndDate"
                          type="date"
                          value={formData.recurringEndDate}
                          onChange={(e) => updateFormData({ recurringEndDate: e.target.value })}
                          className="rounded-lg border-slate-300 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator className="bg-slate-200" />
              
              <ToggleRow
                title="Message Throttling"
                description="Control how fast messages are sent to avoid rate limits"
                checked={formData.throttleRate > 0}
                onCheckedChange={(checked) => updateFormData({ throttleRate: checked ? 100 : 0 })}
              />

              {formData.throttleRate > 0 && (
                <div className="space-y-2 pl-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Messages per hour</span>
                    <span className="font-bold text-foreground">{formData.throttleRate}</span>
                  </div>
                  <Input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={formData.throttleRate}
                    onChange={(e) => updateFormData({ throttleRate: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Slow (10/hr)</span>
                    <span>Fast (1000/hr)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Review & Launch</h2>
              <p className="text-muted-foreground text-sm mt-1">Review your campaign details before launching</p>
            </div>

            <StyledCard
              title="Advanced Settings"
              titleIcon={Settings}
            >
              <div className="space-y-2">
                <Label htmlFor="fromNumber" className="text-sm font-medium text-foreground">Send from account <span className="text-red-500">*</span></Label>
                <Select value={formData.fromNumber} onValueChange={(value) => updateFormData({ fromNumber: value })}>
                  <SelectTrigger id="fromNumber" className={cn("rounded-lg border-slate-300 text-sm", errors.fromNumber && "border-destructive")}>
                    <SelectValue placeholder="Select WhatsApp account" />
                  </SelectTrigger>
                  <SelectContent>
                    {whatsAppAccounts.length > 0 ? whatsAppAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{account.accountName || account.businessAccountName || 'WhatsApp Account'}</span>
                          {account.phoneNumbers && account.phoneNumbers.length > 0 && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {account.phoneNumbers.map(p => p.phoneNumber).join(', ')}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    )) : phoneNumbers.length > 0 ? (
                      phoneNumbers.map((number) => (
                        <SelectItem key={number.id} value={number.id}>
                          <span className="font-medium text-foreground">{number.displayName}</span>
                          <span className="text-muted-foreground ml-2 font-mono text-xs">{number.phoneNumber}</span>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-sm text-muted-foreground text-center w-full">No WhatsApp accounts available</div>
                    )}
                  </SelectContent>
                </Select>
                {errors.fromNumber && <p className="text-sm text-destructive">{errors.fromNumber}</p>}
              </div>

              <Separator className="bg-slate-200 my-4" />

              <ToggleRow
                title="Send to opted-in contacts only"
                description="Only send to contacts who have explicitly opted in"
                checked={formData.useOptedInOnly}
                onCheckedChange={(checked) => updateFormData({ useOptedInOnly: checked })}
              />

              <ToggleRow
                title="Track link clicks"
                description="Track when recipients click links in your message"
                checked={formData.trackClicks}
                onCheckedChange={(checked) => updateFormData({ trackClicks: checked })}
              />
            </StyledCard>

            <StyledCard accent>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Send className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 text-lg">Ready to Launch</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {formData.sendNow 
                      ? "Your campaign will be sent immediately after confirmation." 
                      : `Your campaign will be sent at ${formData.scheduledTime} on ${formData.scheduledDate} (${formData.timezone}).`}
                  </p>
                </div>
              </div>
            </StyledCard>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <StandardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Sidebar - Stepper */}
        <div className={cn(
          "shrink-0",
          currentStep === 3 ? "lg:w-56" : "w-full lg:w-64"
        )}>
          <div className="p-5 rounded-xl bg-white border-2 border-green-950 sticky top-6">    
            <div className="space-y-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon
                const isActive = step.id === currentStep
                const isCompleted = step.id < currentStep

                return (
                  <div key={step.id} className="flex items-center">
                   
                    <button
                      onClick={() => {
                        if (isCompleted || step.id === currentStep) {
                          setCurrentStep(step.id)
                        }
                      }}
                      disabled={!isCompleted && step.id !== currentStep}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full",
                        isActive && "bg-green-950 text-white shadow-sm",
                        isCompleted && "bg-green-50 text-green-800 border-2 border-green-200 hover:bg-green-100",
                        !isActive && !isCompleted && "bg-slate-50 text-muted-foreground hover:bg-slate-100 border-2 border-transparent",
                      )}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                      <span>{step.name}</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Middle - Form Content */}
        <div className={cn(
          "min-w-0",
          currentStep === 3 ? "lg:flex-1" : "flex-1"
        )}>
          {errors.submit && (
            <StyledCard danger className="mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">Submission Error</h4>
                  <p className="text-xs text-red-700 mt-1">{errors.submit}</p>
                </div>
              </div>
            </StyledCard>
          )}

          <div className="p-5 rounded-xl bg-white border-2 border-green-950 min-h-[600px] space-y-0">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSubmitting} className="rounded-lg border-slate-300 text-sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {currentStep < steps.length ? (
              <Button onClick={handleNext} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm">
                {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Launching...</> : <><Send className="h-4 w-4 mr-2" />Launch Campaign</>}
              </Button>
            )}
          </div>
        </div>

        {/* Right Side - Preview Panel (Only for Step 3) */}
        {currentStep === 3 && (
          <div className="w-full lg:w-[360px] shrink-0">
            <div className="sticky top-6">
              <TemplatePreview preview={previewData} />
            </div>
          </div>
        )}
        </div>
      </div>
    </StandardLayout>
  )
}