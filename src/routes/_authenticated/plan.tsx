import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Activity as ActivityIcon, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchActivities, fetchRoutines, fetchExercises } from "@/lib/db";
import { ACTIVITY_KINDS } from "@/lib/types";
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

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "Plan — Loadline" },
      {
        name: "description",
        content: "Save routines and log the training you do outside the gym so your coach accounts for it.",
      },
      { property: "og:title", content: "Plan — Loadline" },
      { property: "og:description", content: "Routines plus cross-training log for smarter coaching." },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const qc = useQueryClient();
  const routines = useQuery({ queryKey: ["routines"], queryFn: fetchRoutines });
  const activities = useQuery({ queryKey: ["activities"], queryFn: fetchActivities });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: fetchExercises });

  const [routineName, setRoutineName] = useState("");
  const [kind, setKind] = useState<string>(ACTIVITY_KINDS[0]);
  const [duration, setDuration] = useState("45");
  const [intensity, setIntensity] = useState("moderate");

  const createRoutine = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const items = (exercises.data ?? []).slice(0, 4).map((e) => ({
        exercise_id: e.id,
        name: e.name,
        sets: 3,
        reps: 8,
      }));
      const { error } = await supabase
        .from("routines")
        .insert({ user_id: u.user!.id, name: routineName || "New routine", items });
      if (error) throw error;
    },
    onSuccess: async () => {
      setRoutineName("");
      toast.success("Routine saved");
      await qc.invalidateQueries({ queryKey: ["routines"] });
    },
    onError: () => toast.error("Could not save the routine"),
  });

  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });

  const logActivity = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("activities").insert({
        user_id: u.user!.id,
        kind,
        duration_min: Number(duration) || 30,
        intensity,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Activity logged — your coach will factor it in");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["activities"] }),
        qc.invalidateQueries({ queryKey: ["coach-insight"] }),
      ]);
    },
    onError: () => toast.error("Could not log that"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-4xl uppercase">Plan</h1>
        <p className="text-sm text-muted-foreground">
          Routines for the gym, plus everything you do outside it.
        </p>
      </div>

      <section className="panel p-4">
        <h2 className="text-lg uppercase">Routines</h2>
        <div className="mt-3 flex items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="routine">Name</Label>
            <Input
              id="routine"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="Upper A"
            />
          </div>
          <Button onClick={() => createRoutine.mutate()} disabled={createRoutine.isPending}>
            <Plus /> Save
          </Button>
        </div>
        {routines.isLoading ? (
          <Skeleton className="mt-4 h-16 w-full" />
        ) : (
          <ul className="mt-4 space-y-2">
            {(routines.data ?? []).map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-semibold">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.items?.map((i) => i.name).join(" · ") || "No exercises yet"}
                  </p>
                </div>
                <button
                  onClick={() => deleteRoutine.mutate(r.id)}
                  aria-label="Delete routine"
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
            {!routines.data?.length && (
              <li className="py-4 text-sm text-muted-foreground">
                No routines yet — saving one prefills your next session.
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="panel p-4">
        <h2 className="flex items-center gap-2 text-lg uppercase">
          <ActivityIcon className="size-4 text-primary" aria-hidden /> Cross-training
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Runs, climbing, football — the coach uses these to adjust load and recovery.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_7rem_9rem_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>Activity</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dur">Minutes</Label>
            <Input
              id="dur"
              className="num"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Intensity</Label>
            <Select value={intensity} onValueChange={setIntensity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["easy", "moderate", "hard"].map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => logActivity.mutate()} disabled={logActivity.isPending}>
            Log
          </Button>
        </div>

        <ul className="mt-4 space-y-2">
          {(activities.data ?? []).slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-center justify-between text-sm">
              <span>{a.kind}</span>
              <span className="num text-xs text-muted-foreground">
                {a.duration_min} min · {a.intensity} ·{" "}
                {new Date(a.occurred_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
