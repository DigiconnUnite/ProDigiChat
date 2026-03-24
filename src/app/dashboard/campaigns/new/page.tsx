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
  FileAudio
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { TemplatePreview } from "@/components/templates/template-preview"
import { HeaderContent, HeaderType } from "@/types/template"

// Types
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

export default function NewCampaignPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Data from API
  const [segments, setSegments] = useState<Segment[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<WhatsAppNumber[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [isLoadingData, setIsLoadingData] = useState(true)
  
  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true)
      try {
        // Fetch segments
        const segmentsRes = await fetch('/api/segments?includeCount=true')
        const segmentsData = await segmentsRes.json()
        if (segmentsData.success) {
          setSegments(segmentsData.data || [])
        }
        
        // Fetch approved templates
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
        
        // Fetch WhatsApp phone numbers
        const phoneRes = await fetch('/api/whatsapp/phone-numbers')
        const phoneData = await phoneRes.json()
        if (phoneData.success) {
          setPhoneNumbers(phoneData.data || [])
        }
        
        // Fetch contacts count
        const contactsRes = await fetch('/api/contacts?limit=1')
        const contactsData = await contactsRes.json()
        if (contactsData.success) {
          setTotalContacts(contactsData.optedIn || 0)
        }
      } catch (error) {
        console.error('Error fetching campaign data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }
    
    fetchData()
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

  // Preview variables state
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
        fromNumber: formData.fromNumber, // Issue 3 fix - include fromNumber in API payload
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

  // Extract preview variables when template changes
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

  // Build preview data for template
  const getTemplatePreviewData = (): CampaignPreviewData => {
    if (!selectedTemplate) {
      return {
        body: 'Select a template to preview',
        buttons: [],
        variables: []
      }
    }

    // Replace template variables with preview values
    let body = selectedTemplate.content
    previewVariables.forEach(v => {
      const regex = new RegExp(`\\{\\{${v.index}\\}\\}`, 'g')
      body = body.replace(regex, v.sampleValue || `{{${v.index}}}`)
    })

    return {
      body,
      footer: '',
      buttons: [],
      variables: previewVariables
    }
  }

  // Build preview data for freeform message
  const getFreeformPreviewData = (): CampaignPreviewData => {
    // Replace personalization placeholders
    let body = formData.freeformMessage || 'Type your message to preview...'
    body = body.replace(/\{\{contact\.name\}\}/g, 'John Doe')
    body = body.replace(/\{\{contact\.firstName\}\}/g, 'John')
    body = body.replace(/\{\{contact\.lastName\}\}/g, 'Doe')
    body = body.replace(/\{\{contact\.phone\}\}/g, '+1234567890')

    return {
      body,
      buttons: [],
      variables: []
    }
  }

  const previewData = formData.messageType === 'template' ? getTemplatePreviewData() : getFreeformPreviewData()

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      

      <div className="flex items-center justify-between">
        <div className="hidden md:flex items-center gap-2">
          {steps.map((step, index) => {
            const StepIcon = step.icon
            const isActive = step.id === currentStep
            const isCompleted = step.id < currentStep

            return (
              <div key={step.id} className="flex items-center">
                {index > 0 && (
                  <div className={cn("w-8 h-0.5 mx-1", isCompleted ? "bg-primary" : "bg-muted")} />
                )}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isCompleted && "bg-primary/10 text-primary",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground",
                )}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  <span className="hidden lg:inline">{step.name}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {errors.submit && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {errors.submit}
        </div>
      )}

      <Card className="min-h-[600px]">
        <CardContent className="pt-6">
          {/* Step 1: Campaign Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Campaign Details</h2>
                <p className="text-muted-foreground">Enter the basic information about your campaign</p>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    placeholder="e.g., Summer Sale 2024"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    className={cn(errors.name && "border-destructive")}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Campaign Type <span className="text-destructive">*</span></Label>
                  <RadioGroup
                    value={formData.type}
                    onValueChange={(value) => updateFormData({ type: value as any })}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="broadcast" id="broadcast" />
                      <Label htmlFor="broadcast" className="font-normal cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Send className="text-lime-500" />
                          <div>
                            <span className="font-medium">Broadcast</span>
                            <p className="text-xs text-muted-foreground">One-time message to all recipients</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="recurring" id="recurring" />
                      <Label htmlFor="recurring" className="font-normal cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Settings className="text-lime-500" />
                          <div>
                            <span className="font-medium">Recurring</span>
                            <p className="text-xs text-muted-foreground">Scheduled messages on repeat</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="ab_test" id="ab_test" />
                      <Label htmlFor="ab_test" className="font-normal cursor-pointer">
                        <div className="flex items-center gap-2">
                          <FileText className="text-lime-500" />
                          <div>
                            <span className="font-medium">A/B Test</span>
                            <p className="text-xs text-muted-foreground">Test different message variants</p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                  {errors.type && <p className="text-sm text-destructive">{errors.type}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the purpose of this campaign..."
                    value={formData.description}
                    onChange={(e) => updateFormData({ description: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Audience */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Select Audience</h2>
                <p className="text-muted-foreground">Choose who will receive your campaign messages</p>
              </div>

              <Tabs
                value={formData.audienceType}
                onValueChange={(value) => updateFormData({ audienceType: value as any })}
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All Contacts</TabsTrigger>
                  <TabsTrigger value="existing">Existing Segment</TabsTrigger>
                  <TabsTrigger value="new">Create New</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="bg-muted/50 rounded-lg p-6 text-center">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <h3 className="font-medium mb-1">All Contacts</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This campaign will be sent to all opted-in contacts
                    </p>
                    <div className="text-3xl font-bold text-primary">
                      {isLoadingData ? <span className="text-sm text-gray-400">Loading...</span> : 
                        totalContacts > 0 ? totalContacts.toLocaleString() : "0"}
                    </div>
                    <p className="text-sm text-muted-foreground">Opted-in contacts</p>
                  </div>
                </TabsContent>

                <TabsContent value="existing" className="mt-4">
                  <div className="space-y-4">
                    <Select
                      value={formData.audienceSegmentId}
                      onValueChange={(value) => updateFormData({ audienceSegmentId: value })}
                    >
                      <SelectTrigger className={cn(errors.audienceSegmentId && "border-destructive")}>
                        <SelectValue placeholder="Select a segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {segments.length > 0 ? segments.map((segment) => (
                          <SelectItem key={segment.id} value={segment.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{segment.name}</span>
                              <Badge variant="secondary" className="ml-2">{segment.memberCount}</Badge>
                            </div>
                          </SelectItem>
                        )) : (
                          <div className="p-2 text-sm text-muted-foreground">No segments available</div>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.audienceSegmentId && <p className="text-sm text-destructive">{errors.audienceSegmentId}</p>}

                    {selectedSegment && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-green-600" />
                          <div>
                            <p className="font-medium text-green-900">{selectedSegment.name}</p>
                            <p className="text-sm text-green-700">{selectedSegment.memberCount} recipients</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="new" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="segmentName">Segment Name</Label>
                      <Input
                        id="segmentName"
                        placeholder="e.g., High-Value Customers"
                        value={formData.segmentName}
                        onChange={(e) => updateFormData({ segmentName: e.target.value })}
                        className={cn(errors.segmentName && "border-destructive")}
                      />
                      {errors.segmentName && <p className="text-sm text-destructive">{errors.segmentName}</p>}
                    </div>
                    <Separator />
                    <div className="space-y-3">
                      <Label>Segment Rules</Label>
                      <p className="text-sm text-muted-foreground">Add rules to define which contacts should be included</p>
                      {formData.segmentRules.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                          <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No rules added yet</p>
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => {
                            updateFormData({ segmentRules: [{ id: Date.now().toString(), field: "optInStatus", operator: "equals", value: "opted_in" }] })
                          }}>
                            <Plus className="h-4 w-4 mr-1" /> Add Rule
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {formData.segmentRules.map((rule, index) => (
                            <div key={rule.id} className="flex items-center gap-2">
                              <Select value={rule.field} onValueChange={(value) => {
                                const newRules = [...formData.segmentRules]
                                newRules[index].field = value
                                updateFormData({ segmentRules: newRules })
                              }}>
                                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
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
                              }} className="flex-1" />
                              <Button variant="ghost" size="icon" onClick={() => {
                                updateFormData({ segmentRules: formData.segmentRules.filter((_, i) => i !== index) })
                              }}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => {
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
          )}

          {/* Step 3: Message */}
          {currentStep === 3 && (
            <div className="space-y-6">
              

              <div className="flex gap-6">
                {/* Message Editor */}
                <div className="flex-1">
                  <Tabs
                    value={formData.messageType}
                    onValueChange={(value) => updateFormData({ messageType: value as any })}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="template">Use Template</TabsTrigger>
                      <TabsTrigger value="freeform">Freeform Message</TabsTrigger>
                    </TabsList>

                    <TabsContent value="template" className="mt-4">
                      <div className="space-y-4">
                        <Select
                          value={formData.templateId}
                          onValueChange={(value) => updateFormData({ templateId: value })}
                        >
                          <SelectTrigger className={cn(errors.templateId && "border-destructive")}>
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.filter(t => t.status === "approved").length > 0 ? (
                              templates.filter(t => t.status === "approved").map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{template.category}</Badge>
                                    <span>{template.name}</span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground">No approved templates available</div>
                            )}
                          </SelectContent>
                        </Select>
                        {errors.templateId && <p className="text-sm text-destructive">{errors.templateId}</p>}

                        {selectedTemplate && (
                          <Card>
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-medium">{selectedTemplate.name}</CardTitle>
                                <Badge variant="secondary">{selectedTemplate.category}</Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <p className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</p>
                              </div>
                              {selectedTemplate.variables.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <Label className="text-xs text-muted-foreground">Fill Template Variables</Label>
                                  {selectedTemplate.variables.map((variable, index) => (
                                    <div key={variable} className="flex items-center gap-2">
                                      <span className="text-sm font-medium w-24">{`{{${index + 1}}}`} ({variable}):</span>
                                      <Input
                                        placeholder={`Enter ${variable}`}
                                        value={formData.templateVariables[variable] || ""}
                                        onChange={(e) => {
                                          const newVars = { ...formData.templateVariables, [variable]: e.target.value }
                                          updateFormData({ templateVariables: newVars })
                                          // Also update preview variables
                                          setPreviewVariables(prev => prev.map(v => 
                                            v.index === index + 1 ? { ...v, sampleValue: e.target.value } : v
                                          ))
                                        }}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="freeform" className="mt-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="freeformMessage">Message Content</Label>
                          <Textarea
                            id="freeformMessage"
                            placeholder="Type your message here..."
                            value={formData.freeformMessage}
                            onChange={(e) => updateFormData({ freeformMessage: e.target.value })}
                            rows={6}
                            className={cn(errors.freeformMessage && "border-destructive")}
                          />
                          {errors.freeformMessage && <p className="text-sm text-destructive">{errors.freeformMessage}</p>}
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Use {"{{contact.name}}"} for personalization</span>
                            <span>{formData.freeformMessage.length}/4096</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Media Attachments (Optional)</Label>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm"><Image className="h-4 w-4 mr-1" />Image</Button>
                            <Button variant="outline" size="sm"><Video className="h-4 w-4 mr-1" />Video</Button>
                            <Button variant="outline" size="sm"><FileAudio className="h-4 w-4 mr-1" />Audio</Button>
                            <Button variant="outline" size="sm"><Paperclip className="h-4 w-4 mr-1" />Document</Button>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Preview Panel */}
                <div className="w-[360px] shrink-0 hidden lg:block">
                  <div className="sticky top-4">
                    <TemplatePreview preview={previewData} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Schedule Campaign</h2>
                <p className="text-muted-foreground">Choose when to send your campaign</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>When to Send</Label>
                  <RadioGroup
                    value={formData.sendNow ? "now" : "later"}
                    onValueChange={(value) => updateFormData({ sendNow: value === "now" })}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="now" id="sendNow" />
                      <Label htmlFor="sendNow" className="font-normal cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4 text-green-500" />
                          <span>Send Immediately</span>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="later" id="scheduleLater" />
                      <Label htmlFor="scheduleLater" className="font-normal cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <span>Schedule for Later</span>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {!formData.sendNow && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Date</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => updateFormData({ scheduledDate: e.target.value })}
                        className={cn(errors.scheduledDate && "border-destructive")}
                      />
                      {errors.scheduledDate && <p className="text-sm text-destructive">{errors.scheduledDate}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Time</Label>
                      <Input
                        id="scheduledTime"
                        type="time"
                        value={formData.scheduledTime}
                        onChange={(e) => updateFormData({ scheduledTime: e.target.value })}
                        className={cn(errors.scheduledTime && "border-destructive")}
                      />
                      {errors.scheduledTime && <p className="text-sm text-destructive">{errors.scheduledTime}</p>}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={formData.timezone} onValueChange={(value) => updateFormData({ timezone: value })}>
                    <SelectTrigger id="timezone"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === "recurring" && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="recurringType">Repeat</Label>
                        <Select value={formData.recurringType} onValueChange={(value) => updateFormData({ recurringType: value as any })}>
                          <SelectTrigger id="recurringType"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Don't repeat</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {formData.recurringType !== "none" && (
                        <div className="space-y-2">
                          <Label htmlFor="recurringEndDate">End Date (Optional)</Label>
                          <Input
                            id="recurringEndDate"
                            type="date"
                            value={formData.recurringEndDate}
                            onChange={(e) => updateFormData({ recurringEndDate: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Message Throttling</Label>
                      <p className="text-xs text-muted-foreground">Control how fast messages are sent</p>
                    </div>
                    <Switch
                      checked={formData.throttleRate > 0}
                      onCheckedChange={(checked) => updateFormData({ throttleRate: checked ? 100 : 0 })}
                    />
                  </div>
                  {formData.throttleRate > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Messages per hour</span>
                        <span className="font-medium">{formData.throttleRate}</span>
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review & Launch */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Review & Launch</h2>
                <p className="text-muted-foreground">Review your campaign details before launching</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Campaign Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline" className="capitalize">{formData.type.replace("_", " ")}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Audience</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-medium">
                        {formData.audienceType === "all" ? "All Contacts" : 
                          formData.audienceType === "existing" ? selectedSegment?.name || "Selected Segment" : 
                          formData.segmentName || "New Segment"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recipients</span>
                      <span className="font-medium">
                        {formData.audienceType === "all" ? (totalContacts > 0 ? totalContacts.toLocaleString() : "0") : 
                          selectedSegment?.memberCount?.toLocaleString() || "—"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Message</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline" className="capitalize">{formData.messageType}</Badge>
                    </div>
                    {formData.messageType === "template" && selectedTemplate && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Template</span>
                        <span className="font-medium text-sm">{selectedTemplate.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Media</span>
                      <span className="font-medium">
                        {formData.mediaAttachments.length > 0 ? `${formData.mediaAttachments.length} attached` : "None"}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Schedule</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">When</span>
                      <span className="font-medium">
                        {formData.sendNow ? "Send Immediately" : `${formData.scheduledDate} at ${formData.scheduledTime}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Throttling</span>
                      <span className="font-medium">
                        {formData.throttleRate > 0 ? `${formData.throttleRate}/hr` : "Unlimited"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromNumber">WhatsApp Number <span className="text-destructive">*</span></Label>
                    <Select value={formData.fromNumber} onValueChange={(value) => updateFormData({ fromNumber: value })}>
                      <SelectTrigger id="fromNumber" className={cn(errors.fromNumber && "border-destructive")}>
                        <SelectValue placeholder="Select WhatsApp number" />
                      </SelectTrigger>
                      <SelectContent>
                        {phoneNumbers.length > 0 ? phoneNumbers.map((number) => (
                          <SelectItem key={number.id} value={number.id}>
                            <span>{number.displayName}</span>
                            <span className="text-muted-foreground ml-2">{number.phoneNumber}</span>
                          </SelectItem>
                        )) : (
                          <div className="p-2 text-sm text-muted-foreground">No WhatsApp numbers available</div>
                        )}
                      </SelectContent>
                    </Select>
                    {errors.fromNumber && <p className="text-sm text-destructive">{errors.fromNumber}</p>}
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Send to opted-in contacts only</Label>
                        <p className="text-xs text-muted-foreground">Only send to contacts who have opted in</p>
                      </div>
                      <Switch checked={formData.useOptedInOnly} onCheckedChange={(checked) => updateFormData({ useOptedInOnly: checked })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">Track link clicks</Label>
                        <p className="text-xs text-muted-foreground">Track when recipients click links</p>
                      </div>
                      <Switch checked={formData.trackClicks} onCheckedChange={(checked) => updateFormData({ trackClicks: checked })} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-900">Ready to Launch</h4>
                    <p className="text-sm text-green-700">
                      {formData.sendNow ? "Your campaign will be sent immediately after confirmation." : "Your campaign will be sent at the scheduled time."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1 || isSubmitting}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={handleNext}>
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Launching...</> : <><Send className="h-4 w-4 mr-2" />Launch Campaign</>}
          </Button>
        )}
      </div>
    </div>
  )
}
