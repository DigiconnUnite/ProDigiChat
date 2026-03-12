"use client"

import { useState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Upload, FileSpreadsheet, Loader2, Download, CheckCircle2, AlertCircle } from "lucide-react"

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
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// CSV import form schema - all fields required except tags
const csvImportSchema = z.object({
  defaultOptInStatus: z.enum(["opted_in", "opted_out", "pending"]),
  tags: z.string(),
})

type CsvImportFormData = z.infer<typeof csvImportSchema>

interface ImportResult {
  success: boolean
  imported: number
  skipped: number
  errors: string[]
}

interface ImportContactsDialogProps {
  children?: React.ReactNode
  onImportComplete?: () => void
}

export function ImportContactsDialog({
  children,
  onImportComplete,
}: ImportContactsDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<any[]>([])

  const form = useForm<CsvImportFormData>({
    resolver: zodResolver(csvImportSchema),
    defaultValues: {
      defaultOptInStatus: "pending",
      tags: "",
    },
  })

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        toast.error("Please select a CSV file")
        return
      }
      setFile(selectedFile)
      parseCSV(selectedFile)
    }
  }, [])

  // Parse CSV file (simple parser without external dependency)
  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").filter((line) => line.trim())
      
      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows")
        setFile(null)
        return
      }

      // Parse header
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""))
      
      // Parse data rows (preview first 5)
      const data = lines.slice(1, 6).map((line) => {
        const values = parseCSVLine(line)
        const row: any = {}
        headers.forEach((header, index) => {
          row[header.toLowerCase()] = values[index]?.trim().replace(/^["']|["']$/g, "") || ""
        })
        return row
      })

      setPreview(data)
    }
    reader.readAsText(file)
  }

  // Parse a single CSV line (handles quoted values)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === "," && !inQuotes) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }
    result.push(current)
    return result
  }

  // Handle CSV import
  const handleImport = async (data: CsvImportFormData) => {
    if (!file) {
      toast.error("Please select a CSV file")
      return
    }

    setIsLoading(true)
    setProgress(0)
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("defaultOptInStatus", data.defaultOptInStatus)
      if (data.tags) {
        formData.append("tags", JSON.stringify(data.tags.split(",").map((t) => t.trim())))
      }

      const response = await fetch("/api/contacts/import", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to import contacts")
      }

      setImportResult({
        success: true,
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors || [],
      })

      setProgress(100)
      toast.success(`Successfully imported ${result.imported} contacts`)

      if (onImportComplete) {
        onImportComplete()
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to import contacts")
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [error.message],
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Reset dialog state
  const handleReset = () => {
    setFile(null)
    setPreview([])
    setImportResult(null)
    setProgress(0)
    form.reset()
  }

  // Download sample CSV template
  const downloadTemplate = () => {
    const headers = ["firstName", "lastName", "phoneNumber", "email", "tags"]
    const sampleData = [
      ["John", "Doe", "+1234567890", "john@example.com", "customer,vip"],
      ["Jane", "Smith", "+1234567891", "jane@example.com", "lead"],
    ]

    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "contacts_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o)
      if (!o) handleReset()
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Contacts from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple contacts at once.
          </DialogDescription>
        </DialogHeader>

        {!importResult ? (
          <Form {...form}>
            <div className="space-y-4">
              {/* File Upload */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-file"
                />
                <label
                  htmlFor="csv-file"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (CSV files only, max 10MB)
                  </span>
                </label>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Preview (first 5 rows)</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(preview[0]).map((header) => (
                            <th key={header} className="text-left p-2 font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 3).map((row, index) => (
                          <tr key={index} className="border-b last:border-0">
                            {Object.values(row).map((value: any, i) => (
                              <td key={i} className="p-2 text-muted-foreground">
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {preview.length > 3 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        +{preview.length - 3} more rows in preview
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Default Opt-in Status */}
              <FormField
                control={form.control}
                name="defaultOptInStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Opt-in Status</FormLabel>
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
                  </FormItem>
                )}
              />

              {/* Tags */}
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="customer, vip, lead" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Download Template Link */}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-1" />
                Download CSV Template
              </Button>

              {/* Progress */}
              {isLoading && (
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Importing contacts... {progress}%
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="button"
                  onClick={form.handleSubmit(handleImport)} 
                  disabled={!file || isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Import Contacts
                </Button>
              </DialogFooter>
            </div>
          </Form>
        ) : (
          // Import Result
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-600" />
              )}
              <h3 className="text-lg font-medium">
                {importResult.success ? "Import Complete" : "Import Failed"}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.imported}
                </div>
                <div className="text-sm text-muted-foreground">Imported</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {importResult.skipped}
                </div>
                <div className="text-sm text-muted-foreground">Skipped</div>
              </div>
              <div className="border rounded-lg p-4 text-center">
                <div className="text-2xl font-bold">
                  {importResult.imported + importResult.skipped}
                </div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Errors</p>
                <div className="max-h-32 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-600">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  handleReset()
                }}
              >
                Import More
              </Button>
              <Button onClick={() => setOpen(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
