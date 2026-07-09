import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  delay = 0,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning" | "destructive";
  delay?: number;
}) {
  const tones: Record<string, string> = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-[oklch(0.65_0.14_155)]/10 text-[oklch(0.55_0.14_155)] dark:text-[oklch(0.75_0.14_155)]",
    warning: "bg-[oklch(0.75_0.15_75)]/15 text-[oklch(0.55_0.15_75)] dark:text-[oklch(0.82_0.15_75)]",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className="group relative rounded-xl border border-border bg-card p-5 shadow-elegant transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="text-3xl font-semibold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );
}
