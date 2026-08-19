import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus, Sparkles, Timer, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseWorkoutText, suggestProgression } from "@/lib/ai.functions";
import { fetchActiveWorkout, fetchExercises, fetchSets, fetchAllSets } from "@/lib/db";
import { SET_TYPE_LABEL, epley1rm, setVolume, type SetType } from "@/lib/types";
import { ExerciseImage } from "@/components/ExerciseImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { title: "Log workout — Loadline" },
      {
        name: "description",
        content: "Log sets in seconds — tap them in or just describe your session in plain language.",
      },
      { property: "og:title", content: "Log workout — Loadline" },
      { property: "og:description", content: "Fast set logging with natural-language input and a rest timer." },
    ],
  }),
  component: LogPage,
});

function LogPage() {
  const qc = useQueryClient();
  const active = useQuery({ queryKey: ["active-workout"], queryFn: fetchActiveWorkout });
  const exercises = useQuery({ queryKey: ["exercises"], queryFn: fetchExercises });
  const history = useQuery({ queryKey: ["all-sets"], queryFn: fetchAllSets });
  const workoutId = active.data?.id;

  const sets = useQuery({
    queryKey: ["sets", workoutId],
    queryFn: () => fetchSets(workoutId!),
    enabled: !!workoutId,
  });

  const startWorkout = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("workouts")
        .insert({ user_id: u.user!.id, name: "Workout" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["active-workout"] }),
    onError: () => toast.error("Could not start the workout"),
  });

  const finish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("workouts")
        .update({ finished_at: new Date().toISOString() })
        .eq("id", workoutId!);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Session saved");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["active-workout"] }),
        qc.invalidateQueries({ queryKey: ["workouts"] }),
        qc.invalidateQueries({ queryKey: ["all-sets"] }),
        qc.invalidateQueries({ queryKey: ["coach-insight"] }),
      ]);
    },
  });

  if (active.isLoading) return <Skeleton className="h-64 w-full" />;

  if (!workoutId) {
    return (
      <div className="panel p-10 text-center">
        <h1 className="text-display text-3xl uppercase">No active session</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Start one, then log sets by tapping or by describing the session in your own words.
        </p>
        <Button className="mt-6" size="lg" onClick={() => startWorkout.mutate()} disabled={startWorkout.isPending}>
          <Plus /> Start workout
        </Button>
      </div>
    );
  }

  const rows = sets.data ?? [];
  const groups = groupByExercise(rows);
  const volume = rows.reduce((a, s) => a + setVolume(s), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-display text-4xl uppercase">Logging</h1>
          <p className="num text-sm text-muted-foreground">
            {rows.length} sets · {Math.round(volume).toLocaleString()} kg
          </p>
        </div>
        <div className="flex gap-2">
          <RestTimer />
          <Button variant="outline" onClick={() => finish.mutate()} disabled={finish.isPending}>
            <Check /> Finish
          </Button>
        </div>
      </div>

      <NaturalLanguageCard workoutId={workoutId} />

      {groups.map((g) => {
        const ex = exercises.data?.find((e) => e.id === g.exercise_id);
        return (
          <ExerciseBlock
            key={g.exercise_id}
            workoutId={workoutId}
            exerciseId={g.exercise_id}
            name={ex?.name ?? "Exercise"}
            sets={g.sets}
            history={history.data ?? []}
          />
        );
      })}

      <AddExerciseDialog
        workoutId={workoutId}
        existing={groups.length}
        exercises={exercises.data ?? []}
      />
    </div>
  );
}

type Row = Awaited<ReturnType<typeof fetchSets>>[number];

function groupByExercise(rows: Row[]) {
  const map = new Map<string, { exercise_id: string; position: number; sets: Row[] }>();
  for (const r of rows) {
    const g = map.get(r.exercise_id) ?? { exercise_id: r.exercise_id, position: r.position, sets: [] };
    g.sets.push(r);
    map.set(r.exercise_id, g);
  }
  return [...map.values()].sort((a, b) => a.position - b.position);
}

