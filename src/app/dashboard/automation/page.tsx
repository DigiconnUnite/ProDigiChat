"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Calendar,
  Copy,
  Trash2,
  Eye,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  MessageSquare,
  UserPlus,
  Timer,
  GitBranch,
} from "lucide-react"

// Mock automation workflows data
const automationWorkflowsData = [
  {
    id: 1,
    name: "Welcome Series",
    status: "active",
    trigger: "New contact added",
    steps: 5,
    lastRun: "2 hours ago",
    successRate: 95.2,
  },
  {
    id: 2,
    name: "Cart Abandonment",
    status: "active",
    trigger: "Cart not completed",
    steps: 3,
    lastRun: "1 hour ago",
    successRate: 87.5,
  },
  {
    id: 3,
    name: "Re-engagement Campaign",
    status: "paused",
    trigger: "Contact inactive for 30 days",
    steps: 4,
    lastRun: "3 days ago",
    successRate: 72.1,
  },
  {
    id: 4,
    name: "VIP Customer Flow",
    status: "draft",
    trigger: "High-value purchase",
    steps: 2,
    lastRun: "Never",
    successRate: 0,
  },
  {
    id: 5,
    name: "Lead Nurturing",
    status: "active",
    trigger: "Lead form submission",
    steps: 6,
    lastRun: "30 min ago",
    successRate: 91.8,
  },
]

const statusConfig = {
  draft: { icon: Clock, label: "Draft", color: "bg-muted text-muted-foreground" },
  active: { icon: Play, label: "Active", color: "bg-primary text-primary-foreground" },
  paused: { icon: Pause, label: "Paused", color: "bg-chart-3 text-chart-3-foreground" },
  failed: { icon: AlertCircle, label: "Failed", color: "bg-destructive text-destructive-foreground" },
}

export default function AutomationPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const [isCanvasOpen, setIsCanvasOpen] = useState(false)

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Automation</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage automated workflows for customer engagement
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={() => setIsCanvasOpen(true)}>
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">
              All automation flows
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Workflows</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">18</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">12,847</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89.4%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all workflows
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Workflows Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automation Workflows</CardTitle>
              <CardDescription>
                {automationWorkflowsData.length} workflow{automationWorkflowsData.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automationWorkflowsData.map((workflow) => {
                  const status = statusConfig[workflow.status as keyof typeof statusConfig]
                  const StatusIcon = status.icon
                  return (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div className="font-medium">{workflow.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${status.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {workflow.trigger}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {workflow.steps} steps
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {workflow.lastRun}
                      </TableCell>
                      <TableCell>
                        {workflow.successRate > 0 ? (
                          <span className="text-sm font-medium text-primary">
                            {workflow.successRate}%
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedWorkflow(workflow)
                              setIsCanvasOpen(true)
                            }}>
                              <Eye className="mr-2 h-4 w-4" />
                              View/Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            {workflow.status === "active" && (
                              <DropdownMenuItem>
                                <Pause className="mr-2 h-4 w-4" />
                                Pause Workflow
                              </DropdownMenuItem>
                            )}
                            {workflow.status === "paused" && (
                              <DropdownMenuItem>
                                <Play className="mr-2 h-4 w-4" />
                                Resume Workflow
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Automation Canvas Dialog */}
      <Dialog open={isCanvasOpen} onOpenChange={setIsCanvasOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              {selectedWorkflow ? `Edit: ${selectedWorkflow.name}` : "Create New Automation Workflow"}
            </DialogTitle>
            <DialogDescription>
              Drag and drop triggers and actions to build your automated workflow
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted rounded-lg">
            <div className="text-center">
              <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Start Building Your Workflow
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Drag triggers and actions to create automated customer journeys.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCanvasOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              Save Workflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
