"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Tag as TagIcon } from "lucide-react"

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

const bulkTagSchema = z.object({
  tags: z.string().min(1, "Tags are required"),
  action: z.enum(["add", "remove", "replace"]),
})

type BulkTagFormData = z.infer<typeof bulkTagSchema>

interface BulkTagDialogProps {
  children?: React.ReactNode
  selectedCount: number
  onApply: (tags: string[], action: "add" | "remove" | "replace") => void
}

export function BulkTagDialog({
  children,
  selectedCount,
  onApply,
}: BulkTagDialogProps) {
  const [open, setOpen] = useState(false)

  const form = useForm<BulkTagFormData>({
    resolver: zodResolver(bulkTagSchema),
    defaultValues: {
      tags: "",
      action: "add",
    },
  })

  const { handleSubmit } = form

  const onSubmit = (data: BulkTagFormData) => {
    const tags = data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    onApply(tags, data.action)
    setOpen(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            Tag
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="h-5 w-5" />
            Bulk Tag Contacts
          </DialogTitle>
          <DialogDescription>
            Apply tags to {selectedCount} selected contact{selectedCount > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="VIP, Diwali-offer, Newsletter"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="add">Add these tags</SelectItem>
                      <SelectItem value="remove">Remove these tags</SelectItem>
                      <SelectItem value="replace">Replace all tags</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Apply</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
