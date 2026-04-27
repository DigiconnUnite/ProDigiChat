"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, UserPlus } from "lucide-react"

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

// Zod schema for contact form validation
const contactFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().nullable(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  lifecycleStatus: z.enum(["lead", "active", "suppressed", "blocked", "bounced"]),
  optInStatus: z.enum(["opted_in", "opted_out", "pending"]),
  tags: z.array(z.string()),
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
}

interface ContactFormDialogProps {
  children: React.ReactNode
  contact?: Contact | null
  onSuccess?: () => void
}

export function ContactFormDialog({
  children,
  contact,
  onSuccess,
}: ContactFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newTag, setNewTag] = useState("")

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
    },
  })

  const { setValue, watch, handleSubmit } = form
  const tags = watch("tags")

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setValue("tags", [...tags, newTag.trim()], { shouldValidate: true })
      setNewTag("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue("tags", tags.filter((tag) => tag !== tagToRemove), { shouldValidate: true })
  }

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true)
    try {
      const url = "/api/contacts"
      const method = contact ? "PUT" : "POST"
      const body = {
        ...data,
        id: contact?.id,
        tags: data.tags,
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
      form.reset()
      if (onSuccess) onSuccess()
    } catch (error: any) {
      toast.error(error.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
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

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <FormItem>
              <FormLabel>Tags</FormLabel>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a tag"
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
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </FormItem>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
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
      </DialogContent>
    </Dialog>
  )
}
