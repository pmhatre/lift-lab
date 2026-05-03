import { serverApi } from "@/lib/api-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { RangeSelect } from "@/components/range-select";
import { FrequencyBarChart } from "@/components/charts/frequency-chart";

export const dynamic = "force-dynamic";

const RANGES = [
  { value: "8", label: "Last 8 weeks" },
  { value: "16", label: "Last 16 weeks" },
  { value: "24", label: "Last 24 weeks" },
  { value: "52", label: "Last 52 weeks" },
];

export default async function FrequencyPage({
  searchParams,
}: {
  searchParams: Promise<{ weeks?: string }>;
}) {
  const sp = await searchParams;
  const weeks = parseInt(sp.weeks ?? "16") || 16;

  const { data } = await serverApi.frequency(weeks);

  const avgSessions =
    data.length > 0
      ? Math.round((data.reduce((acc, d) => acc + d.sessions, 0) / data.length) * 10) / 10
      : 0;

  const maxSessions = Math.max(...data.map((d) => d.sessions), 0);
  const activeWeeks = data.filter((d) => d.sessions > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Frequency"
        description="Training sessions per week"
        actions={
          <RangeSelect paramKey="weeks" defaultValue="16" options={RANGES} />
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Average"
          value={avgSessions.toString()}
          sub="sessions / week"
          tone="primary"
        />
        <StatCard
          label="Best week"
          value={String(maxSessions)}
          sub="sessions"
          tone="success"
        />
        <StatCard label="Active weeks" value={String(activeWeeks)} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sessions per week</CardTitle>
        </CardHeader>
        <CardContent>
          <FrequencyBarChart data={data} avg={avgSessions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent weeks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {[...data]
            .reverse()
            .slice(0, 12)
            .map((d) => (
              <div key={d.week} className="flex items-center gap-3 py-1">
                <span className="w-24 text-sm text-muted-foreground tabular-nums">
                  {d.week}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${maxSessions ? (d.sessions / maxSessions) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium tabular-nums">
                  {d.sessions}
                </span>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