function ExerciseBlock({
  workoutId,
  exerciseId,
  name,
  sets,
  history,
}: {
  workoutId: string;
  exerciseId: string;
  name: string;
  sets: Row[];
  history: { exercise_id: string; weight: number; reps: number; workout_id: string }[];
}) {
  const qc = useQueryClient();
  const getSuggestion = useServerFn(suggestProgression);
  const [suggestion, setSuggestion] = useState<{ target: string; rationale: string } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const previous = useMemo(() => {
    const prior = history.filter((h) => h.exercise_id === exerciseId && h.workout_id !== workoutId);
    if (!prior.length) return null;
    const best = prior.reduce((a, b) => (epley1rm(b.weight, b.reps) > epley1rm(a.weight, a.reps) ? b : a));
    return best;
  }, [history, exerciseId, workoutId]);

  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["sets", workoutId] }),
      qc.invalidateQueries({ queryKey: ["all-sets"] }),
    ]);

  const addSet = useMutation({
    mutationFn: async () => {
      const last = sets[sets.length - 1];
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("workout_sets").insert({
        user_id: u.user!.id,
        workout_id: workoutId,
        exercise_id: exerciseId,
        position: sets[0]?.position ?? 0,
        set_index: (last?.set_index ?? 0) + 1,
        weight: last?.weight ?? previous?.weight ?? 0,
        reps: last?.reps ?? previous?.reps ?? 0,
        set_type: "normal",
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { weight?: number; reps?: number; rpe?: number | null; set_type?: string };
    }) => {
      const { error } = await supabase.from("workout_sets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_sets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  async function suggest() {
    setLoadingSuggestion(true);
    try {
      const res = await getSuggestion({ data: { exerciseName: name } });
      setSuggestion({ target: res.target, rationale: res.rationale });
    } catch {
      toast.error("Coach couldn't answer right now");
    } finally {
      setLoadingSuggestion(false);
    }
  }

  return (
    <section className="panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <ExerciseImage name={name} className="size-14" />
          <div>
            <h2 className="text-lg font-semibold uppercase">{name}</h2>
            {previous && (
              <p className="num text-xs text-muted-foreground">
                Best before: {previous.weight}kg × {previous.reps}
              </p>
            )}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={suggest} disabled={loadingSuggestion}>
          <Sparkles /> {loadingSuggestion ? "Thinking" : "Ask coach"}
        </Button>
      </div>

      {suggestion && (
        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-semibold text-primary">{suggestion.target}</p>
          <p className="mt-1 text-xs text-muted-foreground">{suggestion.rationale}</p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>#</span>
          <span>kg</span>
          <span>reps</span>
          <span>rpe</span>
          <span />
        </div>
        {sets.map((s, i) => (
          <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-2">
            <span className="num text-sm text-muted-foreground">{i + 1}</span>
            <NumberField
              value={s.weight}
              step={0.5}
              onCommit={(v) => update.mutate({ id: s.id, patch: { weight: v } })}
            />
            <NumberField
              value={s.reps}
              onCommit={(v) => update.mutate({ id: s.id, patch: { reps: v } })}
            />
            <NumberField
              value={s.rpe ?? 0}
              step={0.5}
              onCommit={(v) => update.mutate({ id: s.id, patch: { rpe: v || null } })}
            />
            <button
              onClick={() => remove.mutate(s.id)}
              className="text-muted-foreground transition-colors hover:text-destructive"
              aria-label="Delete set"
            >
              <Trash2 className="size-4" />
            </button>
            <div className="col-span-5 -mt-1 flex items-center gap-2">
              <Select
                value={s.set_type}
                onValueChange={(v) => update.mutate({ id: s.id, patch: { set_type: v } })}
              >
                <SelectTrigger className="h-7 w-[9.5rem] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SET_TYPE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {previous && s.weight * s.reps > previous.weight * previous.reps && (
                <Badge variant="outline" className="border-primary/40 text-primary">
                  PR pace
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" className="mt-4" onClick={() => addSet.mutate()}>
        <Plus /> Add set
      </Button>
    </section>
  );
}

function NumberField({
  value,
  step = 1,
  onCommit,
}: {
  value: number;
  step?: number;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value ?? 0));
  useEffect(() => setLocal(String(value ?? 0)), [value]);
  return (
    <Input
      className="num h-9"
      inputMode="decimal"
      step={step}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        const n = Number(local);
        if (!Number.isNaN(n) && n !== value) onCommit(n);
      }}
    />
  );
}

function RestTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) ref.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Button
      variant={running ? "default" : "outline"}
      onClick={() => {
        if (running) {
          setRunning(false);
          setSeconds(0);
        } else {
          setSeconds(0);
          setRunning(true);
        }
      }}
    >
      <Timer /> <span className="num">{mm}:{ss}</span>
    </Button>
  );
}

function NaturalLanguageCard({ workoutId }: { workoutId: string }) {
  const qc = useQueryClient();
  const parse = useServerFn(parseWorkoutText);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const { entries } = await parse({ data: { text } });
      const usable = entries.filter((e) => e.exercise_id && e.sets.length);
      if (!usable.length) {
        toast.error("Couldn't match that to your exercises — try naming the lift.");
        return;
      }
      const { data: u } = await supabase.auth.getUser();
      const { data: existing } = await supabase
        .from("workout_sets")
        .select("position")
        .eq("workout_id", workoutId)
        .order("position", { ascending: false })
        .limit(1);
      let position = ((existing?.[0]?.position as number | undefined) ?? -1) + 1;

      const rows = usable.flatMap((entry) => {
        const pos = position++;
        return entry.sets.map((s, i) => ({
          user_id: u.user!.id,
          workout_id: workoutId,
          exercise_id: entry.exercise_id!,
          position: pos,
          set_index: i + 1,
          weight: s.weight,
          reps: s.reps,
          rpe: s.rpe,
          set_type: (["normal", "warmup", "dropset", "restpause", "superset"].includes(s.set_type)
            ? s.set_type
            : "normal") as SetType,
        }));
      });

      const { error } = await supabase.from("workout_sets").insert(rows);
      if (error) throw error;
      setText("");
      toast.success(`Logged ${rows.length} sets`);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sets", workoutId] }),
        qc.invalidateQueries({ queryKey: ["all-sets"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Parsing failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
        <Wand2 className="size-3.5" aria-hidden /> Log by describing it
      </div>
      <Textarea
        className="mt-3 min-h-20"
        placeholder="bench 3x8 at 70, last set felt like an RPE 9. then 4 sets of 10 lat pulldown at 55"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button className="mt-3" onClick={run} disabled={busy || !text.trim()}>
        {busy ? "Parsing" : "Add to session"}
      </Button>
    </section>
  );
}

function AddExerciseDialog({
  workoutId,
  existing,
  exercises,
}: {
  workoutId: string;
  existing: number;
  exercises: { id: string; name: string; muscle: string }[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = exercises
    .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 40);

  const add = useMutation({
    mutationFn: async (exerciseId: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("workout_sets").insert({
        user_id: u.user!.id,
        workout_id: workoutId,
        exercise_id: exerciseId,
        position: existing,
        set_index: 1,
        weight: 0,
        reps: 0,
        set_type: "normal",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setOpen(false);
      setQuery("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sets", workoutId] }),
        qc.invalidateQueries({ queryKey: ["all-sets"] }),
      ]);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" size="lg">
          <Plus /> Add exercise
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>Search your library of built-in and custom lifts.</DialogDescription>
        </DialogHeader>
        <Label htmlFor="ex-search" className="sr-only">
          Search exercises
        </Label>
        <Input
          id="ex-search"
          autoFocus
          placeholder="Squat, row, curl…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => add.mutate(e.id)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
              >
                <ExerciseImage name={e.name} className="size-10" />
                <span className="flex-1">{e.name}</span>
                <span className="text-xs text-muted-foreground">{e.muscle}</span>
              </button>
            </li>
          ))}
          {!filtered.length && (
            <li className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <X className="size-4" /> No match
            </li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
