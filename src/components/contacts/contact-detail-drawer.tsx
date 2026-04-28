"use client"

import { useState, useEffect } from "react"
import { X, Send, Edit, Trash2, Clock, MessageSquare, Tag, User, Calendar, Mail, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { parseTags } from "@/types/common"

interface Contact {
  id: string
  firstName: string
  lastName?: string | null
  displayName?: string | null
  phoneNumber: string
  email?: string | null
  lifecycleStatus?: string | null
  optInStatus: string
  tags?: string | null
  attributes: string
  createdAt: string
  updatedAt: string
}

interface ContactDetailDrawerProps {
  contact: Contact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (contact: Contact) => void
  onDelete?: (contact: Contact) => void
  onSendMessage?: (contact: Contact) => void
}

const AVATAR_COLORS = ['#25D366', '#128C7E', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

const getAvatarColor = (index: number) => AVATAR_COLORS[index % AVATAR_COLORS.length]

const getInitials = (firstName: string, lastName?: string | null) => {
  return (firstName[0] + (lastName ? lastName[0] : '')).toUpperCase()
}

const statusConfig = {
  opted_in: { label: "Opted In", className: "bg-green-100 text-green-700 border-green-200" },
  opted_out: { label: "Opted Out", className: "bg-red-100 text-red-700 border-red-200" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-700 border-amber-200" },
}

export function ContactDetailDrawer({
  contact,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onSendMessage,
}: ContactDetailDrawerProps) {
  if (!contact) return null

  const contactTags = parseTags(contact.tags ?? null)
  const status = statusConfig[contact.optInStatus as keyof typeof statusConfig] || statusConfig.pending
  const initials = getInitials(contact.firstName, contact.lastName)
  const avatarColor = getAvatarColor(parseInt(contact.id) || 0)

  // Handle Escape key to close drawer
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onOpenChange])

  // Parse attributes from JSON string
  let attributes: Record<string, string> = {}
  try {
    if (contact.attributes) {
      const parsed = JSON.parse(contact.attributes)
      if (typeof parsed === 'object' && parsed !== null) {
        attributes = parsed
      }
    }
  } catch {
    // If parsing fails, use empty object
  }

  // Mock activity timeline (in real app, this would come from API)
  const activityTimeline = [
    { type: 'sent', message: 'Message sent: "Welcome offer 20% off"', time: 'Today 10:30 AM' },
    { type: 'received', message: 'Replied "Tell me more"', time: 'Today 10:35 AM' },
    { type: 'event', message: 'Added to segment: VIP Customers', time: 'Yesterday' },
  ]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-medium flex-shrink-0"
                style={{ backgroundColor: avatarColor }}
              >
                {initials}
              </div>
              <div>
                <SheetTitle className="text-xl">
                  {contact.firstName} {contact.lastName}
                </SheetTitle>
                <p className="text-sm text-gray-500 font-mono mt-1">{contact.phoneNumber}</p>
                <div className="mt-2">
                  <Badge className={status.className}>{status.label}</Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1 gap-2"
              onClick={() => onSendMessage?.(contact)}
            >
              <Send className="h-4 w-4" />
              Send Message
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onEdit?.(contact)}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => onDelete?.(contact)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Contact Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <span className="text-sm font-medium">{contact.email || "No email"}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  Created
                </div>
                <span className="text-sm font-medium">
                  {new Date(contact.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  Last Active
                </div>
                <span className="text-sm font-medium">2 days ago</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {contactTags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {contactTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Custom Attributes */}
          {Object.keys(attributes).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Custom Attributes
              </h3>
              <div className="space-y-2">
                {Object.entries(attributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center py-2 border-b border-gray-100"
                  >
                    <span className="text-sm text-gray-600 capitalize">{key}</span>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Activity
            </h3>
            <div className="space-y-4">
              {activityTimeline.map((activity, index) => (
                <div key={index} className="flex gap-3">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.type === 'sent'
                        ? 'bg-green-500'
                        : activity.type === 'received'
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                  />
                  <div className="flex-1 pb-3 border-b border-gray-100 last:border-0">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
