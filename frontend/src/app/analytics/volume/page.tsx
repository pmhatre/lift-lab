import { serverApi } from "@/lib/api-server";
import { CHART_COLORS } from "@/lib/chart-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RangeSelect } from "@/components/range-select";
import { StackedVolumeChart } from "@/components/charts/volume-charts";

export const dynamic = "force-dynamic";

const RANGES = [
  { value: "4", label: "Last 4 weeks" },
  { value: "8", label: "Last 8 weeks" },
  { value: "12", label: "Last 12 weeks" },
  { value: "24", label: "Last 24 weeks" },
  { value: "52", label: "Last 52 weeks" },
];

export default async function VolumePage({
  searchParams,
}: {
  searchParams: Promise<{ weeks?: string }>;
}) {
  const sp = await searchParams;
  const weeks = parseInt(sp.weeks ?? "12") || 12;

  const end = new Date();
  const startDate = new Date();
  startDate.setDate(end.getDate() - weeks * 7);

  const data = await serverApi.volume({
    start: startDate.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    group_by: "week",
  });

  const chartData = data.data;
  const muscles = data.muscle_groups;

  const muscleTotals = muscles
    .map((m) => ({
      muscle: m,
      total: chartData.reduce((acc, row) => acc + ((row[m] as number) || 0), 0),
    }))
    .sort((a, b) => b.total - a.total);

  const maxTotal = muscleTotals[0]?.total || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Volume"
        description="Working sets per muscle group, by week"
        actions={
          <RangeSelect paramKey="weeks" defaultValue="12" options={RANGES} />
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sets per muscle group by week</CardTitle>
        </CardHeader>
        <CardContent>
          <StackedVolumeChart data={chartData} muscles={muscles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Total sets by muscle group</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {muscleTotals.map((m) => {
            const idx = muscles.indexOf(m.muscle);
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            return (
              <div key={m.muscle} className="flex items-center gap-3">
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: color }}
                />
                <div className="flex-1 text-sm">{m.muscle}</div>
                <div className="text-sm tabular-nums text-muted-foreground">
                  {m.total} sets
                </div>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(m.total / maxTotal) * 100}%`,
                      background: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
