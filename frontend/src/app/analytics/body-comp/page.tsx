import { Scale, Layers, Dumbbell, Percent, Bone } from "lucide-react";

import { serverApi } from "@/lib/api-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { RangeSelect } from "@/components/range-select";
import {
  BodyWeightTrendChart,
  DexaMassChart,
  BodyFatChart,
} from "@/components/charts/body-comp-charts";

export const dynamic = "force-dynamic";

const RANGES = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "365", label: "Last year" },
];

export default async function BodyCompPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = parseInt(sp.days ?? "90") || 90;

  const data = await serverApi.bodyComposition(days);

  const weightData = new Map<string, { date: string; macFactor?: number; session?: number }>();
  data.nutrition.forEach((n) => {
    if (n.body_weight_lbs == null) return;
    const existing = weightData.get(n.date) || { date: n.date };
    existing.macFactor = n.body_weight_lbs;
    weightData.set(n.date, existing);
  });
  data.session_weights.forEach((s) => {
    if (s.body_weight_lbs == null) return;
    const existing = weightData.get(s.date) || { date: s.date };
    existing.session = s.body_weight_lbs;
    weightData.set(s.date, existing);
  });

  const sortedWeights = Array.from(weightData.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const hasDexa = data.dexa_scans.length > 0;
  const hasNutrition = data.nutrition.length > 0;

  const latestWeight =
    sortedWeights.length > 0 ? sortedWeights[sortedWeights.length - 1] : null;
  const latestDexa = hasDexa ? data.dexa_scans[data.dexa_scans.length - 1] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Body Composition"
        description="Weight, lean mass, and body fat over time"
        actions={
          <RangeSelect paramKey="days" defaultValue="90" options={RANGES} />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {latestWeight && (
          <StatCard
            label="Latest Weight"
            value={latestWeight.macFactor ? `${latestWeight.macFactor} lbs` : "—"}
            sub={latestWeight.macFactor ? "MacroFactor" : "from sessions"}
            icon={Scale}
            tone="success"
          />
        )}
        {latestDexa && (
          <>
            <StatCard label="Total Mass" value={`${latestDexa.total_lbs} lbs`} icon={Layers} />
            <StatCard
              label="Lean Mass"
              value={`${latestDexa.lean_lbs} lbs`}
              icon={Dumbbell}
              tone="success"
            />
            <StatCard
              label="Body Fat"
              value={`${latestDexa.bf_pct}%`}
              icon={Percent}
              tone="warning"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Body weight trend
            {!hasNutrition && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (session weights only)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BodyWeightTrendChart data={sortedWeights} hasNutrition={hasNutrition} />
        </CardContent>
      </Card>

      {hasDexa ? (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">DEXA — body mass over time</CardTitle>
            </CardHeader>
            <CardContent>
              <DexaMassChart data={data.dexa_scans} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Body fat % across scans</CardTitle>
            </CardHeader>
            <CardContent>
              <BodyFatChart data={data.dexa_scans} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All scans</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Lean</TableHead>
                    <TableHead className="text-right">Fat</TableHead>
                    <TableHead className="text-right">BF%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...data.dexa_scans].reverse().map((d) => (
                    <TableRow key={d.date}>
                      <TableCell className="font-medium tabular-nums">{d.date}</TableCell>
                      <TableCell className="text-right tabular-nums">{d.total_lbs} lbs</TableCell>
                      <TableCell className="text-right tabular-nums text-[color:var(--color-success)]">
                        {d.lean_lbs} lbs
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-destructive">
                        {d.fat_lbs} lbs
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{d.bf_pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Bone className="h-8 w-8 text-muted-foreground" />
            <h3 className="font-semibold">No DEXA scans yet</h3>
            <p className="text-sm text-muted-foreground">
              DEXA data from BodySpec will appear here once connected.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
