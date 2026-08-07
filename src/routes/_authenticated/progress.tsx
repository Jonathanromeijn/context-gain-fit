import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllSets, fetchBodyWeights, fetchExercises, fetchWorkouts } from "@/lib/db";
import { epley1rm, setVolume } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Loadline" },
      {
        name: "description",
        content: "Estimated 1RM trends, weekly volume by muscle group and body weight over time.",
      },
      { property: "og:title", content: "Progress — Loadline" },
      { property: "og:description", content: "See strength, volume and body weight trends in one place." },
    ],
  }),
  component: ProgressPage,
});

function weekKey(iso: string) {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function ProgressPage() {
  const sets = useQuery({ queryKey: ["all-sets"], queryFn: fetchAllSets });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: fetchExercises });
  const weights = useQuery({ queryKey: ["body-weights"], queryFn: fetchBodyWeights });
  const workouts = useQuery({ queryKey: ["workouts"], queryFn: () => fetchWorkouts(60) });
  const [exerciseId, setExerciseId] = useState<string>("");

  const rows = sets.data ?? [];

  const loggedExercises = useMemo(() => {
    const ids = new Set(rows.map((r) => r.exercise_id));
    return (exercises.data ?? []).filter((e) => ids.has(e.id));
  }, [rows, exercises.data]);

  const selected = exerciseId || loggedExercises[0]?.id || "";

  const strength = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const r of rows) {
      if (r.exercise_id !== selected || r.set_type === "warmup") continue;
      const day = r.workout_started_at.slice(0, 10);
      byDay.set(day, Math.max(byDay.get(day) ?? 0, epley1rm(r.weight, r.reps)));
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, e1rm]) => ({ day: day.slice(5), e1rm: Math.round(e1rm * 10) / 10 }));
  }, [rows, selected]);

  const volumeByWeek = useMemo(() => {
    const byWeek = new Map<string, number>();
    for (const r of rows) byWeek.set(weekKey(r.workout_started_at), (byWeek.get(weekKey(r.workout_started_at)) ?? 0) + setVolume(r));
    return [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([week, volume]) => ({ week: week.slice(5), volume: Math.round(volume) }));
  }, [rows]);

  const muscleSplit = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 28);
    const byMuscle = new Map<string, number>();
    for (const r of rows) {
      if (new Date(r.workout_started_at) < start || r.set_type === "warmup") continue;
      const muscle = exercises.data?.find((e) => e.id === r.exercise_id)?.muscle ?? "other";
      byMuscle.set(muscle, (byMuscle.get(muscle) ?? 0) + 1);
    }
    return [...byMuscle.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([muscle, sets]) => ({ muscle, sets }));
  }, [rows, exercises.data]);

  const totalVolume = rows.reduce((a, r) => a + setVolume(r), 0);

  if (sets.isLoading) return <Skeleton className="h-72 w-full" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-4xl uppercase">Progress</h1>
        <p className="num text-sm text-muted-foreground">
          {workouts.data?.length ?? 0} sessions · {rows.length} sets ·{" "}
          {Math.round(totalVolume).toLocaleString()} kg lifted
        </p>
      </div>

      <section className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg uppercase">Estimated 1RM</h2>
          <Select value={selected} onValueChange={setExerciseId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Pick an exercise" />
            </SelectTrigger>
            <SelectContent>
              {loggedExercises.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ChartFrame empty={strength.length < 2} hint="Log this lift twice to see a trend.">
          <LineChart data={strength}>
            <CartesianGrid strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey="day" fontSize={11} stroke="currentColor" />
            <YAxis fontSize={11} stroke="currentColor" width={38} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="e1rm"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartFrame>
      </section>

      <section className="panel p-4">
        <h2 className="text-lg uppercase">Weekly volume</h2>
        <ChartFrame empty={!volumeByWeek.length} hint="No volume logged yet.">
          <AreaChart data={volumeByWeek}>
            <CartesianGrid strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey="week" fontSize={11} stroke="currentColor" />
            <YAxis fontSize={11} stroke="currentColor" width={48} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.18}
              strokeWidth={2.5}
            />
          </AreaChart>
        </ChartFrame>
      </section>

      <section className="panel p-4">
        <h2 className="text-lg uppercase">Sets per muscle · last 28 days</h2>
        <ChartFrame empty={!muscleSplit.length} hint="No working sets in the last four weeks.">
          <BarChart data={muscleSplit}>
            <CartesianGrid strokeOpacity={0.1} vertical={false} />
            <XAxis dataKey="muscle" fontSize={11} stroke="currentColor" />
            <YAxis fontSize={11} stroke="currentColor" width={30} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="sets" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartFrame>
      </section>

      <BodyWeightCard data={weights.data ?? []} />
    </div>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "0.75rem",
};

function ChartFrame({
  children,
  empty,
  hint,
}: {
  children: React.ReactElement;
  empty: boolean;
  hint: string;
}) {
  if (empty) return <p className="py-12 text-center text-sm text-muted-foreground">{hint}</p>;
  return (
    <div className="mt-4 h-56 text-muted-foreground">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function BodyWeightCard({ data }: { data: { id: string; weight: number; logged_on: string }[] }) {
  const qc = useQueryClient();
  const [value, setValue] = useState("");

  const log = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("body_weight_logs").upsert(
        {
          user_id: u.user!.id,
          weight: Number(value),
          logged_on: new Date().toISOString().slice(0, 10),
        },
        { onConflict: "user_id,logged_on" },
      );
      if (error) throw error;
    },
    onSuccess: async () => {
      setValue("");
      toast.success("Body weight logged");
      await qc.invalidateQueries({ queryKey: ["body-weights"] });
    },
    onError: () => toast.error("Could not save that"),
  });

  const chart = data.map((d) => ({ day: d.logged_on.slice(5), weight: Number(d.weight) }));

  return (
    <section className="panel p-4">
      <h2 className="text-lg uppercase">Body weight</h2>
      <div className="mt-3 flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="bw">Today (kg)</Label>
          <Input
            id="bw"
            inputMode="decimal"
            className="num"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="82.4"
          />
        </div>
        <Button onClick={() => log.mutate()} disabled={!value || log.isPending}>
          Log
        </Button>
      </div>
      <ChartFrame empty={chart.length < 2} hint="Log twice to see your trend.">
        <LineChart data={chart}>
          <CartesianGrid strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="day" fontSize={11} stroke="currentColor" />
          <YAxis fontSize={11} stroke="currentColor" width={38} domain={["dataMin - 1", "dataMax + 1"]} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="weight" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ChartFrame>
    </section>
  );
}
