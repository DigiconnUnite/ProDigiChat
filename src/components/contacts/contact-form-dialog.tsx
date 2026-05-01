"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, UserPlus, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

// Zod schema for contact form validation
const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().nullable(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  lifecycleStatus: z.enum(["lead", "active", "suppressed", "blocked", "bounced"]),
  optInStatus: z.enum(["opted_in", "opted_out", "pending"]),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  customAttributes: z.record(z.string(), z.string()).optional(),
})

type ContactFormData = z.infer<typeof contactFormSchema>

interface Contact {
  id: string
  firstName: string
  lastName?: string | null
  phoneNumber: string
  email?: string | null
  lifecycleStatus?: string | null
  optInStatus: string
  tags?: string | null
  attributes?: string | null
}

interface ContactFormDialogProps {
  children: React.ReactNode
  contact?: Contact | null
  onSuccess?: () => void
}

const SUGGESTED_TAGS = ['VIP', 'Newsletter', 'Wholesale', 'Diwali-offer', 'Holi-sale', 'New-customer', 'Repeat-buyer', 'Premium']

export function ContactFormDialog({
  children,
  contact,
  onSuccess,
}: ContactFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newTag, setNewTag] = useState("")
  const [activeTab, setActiveTab] = useState("basic")
  const [customAttributes, setCustomAttributes] = useState<Array<{ key: string; value: string }>>([])

  // Parse tags from JSON string - handles null/undefined/empty values
  const parseTags = (tags: string | null | undefined): string[] => {
    if (!tags || typeof tags !== 'string') {
      return []
    }

    let parsed: unknown = tags
    for (let i = 0; i < 2 && typeof parsed === 'string'; i++) {
      try {
        parsed = JSON.parse(parsed)
      } catch {
        break
      }
    }

    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim()).filter(Boolean)
    }

    try {
      const single = JSON.parse(tags)
      return Array.isArray(single) ? single : []
    } catch {
      return tags.split(',').map((tag) => tag.trim()).filter(Boolean)
    }
  }

  // Parse custom attributes
  const parseCustomAttributes = (attributes: string | null | undefined): Array<{ key: string; value: string }> => {
    if (!attributes || typeof attributes !== 'string') {
      return []
    }

    try {
      const parsed = JSON.parse(attributes)
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) }))
      }
    } catch {
      // If parsing fails, return empty array
    }
    return []
  }

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    values: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      phoneNumber: contact?.phoneNumber ?? "",
      email: contact?.email ?? "",
      lifecycleStatus: (contact?.lifecycleStatus as "lead" | "active" | "suppressed" | "blocked" | "bounced") ?? "lead",
      optInStatus: (contact?.optInStatus as "opted_in" | "opted_out" | "pending") ?? "pending",
      tags: contact ? parseTags(contact.tags ?? null) : [],
      notes: "",
      customAttributes: {},
    },
  })

  const { setValue, watch, handleSubmit, reset } = form
  const tags = watch("tags")

  // Initialize custom attributes when contact changes
  useState(() => {
    if (contact?.attributes) {
      setCustomAttributes(parseCustomAttributes(contact.attributes))
    }
  })

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setValue("tags", [...tags, newTag.trim()], { shouldValidate: true })
      setNewTag("")
    }
  }

  const handleAddSuggestedTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setValue("tags", [...tags, tag], { shouldValidate: true })
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue("tags", tags.filter((tag) => tag !== tagToRemove), { shouldValidate: true })
  }

  const handleAddAttribute = () => {
    setCustomAttributes([...customAttributes, { key: "", value: "" }])
  }

  const handleRemoveAttribute = (index: number) => {
    setCustomAttributes(customAttributes.filter((_, i) => i !== index))
  }

  const handleAttributeChange = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customAttributes]
    updated[index][field] = value
    setCustomAttributes(updated)
  }

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true)
    try {
      // Convert custom attributes array to object
      const attributesObj = customAttributes.reduce((acc, attr) => {
        if (attr.key && attr.value) {
          acc[attr.key] = attr.value
        }
        return acc
      }, {} as Record<string, string>)

      const url = "/api/contacts"
      const method = contact ? "PUT" : "POST"
      const body = {
        ...data,
        id: contact?.id,
        tags: data.tags,
        attributes: JSON.stringify(attributesObj),
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to save contact")
      }

      toast.success(
        contact
          ? "Contact updated successfully"
          : "Contact created successfully"
      )

      setOpen(false)
      reset()
      setCustomAttributes([])
      setActiveTab("basic")
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      reset()
      setCustomAttributes([])
      setActiveTab("basic")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {contact ? "Edit Contact" : "Add New Contact"}
          </DialogTitle>
          <DialogDescription>
            {contact
              ? "Update the contact information below."
              : "Fill in the details to add a new contact to your audience."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="tags">Tags</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+1234567890" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" type="email" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lifecycleStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lifecycle Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select lifecycle status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="suppressed">Suppressed</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                            <SelectItem value="bounced">Bounced</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="optInStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opt-in Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="opted_in">Opted In</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="opted_out">Opted Out</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any notes about this contact..."
                          className="resize-none"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="tags" className="space-y-4">
                <div>
                  <FormLabel>Add Tags</FormLabel>
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="Type a tag and press Enter"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={handleAddTag}>
                      Add
                    </Button>
                  </div>
                </div>

                <div>
                  <FormLabel>Suggested Tags</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SUGGESTED_TAGS.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        onClick={() => handleAddSuggestedTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <FormLabel>Applied Tags</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2 min-h-[40px] p-3 bg-gray-50 rounded-md border">
                    {tags.length === 0 ? (
                      <span className="text-sm text-gray-400">No tags added yet</span>
                    ) : (
                      tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer gap-1"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          {tag}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attributes" className="space-y-4">
                <div>
                  <FormLabel>Custom Fields</FormLabel>
                  <div className="space-y-2 mt-2">
                    {customAttributes.map((attr, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Key (e.g., city)"
                          value={attr.key}
                          onChange={(e) => handleAttributeChange(index, 'key', e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Value (e.g., Agra)"
                            value={attr.value}
                            onChange={(e) => handleAttributeChange(index, 'value', e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAttribute(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={handleAddAttribute}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>
              </TabsContent>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {contact ? "Update Contact" : "Create Contact"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
