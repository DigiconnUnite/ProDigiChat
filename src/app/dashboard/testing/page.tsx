"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Settings,
  MessageSquare,
  Users,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  FileText,
  Zap,
  TestTube,
  AlertTriangle,
  Phone,
  Mail,
  Tag,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

// Types
interface TestResult {
  id: string
  name: string
  status: "pending" | "running" | "success" | "error"
  message?: string
  timestamp: Date
  details?: any
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  phoneNumber: string
  email?: string
  optInStatus: string
}

interface Template {
  id: string
  name: string
  category: string
  status: string
  translations: any[]
  variables?: string[]
}

interface Campaign {
  id: string
  name: string
  type: string
  status: string
}

interface ConfigSettings {
  apiKey: string
  phoneNumberId: string
  businessAccountId: string
  timezone: string
}

// Utility function to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15)

export default function TestingPage() {
  const router = useRouter()
  
  // Test Results State
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isAllTestsRunning, setIsAllTestsRunning] = useState(false)
  
  // Configuration State
  const [config, setConfig] = useState<ConfigSettings>({
    apiKey: "",
    phoneNumberId: "",
    businessAccountId: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  })
  const [isConfigExpanded, setIsConfigExpanded] = useState(true)
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaved, setConfigSaved] = useState(false)
  
  // Contact State
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactLoading, setContactLoading] = useState(false)
  const [newContact, setNewContact] = useState({
    firstName: "Test",
    lastName: "User",
    phoneNumber: "",
    email: "",
    optInStatus: "opted_in",
  })
  
  // Template State
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateLoading, setTemplateLoading] = useState(false)
  const [newTemplate, setNewTemplate] = useState({
    name: "test_template",
    category: "MARKETING",
    body: "Hello {{1}}, this is a test message from the WhatsApp Marketing Tool!",
    language: "en",
  })
  
  // Campaign State
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [newCampaign, setNewCampaign] = useState({
    name: "Test Campaign",
    type: "broadcast",
    templateId: "",
    contactIds: [] as string[],
  })
  
  // Message State
  const [messageData, setMessageData] = useState({
    phoneNumber: "",
    templateName: "",
    variables: "{}",
  })
  const [messageLoading, setMessageLoading] = useState(false)

  // Helper function to add test result
  const addTestResult = useCallback((name: string, status: TestResult["status"], message?: string, details?: any) => {
    setTestResults(prev => [{
      id: generateId(),
      name,
      status,
      message,
      timestamp: new Date(),
      details,
    }, ...prev])
  }, [])

  // Load initial data
  useEffect(() => {
    loadContacts()
    loadTemplates()
    loadCampaigns()
    loadConfig()
  }, [])

  // Load Configuration
  const loadConfig = async () => {
    try {
      const response = await fetch("/api/settings/whatsapp")
      if (response.ok) {
        const data = await response.json()
        const whatsappConfig = data.config || data.settings || {}
        setConfig(prev => ({
          ...prev,
          apiKey: whatsappConfig.apiKey || "",
          phoneNumberId: whatsappConfig.phoneNumberId || "",
          businessAccountId: whatsappConfig.businessAccountId || "",
        }))
      }
    } catch (error) {
      console.error("Error loading config:", error)
    }
  }

  // Save Configuration
  const saveConfig = async () => {
    setConfigLoading(true)
    try {
      const response = await fetch("/api/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            apiKey: config.apiKey,
            phoneNumberId: config.phoneNumberId,
            businessAccountId: config.businessAccountId,
          },
        }),
      })
      
      if (response.ok) {
        setConfigSaved(true)
        addTestResult("Configuration Save", "success", "Settings saved successfully")
        toast.success("Configuration saved successfully")
        setTimeout(() => setConfigSaved(false), 3000)
      } else {
        throw new Error("Failed to save config")
      }
    } catch (error) {
      addTestResult("Configuration Save", "error", "Failed to save settings")
      toast.error("Failed to save configuration")
    } finally {
      setConfigLoading(false)
    }
  }

  // Load Contacts
  const loadContacts = async () => {
    setContactLoading(true)
    try {
      const response = await fetch("/api/contacts?limit=100")
      const data = await response.json()
      if (data.success) {
        setContacts(data.data || [])
      }
    } catch (error) {
      console.error("Error loading contacts:", error)
    } finally {
      setContactLoading(false)
    }
  }

  // Add Contact
  const addContact = async () => {
    if (!newContact.phoneNumber) {
      toast.error("Phone number is required")
      return
    }

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newContact),
      })
      
      const data = await response.json()
      if (data.success) {
        addTestResult("Add Contact", "success", `Contact ${newContact.firstName} added successfully`, data.data)
        toast.success("Contact added successfully")
        setNewContact({
          firstName: "Test",
          lastName: "User",
          phoneNumber: "",
          email: "",
          optInStatus: "opted_in",
        })
        loadContacts()
      } else {
        throw new Error(data.error || "Failed to add contact")
      }
    } catch (error: any) {
      addTestResult("Add Contact", "error", error.message)
      toast.error(error.message)
    }
  }

  // Delete Contact
  const deleteContact = async (id: string) => {
    try {
      const response = await fetch(`/api/contacts?id=${id}`, { method: "DELETE" })
      const data = await response.json()
      if (data.success) {
        addTestResult("Delete Contact", "success", "Contact deleted successfully")
        loadContacts()
      }
    } catch (error) {
      addTestResult("Delete Contact", "error", "Failed to delete contact")
    }
  }

  // Load Templates
  const loadTemplates = async () => {
    setTemplateLoading(true)
    try {
      const response = await fetch("/api/templates?limit=100")
      const data = await response.json()
      if (data.templates) {
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error("Error loading templates:", error)
    } finally {
      setTemplateLoading(false)
    }
  }

  // Create Template
  const createTemplate = async () => {
    if (!newTemplate.name || !newTemplate.body) {
      toast.error("Template name and body are required")
      return
    }

    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTemplate.name,
          category: newTemplate.category,
          translations: [{
            language: newTemplate.language,
            body: newTemplate.body,
          }],
        }),
      })
      
      const data = await response.json()
      if (data.template || !data.error) {
        addTestResult("Create Template", "success", `Template ${newTemplate.name} created`, data.template)
        toast.success("Template created successfully")
        setNewTemplate({
          name: `test_template_${Date.now()}`,
          category: "MARKETING",
          body: "Hello {{1}}, this is a test message!",
          language: "en",
        })
        loadTemplates()
      } else {
        throw new Error(data.error || "Failed to create template")
      }
    } catch (error: any) {
      addTestResult("Create Template", "error", error.message)
      toast.error(error.message)
    }
  }

  // Verify Template
  const verifyTemplate = async (templateId: string) => {
    try {
      const response = await fetch("/api/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          action: "checkStatus",
        }),
      })
      
      const data = await response.json()
      if (response.ok) {
        addTestResult("Verify Template", "success", `Template status: ${data.status}`, data)
        toast.success(`Template status: ${data.status}`)
        loadTemplates()
      } else {
        throw new Error(data.error || "Failed to verify template")
      }
    } catch (error: any) {
      addTestResult("Verify Template", "error", error.message)
      toast.error(error.message)
    }
  }

  // Load Campaigns
  const loadCampaigns = async () => {
    setCampaignLoading(true)
    try {
      const response = await fetch("/api/campaigns")
      const data = await response.json()
      if (data.success) {
        setCampaigns(data.data || [])
      }
    } catch (error) {
      console.error("Error loading campaigns:", error)
    } finally {
      setCampaignLoading(false)
    }
  }

  // Create Campaign
  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.templateId) {
      toast.error("Campaign name and template are required")
      return
    }

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCampaign.name,
          type: newCampaign.type,
          templateId: newCampaign.templateId,
          contactIds: newCampaign.contactIds.length > 0 ? newCampaign.contactIds : undefined,
          schedule: JSON.stringify({ sendNow: true }),
        }),
      })
      
      const data = await response.json()
      if (data.success || response.ok) {
        addTestResult("Create Campaign", "success", `Campaign ${newCampaign.name} created`, data.data)
        toast.success("Campaign created successfully")
        setNewCampaign({
          name: `Test Campaign ${Date.now()}`,
          type: "broadcast",
          templateId: "",
          contactIds: [],
        })
        loadCampaigns()
      } else {
        throw new Error(data.error || "Failed to create campaign")
      }
    } catch (error: any) {
      addTestResult("Create Campaign", "error", error.message)
      toast.error(error.message)
    }
  }

  // Send Message
  const sendMessage = async () => {
    if (!messageData.phoneNumber || !messageData.templateName) {
      toast.error("Phone number and template name are required")
      return
    }

    setMessageLoading(true)
    try {
      let variables: Record<string, string> = {}
      try {
        variables = JSON.parse(messageData.variables)
      } catch {
        variables = {}
      }

      const response = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "template",
          to: messageData.phoneNumber,
          templateName: messageData.templateName,
          components: [],
        }),
      })
      
      const data = await response.json()
      if (response.ok && data.success) {
        addTestResult("Send Message", "success", `Message sent to ${messageData.phoneNumber}`, data)
        toast.success("Message sent successfully")
      } else {
        throw new Error(data.error || "Failed to send message")
      }
    } catch (error: any) {
      addTestResult("Send Message", "error", error.message)
      toast.error(error.message)
    } finally {
      setMessageLoading(false)
    }
  }

  // Run All Tests
  const runAllTests = async () => {
    setIsAllTestsRunning(true)
    setTestResults([])
    
    // Test 1: Configuration
    addTestResult("Configuration Check", "running", "Checking configuration...")
    if (config.phoneNumberId && config.apiKey && config.businessAccountId) {
      addTestResult("Configuration Check", "success", "Configuration is set")
    } else {
      addTestResult("Configuration Check", "error", "Configuration not complete. Please configure WhatsApp credentials.")
    }

    // Test 2: API Health
    addTestResult("API Health", "running", "Checking API endpoints...")
    try {
      const [contactsRes, templatesRes, campaignsRes] = await Promise.all([
        fetch("/api/contacts?limit=1"),
        fetch("/api/templates?limit=1"),
        fetch("/api/campaigns?limit=1"),
      ])
      
      const allOk = contactsRes.ok && templatesRes.ok && campaignsRes.ok
      addTestResult("API Health", allOk ? "success" : "error", 
        allOk ? "All APIs responding" : "Some APIs not responding")
    } catch {
      addTestResult("API Health", "error", "API connection failed")
    }

    // Test 3: Contacts API
    addTestResult("Contacts API", "running", "Testing contacts endpoint...")
    try {
      const response = await fetch("/api/contacts?limit=1")
      const data = await response.json()
      addTestResult("Contacts API", data.success ? "success" : "error", 
        `${data.success ? "Working" : "Failed"} - ${data.total || 0} contacts`)
    } catch {
      addTestResult("Contacts API", "error", "Failed to connect")
    }

    // Test 4: Templates API
    addTestResult("Templates API", "running", "Testing templates endpoint...")
    try {
      const response = await fetch("/api/templates?limit=1")
      const data = await response.json()
      addTestResult("Templates API", data.templates ? "success" : "error", 
        `${data.templates ? "Working" : "Failed"} - ${data.pagination?.total || 0} templates`)
    } catch {
      addTestResult("Templates API", "error", "Failed to connect")
    }

    // Test 5: Campaigns API
    addTestResult("Campaigns API", "running", "Testing campaigns endpoint...")
    try {
      const response = await fetch("/api/campaigns")
      const data = await response.json()
      addTestResult("Campaigns API", data.success ? "success" : "error", 
        `${data.success ? "Working" : "Failed"} - ${data.total || 0} campaigns`)
    } catch {
      addTestResult("Campaigns API", "error", "Failed to connect")
    }

    // Test 6: WhatsApp API
    addTestResult("WhatsApp API", "running", "Testing WhatsApp connection...")
    try {
      const response = await fetch("/api/whatsapp")
      addTestResult("WhatsApp API", response.ok ? "success" : "error", 
        response.ok ? "WhatsApp API connected" : "WhatsApp API error")
    } catch {
      addTestResult("WhatsApp API", "error", "Failed to connect")
    }

    setIsAllTestsRunning(false)
    toast.success("All tests completed")
  }

  // Clear Test Results
  const clearTestResults = () => {
    setTestResults([])
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-200"
      case "error":
        return "bg-red-100 text-red-800 border-red-200"
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case "error":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "running":
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TestTube className="w-6 h-6 text-green-600" />
            Platform Testing
          </h1>
          <p className="text-gray-500">
            Test all functionality and verify the platform is working correctly
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={runAllTests}
            disabled={isAllTestsRunning}
            className="gap-2"
          >
            {isAllTestsRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            Run All Tests
          </Button>
          <Button
            variant="outline"
            onClick={clearTestResults}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Results
          </Button>
        </div>
      </div>

      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tests" className="gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Test Results
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1">
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1">
            <Users className="w-4 h-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1">
            <Send className="w-4 h-4" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        {/* Test Results Tab */}
        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Test Results
              </CardTitle>
              <CardDescription>
                View the results of all tests performed on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <TestTube className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No tests run yet. Click "Run All Tests" to start.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.name}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(result.status)}>
                            {getStatusIcon(result.status)}
                            <span className="ml-1 capitalize">{result.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>{result.message || "-"}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {result.timestamp.toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/testing?tab=config')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Settings className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Configuration</p>
                    <p className="text-sm text-gray-500">Set up WhatsApp API</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/testing?tab=contacts')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Contacts</p>
                    <p className="text-sm text-gray-500">Add & manage contacts</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/testing?tab=templates')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Templates</p>
                    <p className="text-sm text-gray-500">Create message templates</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/dashboard/testing?tab=campaigns')}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <Send className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium">Campaigns</p>
                    <p className="text-sm text-gray-500">Create & send campaigns</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <Collapsible open={isConfigExpanded} onOpenChange={setIsConfigExpanded}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-gray-50">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      WhatsApp Configuration
                    </span>
                    {isConfigExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </CardTitle>
                  <CardDescription>
                    Configure your WhatsApp Business API credentials
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                      These settings are required for the platform to send messages. Obtain these credentials from the Meta Developer Portal.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">WhatsApp Phone Number ID</label>
                      <Input
                        placeholder="Enter Phone Number ID"
                        value={config.phoneNumberId}
                        onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Meta Business ID</label>
                      <Input
                        placeholder="Enter Business ID"
                        value={config.businessAccountId}
                        onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">WhatsApp Access Token</label>
                    <Input
                      type="password"
                      placeholder="Enter Access Token"
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Timezone</label>
                    <Input
                      placeholder="Enter Timezone"
                      value={config.timezone}
                      onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
                    />
                  </div>

                  <Button onClick={saveConfig} disabled={configLoading} className="gap-2">
                    {configLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : configSaved ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Settings className="w-4 h-4" />
                    )}
                    {configSaved ? "Saved!" : "Save Configuration"}
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Send Test Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Test Message
              </CardTitle>
              <CardDescription>
                Send a test message to verify the WhatsApp connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    placeholder="+1234567890"
                    value={messageData.phoneNumber}
                    onChange={(e) => setMessageData({ ...messageData, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Name</label>
                  <Select
                    value={messageData.templateName}
                    onValueChange={(value) => setMessageData({ ...messageData, templateName: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.filter(t => t.status === "approved").map((template) => (
                        <SelectItem key={template.id} value={template.name}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Variables (JSON)</label>
                <Textarea
                  placeholder='{"1": "John"}'
                  value={messageData.variables}
                  onChange={(e) => setMessageData({ ...messageData, variables: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>

              <Button onClick={sendMessage} disabled={messageLoading} className="gap-2">
                {messageLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>WhatsApp Opt-in/Opt-out Explained</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                <li><strong>Opted In (✅):</strong> Contact has given explicit permission to receive WhatsApp messages. You can send any message type.</li>
                <li><strong>Opted Out (❌):</strong> Contact has sent "STOP" or opted out. Cannot send messages - will fail.</li>
                <li><strong>Pending (⏳):</strong> New contact created but hasn't replied yet. First message MUST be a template.</li>
              </ul>
              <p className="mt-2 text-sm">
                <strong>Important:</strong> WhatsApp requires explicit opt-in. You cannot message contacts who haven't opted in.
              </p>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Add Contact
              </CardTitle>
              <CardDescription>
                Add a new contact to test the contacts API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <Input
                    placeholder="First Name"
                    value={newContact.firstName}
                    onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <Input
                    placeholder="Last Name"
                    value={newContact.lastName}
                    onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      className="pl-10"
                      placeholder="+1234567890"
                      value={newContact.phoneNumber}
                      onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      className="pl-10"
                      type="email"
                      placeholder="email@example.com"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Opt-in Status</label>
                <Select
                  value={newContact.optInStatus}
                  onValueChange={(value) => setNewContact({ ...newContact, optInStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opted_in">Opted In ✅ - Can receive messages</SelectItem>
                    <SelectItem value="opted_out">Opted Out ❌ - Cannot receive messages</SelectItem>
                    <SelectItem value="pending">Pending ⏳ - New, waiting for first message</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  <strong>Opt-in:</strong> Contact agreed to receive messages | 
                  <strong>Opt-out:</strong> Contact stopped messages | 
                  <strong>Pending:</strong> New contact awaiting interaction
                </p>
              </div>

              <Button onClick={addContact} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Contact
              </Button>
            </CardContent>
          </Card>

          {/* Contacts List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Contacts List
                </CardTitle>
                <CardDescription>
                  {contacts.length} contacts in the database
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadContacts} disabled={contactLoading} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${contactLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {contactLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No contacts found. Add your first contact above.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.slice(0, 10).map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </TableCell>
                        <TableCell className="font-mono">{contact.phoneNumber}</TableCell>
                        <TableCell>{contact.email || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            contact.optInStatus === "opted_in" ? "bg-green-50 text-green-700 border-green-200" :
                            contact.optInStatus === "opted_out" ? "bg-red-50 text-red-700 border-red-200" :
                            "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }>
                            {contact.optInStatus === "opted_in" ? "✅ Opted In" : 
                             contact.optInStatus === "opted_out" ? "❌ Opted Out" : 
                             "⏳ Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteContact(contact.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Create Template
              </CardTitle>
              <CardDescription>
                Create a new message template to test the templates API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Template Name *</label>
                  <Input
                    placeholder="test_template (lowercase, underscores only)"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={newTemplate.category}
                    onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKETING">Marketing</SelectItem>
                      <SelectItem value="UTILITY">Utility</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Language</label>
                  <Select
                    value={newTemplate.language}
                    onValueChange={(value) => setNewTemplate({ ...newTemplate, language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Template Body *</label>
                <Textarea
                  placeholder="Hello {{1}}, this is a test message!"
                  value={newTemplate.body}
                  onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  Use {"{{1}}"}, {"{{2}}"}, etc. for variables
                </p>
              </div>

              <Button onClick={createTemplate} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Template
              </Button>
            </CardContent>
          </Card>

          {/* Templates List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Templates List
                </CardTitle>
                <CardDescription>
                  {templates.length} templates in the database
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadTemplates} disabled={templateLoading} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${templateLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {templateLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No templates found. Create your first template above.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.slice(0, 10).map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{template.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            template.status === "approved" ? "bg-green-100 text-green-800" :
                            template.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            template.status === "rejected" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }>
                            {template.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {template.variables?.length || 0}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => verifyTemplate(template.id)}
                              title="Verify Template Status"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Create Campaign
              </CardTitle>
              <CardDescription>
                Create a new campaign to test the campaigns API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Campaign Name *</label>
                  <Input
                    placeholder="Test Campaign"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Campaign Type</label>
                  <Select
                    value={newCampaign.type}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="broadcast">Broadcast</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                      <SelectItem value="ab_test">A/B Test</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Template *</label>
                <Select
                  value={newCampaign.templateId}
                  onValueChange={(value) => setNewCampaign({ ...newCampaign, templateId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contacts (Optional)</label>
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {contacts.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No contacts available</p>
                  ) : (
                    <div className="p-2 space-y-1">
                      {contacts.slice(0, 5).map((contact) => (
                        <label key={contact.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newCampaign.contactIds.includes(contact.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewCampaign({
                                  ...newCampaign,
                                  contactIds: [...newCampaign.contactIds, contact.id],
                                })
                              } else {
                                setNewCampaign({
                                  ...newCampaign,
                                  contactIds: newCampaign.contactIds.filter(id => id !== contact.id),
                                })
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">
                            {contact.firstName} {contact.lastName} ({contact.phoneNumber})
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={createCampaign} disabled={!newCampaign.templateId} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Campaign
              </Button>
            </CardContent>
          </Card>

          {/* Campaigns List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Campaigns List
                </CardTitle>
                <CardDescription>
                  {campaigns.length} campaigns in the database
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadCampaigns} disabled={campaignLoading} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${campaignLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {campaignLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-green-500" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Send className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No campaigns found. Create your first campaign above.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Audience</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.slice(0, 10).map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {campaign.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            campaign.status === "running" ? "bg-green-100 text-green-800" :
                            campaign.status === "completed" ? "bg-gray-100 text-gray-800" :
                            campaign.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                            campaign.status === "draft" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }>
                            {campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell>-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Simple Clock component for the pending status
function Clock({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
