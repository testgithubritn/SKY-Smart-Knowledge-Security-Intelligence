/** Risk level badge with consistent color mapping. */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RISK_STYLES: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  moderate:
    "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  high: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  critical:
    "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
};

export function RiskBadge({
  level,
  className,
}: {
  level: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold uppercase tracking-wide",
        RISK_STYLES[level] ?? RISK_STYLES.low,
        className
      )}
    >
      {level}
    </Badge>
  );
}

const REVIEW_STYLES: Record<string, string> = {
  pending:
    "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  approved:
    "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  rejected:
    "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
  escalated:
    "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
};

export function ReviewBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("uppercase", REVIEW_STYLES[status] ?? REVIEW_STYLES.pending, className)}
    >
      {status}
    </Badge>
  );
}

export function ModalityBadge({
  modality,
  className,
}: {
  modality: string;
  className?: string;
}) {
  const styles: Record<string, string> = {
    image:
      "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800",
    video:
      "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-800",
    audio:
      "bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
  };
  return (
    <Badge
      variant="outline"
      className={cn("uppercase", styles[modality] ?? styles.image, className)}
    >
      {modality}
    </Badge>
  );
}
