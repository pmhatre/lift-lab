import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Layers, TrendingUp, Scale } from "lucide-react";

import { serverApi } from "@/lib/api-server";
import { dayTypeLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseInt(rawId);
  if (Number.isNaN(id)) notFound();

  const session = await serverApi.session(id).catch(() => null);
  if (!session) notFound();

  const totalSets =
    session.exercises?.reduce(
      (acc, ex) => acc + ex.sets.filter((s) => !s.is_warmup).length,
      0
    ) ?? 0;
  const totalVolume =
    session.exercises?.reduce(
      (acc, ex) =>
        acc +
        ex.sets
          .filter((s) => !s.is_warmup)
          .reduce((a, s) => a + (s.weight_lbs ?? 0) * (s.reps ?? 0), 0),
      0
    ) ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={dayTypeLabel(session.day_type)}
        description={session.date}
        actions={
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {session.duration_minutes && (
          <StatCard
            label="Duration"
            value={`${session.duration_minutes} min`}
            icon={Clock}
          />
        )}
        <StatCard
          label="Working Sets"
          value={String(totalSets)}
          icon={Layers}
          tone="primary"
        />
        <StatCard
          label="Volume"
          value={`${Math.round(totalVolume).toLocaleString()} lbs`}
          icon={TrendingUp}
          tone="success"
        />
        {session.body_weight_lbs && (
          <StatCard
            label="Body Weight"
            value={`${session.body_weight_lbs} lbs`}
            icon={Scale}
          />
        )}
      </div>

      <div className="space-y-3">
        {(session.exercises ?? []).map((ex) => {
          const workingSets = ex.sets.filter((s) => !s.is_warmup);
          const warmupSets = ex.sets.filter((s) => s.is_warmup);
          const maxWeight = workingSets.reduce(
            (max, s) => Math.max(max, s.weight_lbs ?? 0),
            0
          );

          return (
            <Card key={ex.id} className="overflow-hidden">
              <CardHeader className="bg-secondary/40 py-3">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/exercise/${ex.exercise_id}`}
                    className="font-semibold transition-colors hover:text-primary"
                  >
                    {ex.exercise_name}
                  </Link>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {workingSets.length} × {maxWeight} lbs
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                {warmupSets.length > 0 && (
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                      Warmup
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {warmupSets.map((s) => (
                        <Badge
                          key={s.id}
                          variant="secondary"
                          className="font-normal tabular-nums"
                        >
                          {s.weight_lbs ?? 0} × {s.reps ?? 0}
                        </Badge>
                      ))}
                    </div>
                    <Separator className="my-3" />
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <div className="col-span-2">Set</div>
                  <div className="col-span-4">Weight</div>
                  <div className="col-span-3">Reps</div>
                  <div className="col-span-3">Volume</div>
                </div>
                {workingSets.map((s, i) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-12 items-center gap-2 border-t border-border py-1.5 first:border-t-0 first:pt-0"
                  >
                    <div className="col-span-2 text-sm text-muted-foreground tabular-nums">
                      {i + 1}
                    </div>
                    <div className="col-span-4 text-sm font-semibold tabular-nums">
                      {s.weight_lbs ?? 0} lbs
                    </div>
                    <div className="col-span-3 text-sm tabular-nums">{s.reps ?? 0}</div>
                    <div className="col-span-3 text-sm text-muted-foreground tabular-nums">
                      {Math.round((s.weight_lbs ?? 0) * (s.reps ?? 0))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {session.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm">{session.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
