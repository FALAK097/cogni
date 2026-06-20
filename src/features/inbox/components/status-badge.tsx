import { Badge } from "@/components/ui/badge";
import { type ConversationStatus, statusLabels } from "@/features/inbox/constants";
import { cn } from "@/lib/utils";

const statusStyles: Record<ConversationStatus, string> = {
  OPEN: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  ASSIGNED:
    "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  ESCALATED:
    "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  CLOSED:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
};

export function StatusBadge({ status }: { status: ConversationStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}
