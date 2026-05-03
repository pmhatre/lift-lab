import Link from "next/link";
import {
  Calendar,
  Scale,
  Dumbbell,
  TrendingUp,
  Trophy,
  Plus,
  ArrowRight,
} from "lucide-react";

import { serverApi } from "@/lib/api-server";
import { dayTypeLabel } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  VolumeBarChart,
  BodyWeightLineChart,
} from "@/components/charts/dashboard-charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, volumeData] = await Promise.all([
    serverApi.dashboard(),
    serverApi.volume({ group_by: "week" }),
  ]);

  const recentBw = data.body_weight_trend.slice(-30);
  const latestWeight =
    recentBw.length > 0 ? recentBw[recentBw.length - 1].weight : null;

  const recentVolume = volumeData?.data.slice(-8) ?? [];
  const topMuscles = (volumeData?.muscle_groups ?? []).slice(0, 6);

  const today = new Date();
  const todayStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={todayStr}
        actions={
          <Link href="/session/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Log Session
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="This Week"
          value={String(data.sessions_this_week)}
          sub="sessions logged"
          icon={Calendar}
          tone="primary"
        />
        <StatCard
          label="Body Weight"
          value={latestWeight ? `${latestWeight} lbs` : "—"}
          sub={latestWeight ? "latest reading" : "no data"}
          icon={Scale}
          tone="success"
        />
        <StatCard
          label="Today"
          value={
            data.today_session
              ? dayTypeLabel(data.today_session.day_type, "Logged")
              : "Rest day"
          }
          icon={Dumbbell}
        />
        <StatCard
          label="Recent"
          value={String(data.recent_sessions.length)}
          sub="last 7 days"
          icon={TrendingUp}
        />
      </div>

      {data.recent_prs.length > 0 && (
        <Card className="border-[color:var(--color-warning)]/40 bg-gradient-to-br from-[color:var(--color-warning)]/10 via-card to-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-[color:var(--color-warning)]">
              <Trophy className="h-4 w-4" />
              Recent PRs
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {data.recent_prs.length} in log
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pt-0">
            {data.recent_prs.slice(0, 8).map((pr) => (
              <Badge
                key={pr.id}
                variant="outline"
                className="gap-1.5 border-[color:var(--color-warning)]/30 bg-[color:var(--color-warning)]/5 text-foreground"
              >
                <span className="font-medium">{pr.exercise_name}</span>
                <span className="text-[color:var(--color-warning)] tabular-nums">
                  {pr.pr_type === "weight"
                    ? `${pr.pr_value} lbs`
                    : `e1RM ${pr.pr_value}`}
                </span>
                {pr.previous_value && pr.previous_value > 0 && (
                  <span className="text-muted-foreground tabular-nums">
                    (was {Math.round(pr.previous_value)})
                  </span>
                )}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {data.today_session ? (
        <Card className="border-primary/30">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-primary">
                Today&apos;s Session
              </div>
              <div className="mt-1 text-lg font-semibold">
                {dayTypeLabel(data.today_session.day_type)}
              </div>
              {data.today_session.duration_minutes && (
                <div className="text-sm text-muted-foreground">
                  {data.today_session.duration_minutes} min
                </div>
              )}
            </div>
            <Link
              href={`/session/${data.today_session.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              View <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted-foreground">No session logged today</p>
            <Link href="/session/new" className={buttonVariants()}>
              <Plus className="h-4 w-4" />
              Start Session
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Volume by muscle group
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                last 8 weeks
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VolumeBarChart data={recentVolume} muscles={topMuscles} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Body weight
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                last 30 days
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BodyWeightLineChart data={recentBw} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.recent_sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No recent sessions. Start logging!
            </p>
          ) : (
            <div className="-mx-2 divide-y divide-border">
              {data.recent_sessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{dayTypeLabel(s.day_type)}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.exercise_count
                        ? `${s.exercise_count} exercise${s.exercise_count === 1 ? "" : "s"}`
                        : "No exercises"}
                      {s.source && s.source !== "native" && ` · ${s.source}`}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm tabular-nums">{s.date}</div>
                    {s.duration_minutes && (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {s.duration_minutes} min
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
