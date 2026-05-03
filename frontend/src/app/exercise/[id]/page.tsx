import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, TrendingDown, TrendingUp, Minus } from "lucide-react";

import { serverApi } from "@/lib/api-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { ExerciseHistoryChart } from "@/components/charts/exercise-history-chart";
import { ExerciseSettingsPanel } from "@/components/exercise-settings-panel";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS: Record<
  string,
  { label: string; color: string; Icon: typeof Trophy }
> = {
  weight_pr: {
    label: "Weight PR",
    color: "text-[color:var(--color-warning)]",
    Icon: Trophy,
  },
  rep_pr: {
    label: "Rep PR",
    color: "text-[color:var(--color-success)]",
    Icon: TrendingUp,
  },
  maintained: { label: "Maintained", color: "text-muted-foreground", Icon: Minus },
  regression: { label: "Regression", color: "text-destructive", Icon: TrendingDown },
};

export default async function ExerciseHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (Number.isNaN(id)) notFound();

  const [history, btl] = await Promise.all([
    serverApi.exerciseHistory(id).catch(() => null),
    serverApi.beatTheLogbook(id).catch(() => null),
  ]);
  if (!history) notFound();

  const ex = history.exercise;
  const hist = history.history;
  const maxWeight = Math.max(...hist.map((h) => h.max_weight ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={ex.name}
        actions={
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {ex.primary_muscles.map((m) => (
          <Badge
            key={m}
            className="border-primary/30 bg-primary/15 text-primary"
            variant="outline"
          >
            {m}
          </Badge>
        ))}
        {ex.secondary_muscles.map((m) => (
          <Badge key={m} variant="secondary" className="font-normal">
            {m}
          </Badge>
        ))}
      </div>

      <ExerciseSettingsPanel exercise={ex} />

      {btl?.last_session && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm uppercase tracking-wide text-primary">
              Beat the Logbook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Last Top Set" value={`${btl.last_session.top_set_weight} lbs`} />
              <Stat
                label="Last Reps"
                value={btl.last_session.sets.map((s) => s.reps).join(", ")}
              />
              <Stat
                label="All-Time PR"
                value={`${maxWeight} lbs`}
                valueClass="text-[color:var(--color-warning)]"
              />
              {btl.progression_status && STATUS[btl.progression_status] && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </div>
                  <div
                    className={cn(
                      "mt-1 flex items-center gap-1.5 text-lg font-semibold",
                      STATUS[btl.progression_status].color
                    )}
                  >
                    {(() => {
                      const { Icon } = STATUS[btl.progression_status!];
                      return <Icon className="h-4 w-4" />;
                    })()}
                    {STATUS[btl.progression_status].label}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Progressive overload</CardTitle>
        </CardHeader>
        <CardContent>
          <ExerciseHistoryChart data={hist} prWeight={maxWeight} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Session history (last 20)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          {hist
            .slice(-20)
            .reverse()
            .map((h) => (
              <Link
                key={h.session_id}
                href={`/session/${h.session_id}`}
                className="block rounded-md border border-border/50 bg-secondary/30 p-3 transition-colors hover:bg-secondary/60"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium tabular-nums">{h.date}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    Vol: {Math.round(h.volume_load).toLocaleString()} lbs
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {h.sets.map((s, i) => (
                    <Badge
                      key={i}
                      variant={s.weight_lbs === h.max_weight ? "default" : "secondary"}
                      className="font-normal tabular-nums"
                    >
                      {s.weight_lbs}×{s.reps}
                    </Badge>
                  ))}
                </div>
              </Link>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums", valueClass)}>
        {value}
      </div>
    </div>
  );
}
