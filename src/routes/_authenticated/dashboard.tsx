import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Dumbbell, Flame, Plus, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { coachInsight } from "@/lib/ai.functions";
import { fetchActiveWorkout, fetchAllSets, fetchWorkouts, fetchActivities } from "@/lib/db";
import { setVolume } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Today — Loadline" },
      { name: "description", content: "Your training week at a glance, plus what your AI coach spotted." },
      { property: "og:title", content: "Today — Loadline" },
      { property: "og:description", content: "Weekly volume, streaks and proactive coaching insights." },
    ],
  }),
  component: Dashboard,
});

function startOfWeek(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const getInsight = useServerFn(coachInsight);

  const workouts = useQuery({ queryKey: ["workouts"], queryFn: () => fetchWorkouts(30) });
  const active = useQuery({ queryKey: ["active-workout"], queryFn: fetchActiveWorkout });
  const sets = useQuery({ queryKey: ["all-sets"], queryFn: fetchAllSets });
  const activities = useQuery({ queryKey: ["activities"], queryFn: fetchActivities });

  const insight = useQuery({
    queryKey: ["coach-insight"],
    queryFn: () => getInsight({ data: undefined }),
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  const start = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("workouts")
        .insert({ user_id: userData.user!.id, name: "Workout" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["active-workout"] });
      navigate({ to: "/log" });
    },
    onError: () => toast.error("Could not start the workout"),
  });

  const weekStart = startOfWeek();
  const weekWorkouts = (workouts.data ?? []).filter((w) => new Date(w.started_at) >= weekStart);
  const weekSetsRows = (sets.data ?? []).filter((s) => new Date(s.workout_started_at) >= weekStart);
  const weekVolume = weekSetsRows.reduce((sum, s) => sum + setVolume(s), 0);
  const weekWorkingSets = weekSetsRows.filter((s) => s.set_type !== "warmup").length;
  const weekActivities = (activities.data ?? []).filter((a) => new Date(a.occurred_at) >= weekStart);

  const data = insight.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display text-4xl uppercase">This week</h1>
          <p className="text-sm text-muted-foreground">
            {weekWorkouts.length} session{weekWorkouts.length === 1 ? "" : "s"} ·{" "}
            {weekActivities.length} outside activit{weekActivities.length === 1 ? "y" : "ies"}
          </p>
        </div>
        {active.data ? (
          <Button asChild size="lg">
            <Link to="/log">
              <Flame /> Resume workout
            </Link>
          </Button>
        ) : (
          <Button size="lg" onClick={() => start.mutate()} disabled={start.isPending}>
            <Plus /> Start workout
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Working sets" value={weekWorkingSets.toString()} />
        <Stat label="Volume" value={`${Math.round(weekVolume).toLocaleString()} kg`} />
        <Stat label="Sessions" value={weekWorkouts.length.toString()} />
      </div>

      <section className="panel relative overflow-hidden p-5">
        <div className="absolute -right-16 -top-16 size-48 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3.5" aria-hidden /> Coach read
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => insight.refetch()}
              disabled={insight.isFetching}
            >
              <RefreshCw className={insight.isFetching ? "animate-spin" : ""} />
            </Button>
          </div>

          {insight.isLoading ? (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : insight.isError ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {insight.error instanceof Error ? insight.error.message : "Coach is unavailable right now."}
            </p>
          ) : (
            <>
              <h2 className="mt-3 text-2xl uppercase">{data?.headline}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{data?.body}</p>
              {!!data?.flags?.length && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {data.flags.map((f, i) => (
                    <Badge key={i} variant="outline" className="border-primary/40 text-primary">
                      {f.type}: {f.text}
                    </Badge>
                  ))}
                </div>
              )}
              {data?.next_session && (
                <p className="mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                  <span className="font-semibold uppercase text-primary">Next session · </span>
                  {data.next_session}
                </p>
              )}
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/coach">
                  <Brain /> Ask the coach
                </Link>
              </Button>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-display mb-3 text-2xl uppercase">Recent sessions</h2>
        {workouts.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : workouts.data?.length ? (
          <ul className="space-y-2">
            {workouts.data.slice(0, 8).map((w) => {
              const wSets = (sets.data ?? []).filter((s) => s.workout_id === w.id);
              const vol = wSets.reduce((a, s) => a + setVolume(s), 0);
              return (
                <li key={w.id} className="panel flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold">{w.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.started_at).toLocaleDateString(undefined, {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      {!w.finished_at && " · in progress"}
                    </p>
                  </div>
                  <div className="text-right num">
                    <p className="text-sm font-semibold">{wSets.length} sets</p>
                    <p className="text-xs text-muted-foreground">{Math.round(vol).toLocaleString()} kg</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="panel p-8 text-center">
            <Dumbbell className="mx-auto size-6 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">
              No sessions yet. Start one and the coach starts learning.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="text-display num mt-1 text-3xl">{value}</p>
    </div>
  );
}
