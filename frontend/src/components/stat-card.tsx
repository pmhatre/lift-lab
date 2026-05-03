import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: "default" | "primary" | "success" | "warning";
  className?: string;
}) {
  const toneClass = {
    default: "text-muted-foreground",
    primary: "text-primary",
    success: "text-[color:var(--color-success)]",
    warning: "text-[color:var(--color-warning)]",
  }[tone];

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          {Icon && <Icon className={cn("h-4 w-4", toneClass)} />}
        </div>
        <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
