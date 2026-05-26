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

      {/* Empty State */}
      <div className="rounded-xl border-2 border-dashed border-green-200 bg-green-50/30 p-12 text-center">
        <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Zap className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Build your first automation
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
          Automatically send welcome messages, follow-ups, and re-engagement campaigns based on contact actions.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button
            className="bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2"
            onClick={() => setIsCanvasOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg mx-auto">
          {[
            { icon: UserPlus, label: "New contact joins", desc: "Trigger on contact creation" },
            { icon: MessageSquare, label: "Reply received", desc: "Trigger on inbound message" },
            { icon: Timer, label: "Scheduled delay", desc: "Wait N days then send" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-lg border border-green-200 bg-white p-3 text-left">
              <Icon className="h-5 w-5 text-green-600 mb-2" />
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>


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
