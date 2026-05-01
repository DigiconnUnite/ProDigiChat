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

// Automation workflows data (empty for now - feature coming soon)
const automationWorkflowsData: any[] = []

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
    <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 space-y-6">
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

      {/* Coming Soon Notice */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Zap className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-muted-foreground mb-2">
            Automation Coming Soon
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Advanced automation workflows are currently in development. You'll be able to create automated customer journeys, drip campaigns, and smart follow-ups soon.
          </p>
        </CardContent>
      </Card>

      {/* Automation Workflows Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automation Workflows</CardTitle>
              <CardDescription>
                {automationWorkflowsData.length} workflow{automationWorkflowsData.length !== 1 ? "s" : ""} (Coming Soon)
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
    </div>
  )
}
