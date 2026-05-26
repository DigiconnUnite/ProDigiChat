import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PageErrorProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function PageError({
  title = "Something went wrong",
  message,
  onRetry,
}: PageErrorProps) {
  return (
    <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800">{title}</p>
          <p className="text-xs text-red-700 mt-0.5">{message}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="rounded-lg border-red-300 text-red-700 hover:bg-red-100 text-xs flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
