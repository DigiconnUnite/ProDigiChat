"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Download, ArrowUpRight, ArrowDownRight, AlertCircle, Phone, CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react"

// Type definitions for Analytics API response
interface CampaignDetail {
  id: string
  name: string
  type: string
  status: string
  sent: number
  delivered: number
  read: number
  clicked: number
  failed: number
}

interface AnalyticsPerformance {
  deliveryRate: number
  readRate: number
  clickRate: number
  dateRange: string
}

interface AnalyticsOverview {
  totalContacts: number
  messagesSent: number
  activeCampaigns: number
  activeAutomations: number
}

interface AnalyticsTrends {
  messagesSent: number
  deliveryRate: number
  readRate: number
  clickRate: number
  newContacts: number
}

interface AnalyticsData {
  overview: AnalyticsOverview
  performance: AnalyticsPerformance
  campaignDetails: CampaignDetail[]
  trends: AnalyticsTrends
}

// Default/fallback data
const defaultAnalyticsData: AnalyticsData = {
  overview: {
    totalContacts: 0,
    messagesSent: 0,
    activeCampaigns: 0,
    activeAutomations: 0
  },
  performance: {
    deliveryRate: 0,
    readRate: 0,
    clickRate: 0,
    dateRange: "30d"
  },
  campaignDetails: [],
  trends: {
    messagesSent: 0,
    deliveryRate: 0,
    readRate: 0,
    clickRate: 0,
    newContacts: 0
  }
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState("30d")
  const [campaignType, setCampaignType] = useState<"all" | "broadcast" | "recurring" | "ab_test">("all")
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"campaigns" | "whatsapp">("campaigns")
  const [businessReport, setBusinessReport] = useState<any>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/analytics?dateRange=${dateRange}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analytics: ${response.status}`)
        }
        
        const result = await response.json()
        
        if (result.success && result.data) {
          setAnalyticsData(result.data)
        } else {
          throw new Error(result.error || "Failed to fetch analytics data")
        }
      } catch (err) {
        console.error("Error fetching analytics:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
        setAnalyticsData(defaultAnalyticsData)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [dateRange])

  // Fetch WhatsApp business report when tab is active
  useEffect(() => {
    const fetchBusinessReport = async () => {
      if (activeTab !== "whatsapp") return
      
      setIsLoadingReport(true)
      try {
        const response = await fetch('/api/whatsapp/business-report')
        if (response.ok) {
          const data = await response.json()
          setBusinessReport(data)
        } else {
          const data = await response.json()
          setError(data.error || 'Failed to load business report')
        }
      } catch (err) {
        console.error('Error fetching business report:', err)
        setError('Failed to load WhatsApp business report')
      } finally {
        setIsLoadingReport(false)
      }
    }

    fetchBusinessReport()
  }, [activeTab])

  // Filter campaigns by type
  const filteredCampaigns = analyticsData?.campaignDetails
    ? campaignType === "all"
      ? analyticsData.campaignDetails
      : analyticsData.campaignDetails.filter(c => c.type === campaignType)
    : []

  // Calculate metrics from API data
  const messagesSent = analyticsData?.overview.messagesSent ?? 0
  const deliveryRate = analyticsData?.performance.deliveryRate ?? 0
  const readRate = analyticsData?.performance.readRate ?? 0
  const clickRate = analyticsData?.performance.clickRate ?? 0
  
  const messagesSentTrend = analyticsData?.trends.messagesSent ?? 0
  const deliveryRateTrend = analyticsData?.trends.deliveryRate ?? 0
  const readRateTrend = analyticsData?.trends.readRate ?? 0
  const clickRateTrend = analyticsData?.trends.clickRate ?? 0

  // Export to CSV function
  const handleExport = () => {
    const campaignsToExport = filteredCampaigns
    
    // CSV header
    const headers = ["Name", "Type", "Status", "Sent", "Delivered", "Read", "Clicks", "Failed", "Delivery Rate", "Read Rate", "Click Rate"]
    
    // CSV rows
    const rows = campaignsToExport.map(campaign => {
      const deliveryRateValue = campaign.sent > 0 ? ((campaign.delivered / campaign.sent) * 100).toFixed(1) : "0"
      const readRateValue = campaign.delivered > 0 ? ((campaign.read / campaign.delivered) * 100).toFixed(1) : "0"
      const clickRateValue = campaign.delivered > 0 ? ((campaign.clicked / campaign.delivered) * 100).toFixed(1) : "0"
      
      return [
        campaign.name,
        campaign.type,
        campaign.status,
        campaign.sent.toString(),
        campaign.delivered.toString(),
        campaign.read.toString(),
        campaign.clicked.toString(),
        campaign.failed.toString(),
        `${deliveryRateValue}%`,
        `${readRateValue}%`,
        `${clickRateValue}%`
      ]
    })
    
    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")
    
    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `analytics-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 space-y-6">
      {/* Error Message */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">Error loading data: {error}. Showing fallback data.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your performance and optimize campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab Buttons */}
          <div className="flex bg-muted rounded-lg p-1 mr-4">
            <button
              onClick={() => setActiveTab("campaigns")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === "campaigns"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                activeTab === "whatsapp"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Phone className="w-4 h-4" />
              WhatsApp
            </button>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              {dateRange === "7d" ? "Last 7 days" : dateRange === "30d" ? "Last 30 days" : "Last 90 days"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading || filteredCampaigns.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          // Skeleton loaders for metrics
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{messagesSent.toLocaleString()}</div>
                <div className={`flex items-center text-xs mt-1 ${messagesSentTrend >= 0 ? "text-primary" : "text-destructive"}`}>
                  {messagesSentTrend >= 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  )}
                  {messagesSentTrend >= 0 ? "+" : ""}{messagesSentTrend}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deliveryRate.toFixed(1)}%</div>
                <div className={`flex items-center text-xs mt-1 ${deliveryRateTrend >= 0 ? "text-primary" : "text-destructive"}`}>
                  {deliveryRateTrend >= 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  )}
                  {deliveryRateTrend >= 0 ? "+" : ""}{deliveryRateTrend}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{readRate.toFixed(1)}%</div>
                <div className={`flex items-center text-xs mt-1 ${readRateTrend >= 0 ? "text-primary" : "text-destructive"}`}>
                  {readRateTrend >= 0 ? (
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="mr-1 h-3 w-3" />
                  )}
                  {readRateTrend >= 0 ? "+" : ""}{readRateTrend}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  <span title="Click tracking not yet implemented. Will be available when WhatsApp adds click analytics to their webhooks.">
                    Click Rate
                    <span className="ml-1 text-xs text-muted-foreground">(N/A)</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">N/A</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Click tracking coming soon
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Campaign Type Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter by type:</span>
        <Select value={campaignType} onValueChange={(value: "all" | "broadcast" | "recurring" | "ab_test") => setCampaignType(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="broadcast">Broadcast</SelectItem>
            <SelectItem value="recurring">Recurring</SelectItem>
            <SelectItem value="ab_test">A/B Test</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>Detailed metrics for each campaign</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // Skeleton loader for table
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No campaigns found for the selected filters
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground border-b">Campaign</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Sent</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Delivered</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Read</th>
                    <th className="pb-2 text-left text-xs font-medium text-muted-foreground">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => {
                    const deliveryRateValue = campaign.sent > 0 ? ((campaign.delivered / campaign.sent) * 100) : 0
                    const readRateValue = campaign.delivered > 0 ? ((campaign.read / campaign.delivered) * 100) : 0
                    const clickRateValue = campaign.delivered > 0 ? ((campaign.clicked / campaign.delivered) * 100) : 0
                    
                    return (
                      <tr key={campaign.id} className="border-b">
                        <td><span className="font-medium">{campaign.name}</span></td>
                        <td><Badge variant="outline" className="capitalize">{campaign.type.replace("_", " ")}</Badge></td>
                        <td>
                          <Badge variant={campaign.status === "completed" ? "default" : campaign.status === "running" ? "secondary" : "outline"}>
                            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          </Badge>
                        </td>
                        <td>{campaign.sent.toLocaleString()}</td>
                        <td><span className="text-green-600 font-medium">{deliveryRateValue.toFixed(1)}%</span></td>
                        <td><span className="text-green-600 font-medium">{readRateValue.toFixed(1)}%</span></td>
                        <td><span className="text-green-600 font-medium">{clickRateValue.toFixed(1)}%</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Business Report Section */}
      {activeTab === "whatsapp" && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Phone className="w-6 h-6 text-green-600" />
                WhatsApp Business Report
              </h2>
              <p className="text-muted-foreground mt-1">
                Detailed insights from your WhatsApp Business account
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setActiveTab("whatsapp")}
              disabled={isLoadingReport}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingReport ? 'animate-spin' : ''}`} />
              Refresh Report
            </Button>
          </div>

          {isLoadingReport ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : businessReport ? (
            <>
              {/* Business Account Info */}
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Business Account
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Account Name</p>
                      <p className="font-medium">{businessReport.businessAccount?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account ID</p>
                      <p className="font-mono text-sm">{businessReport.businessAccount?.id || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Connection Type</p>
                      <p className="font-medium">{businessReport.connection?.type || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={businessReport.connection?.isActive ? "default" : "secondary"} className="mt-1">
                        {businessReport.connection?.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Phone Numbers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Phone Numbers ({businessReport.phoneNumbers?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    Your WhatsApp Business phone numbers and their status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {businessReport.phoneNumbers?.length > 0 ? (
                    <div className="space-y-3">
                      {businessReport.phoneNumbers.map((phone: any, index: number) => (
                        <div 
                          key={phone.id || index}
                          className={`flex items-center justify-between p-4 border rounded-lg ${
                            phone.verificationStatus === 'VERIFIED' 
                              ? 'border-green-200 bg-green-50' 
                              : 'border-yellow-200 bg-yellow-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              phone.verificationStatus === 'VERIFIED'
                                ? 'bg-green-100'
                                : 'bg-yellow-100'
                            }`}>
                              <Phone className={`w-5 h-5 ${
                                phone.verificationStatus === 'VERIFIED'
                                  ? 'text-green-600'
                                  : 'text-yellow-600'
                              }`} />
                            </div>
                            <div>
                              <p className="font-medium">{phone.displayName}</p>
                              <p className="text-sm text-muted-foreground">{phone.phoneNumber}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {phone.qualityScore && (
                              <Badge variant="outline" className="bg-white">
                                Quality: {phone.qualityScore}
                              </Badge>
                            )}
                            <Badge variant={phone.verificationStatus === 'VERIFIED' ? 'default' : 'secondary'}>
                              {phone.verificationStatus === 'VERIFIED' ? 'Verified' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No phone numbers found
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Message Templates */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Message Templates ({businessReport.messageTemplates?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    Status of your WhatsApp message templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {businessReport.messageTemplates?.length > 0 ? (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2">
                        {businessReport.messageTemplates.map((template: any, index: number) => (
                          <div key={template.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{template.name}</p>
                              <p className="text-sm text-muted-foreground">{template.category} • {template.language}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {template.qualityScore && (
                                <Badge variant="outline" className="bg-white">
                                  {template.qualityScore}
                                </Badge>
                              )}
                              <Badge variant={
                                template.status === 'APPROVED' ? 'default' : 
                                template.status === 'PENDING' ? 'secondary' : 
                                template.status === 'REJECTED' ? 'destructive' : 'outline'
                              }>
                                {template.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No templates found
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Webhooks */}
              <Card>
                <CardHeader>
                  <CardTitle>Webhooks</CardTitle>
                  <CardDescription>
                    Webhook configuration for receiving events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {businessReport.webhooks ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm">Webhook configured</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        URL: {businessReport.webhooks.url || 'Not set'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(businessReport.webhooks.fields || []).map((field: string, index: number) => (
                          <Badge key={index} variant="outline">{field}</Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm">No webhook configured</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">
                    {error || 'Unable to load business report. Please connect your WhatsApp account first.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
