import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dangerMuted bg-dangerMuted/40 p-8 text-center">
      <AlertTriangle className="w-6 h-6 text-danger" />
      <p className="text-[13px] text-heading font-medium">Something went wrong</p>
      <p className="text-[12px] text-muted max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-medium text-heading hover:bg-surface2 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface2 p-8 text-center">
      {icon ?? <Inbox className="w-6 h-6 text-muted" />}
      <p className="text-[12.5px] text-muted max-w-sm">{message}</p>
    </div>
  );
}

export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface2 p-8 text-[12.5px] text-muted">
      <Loader2 className="w-4 h-4 animate-spin" />
      {message}
    </div>
  );
}
