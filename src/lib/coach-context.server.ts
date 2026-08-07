import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<any, any, any>;

function dayKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export const COACH_SYSTEM_PROMPT = `You are Loadline Coach, an expert strength coach embedded inside a workout tracking app.
You always have the user's real training data in the context block. Use it — quote actual numbers, exercises and dates.
Style: direct, practical, encouraging, never fluffy. Short paragraphs and tight bullet lists. Markdown allowed.
Always explain the WHY behind a recommendation in plain language (fatigue, volume, RPE trend, rep quality).
Factor in non-gym activity (running, climbing, sports) when advising on the next session.
Never give medical or clinical advice; nutrition tips stay general and non-prescriptive.
If the data is thin, say so briefly and ask one focused question instead of inventing history.`;

export async function buildTrainingContext(supabase: Db, userId: string): Promise<string> {
  const since = new Date(Date.now() - 42 * 24 * 3600 * 1000).toISOString();

  const [profileRes, workoutsRes, setsRes, activitiesRes, weightRes] = await Promise.all([
    supabase.from("profiles").select("display_name, goal, experience, weight_unit").eq("id", userId).maybeSingle(),
    supabase
      .from("workouts")
      .select("id, name, started_at, finished_at, notes")
      .eq("user_id", userId)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(25),
    supabase
      .from("workout_sets")
      .select("workout_id, weight, reps, rpe, set_type, exercises(name, muscle)")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(1200),
    supabase
      .from("activities")
      .select("kind, duration_min, intensity, notes, occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(40),
    supabase
      .from("body_weight_logs")
      .select("weight, logged_on")
      .eq("user_id", userId)
      .order("logged_on", { ascending: false })
      .limit(8),
  ]);

  const profile = profileRes.data as
    | { display_name: string | null; goal: string; experience: string; weight_unit: string }
    | null;
  const unit = profile?.weight_unit ?? "kg";
  const workouts = (workoutsRes.data ?? []) as {
    id: string;
    name: string;
    started_at: string;
    finished_at: string | null;
    notes: string | null;
  }[];
  const sets = (setsRes.data ?? []) as unknown as {
    workout_id: string;
    weight: number;
    reps: number;
    rpe: number | null;
    set_type: string;
    exercises: { name: string; muscle: string } | null;
  }[];
  const activities = (activitiesRes.data ?? []) as {
    kind: string;
    duration_min: number;
    intensity: string;
    notes: string | null;
    occurred_at: string;
  }[];
  const weights = (weightRes.data ?? []) as { weight: number; logged_on: string }[];

  const lines: string[] = [];
  lines.push(`Today: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(
    `Athlete: ${profile?.display_name ?? "lifter"} | goal: ${profile?.goal ?? "general"} | experience: ${
      profile?.experience ?? "intermediate"
    } | unit: ${unit}`,
  );

  // Weekly volume + RPE trend
  const weekly = new Map<string, { volume: number; sets: number; rpe: number[] }>();
  const byWorkout = new Map<string, typeof sets>();
  for (const s of sets) {
    const arr = byWorkout.get(s.workout_id) ?? [];
    arr.push(s);
    byWorkout.set(s.workout_id, arr);
  }
  for (const w of workouts) {
    const d = new Date(w.started_at);
    const week = new Date(d);
    week.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const wk = week.toISOString().slice(0, 10);
    const bucket = weekly.get(wk) ?? { volume: 0, sets: 0, rpe: [] };
    for (const s of byWorkout.get(w.id) ?? []) {
      if (s.set_type === "warmup") continue;
      bucket.volume += Number(s.weight) * s.reps;
      bucket.sets += 1;
      if (s.rpe) bucket.rpe.push(Number(s.rpe));
    }
    weekly.set(wk, bucket);
  }

  if (weekly.size) {
    lines.push("");
    lines.push("Weekly totals (week starting -> working sets, volume, avg RPE):");
    for (const [wk, v] of [...weekly.entries()].sort().reverse()) {
      const avg = v.rpe.length ? (v.rpe.reduce((a, b) => a + b, 0) / v.rpe.length).toFixed(1) : "n/a";
      lines.push(`- ${wk}: ${v.sets} sets, ${Math.round(v.volume)} ${unit} volume, avg RPE ${avg}`);
    }
  }

  // Per-exercise history (best set per session, last 6 sessions)
  const perExercise = new Map<string, { date: string; best: string }[]>();
  for (const w of workouts) {
    const groups = new Map<string, typeof sets>();
    for (const s of byWorkout.get(w.id) ?? []) {
      const name = s.exercises?.name ?? "Unknown";
      const arr = groups.get(name) ?? [];
      arr.push(s);
      groups.set(name, arr);
    }
    for (const [name, group] of groups) {
      const working = group.filter((g) => g.set_type !== "warmup");
      if (!working.length) continue;
      const top = working.reduce((a, b) => (Number(b.weight) > Number(a.weight) ? b : a));
      const summary = `${working.length}x sets, top ${Number(top.weight)}${unit} x ${top.reps}${
        top.rpe ? ` @RPE${Number(top.rpe)}` : ""
      }`;
      const arr = perExercise.get(name) ?? [];
      if (arr.length < 6) arr.push({ date: dayKey(w.started_at), best: summary });
      perExercise.set(name, arr);
    }
  }

  if (perExercise.size) {
    lines.push("");
    lines.push("Exercise history (most recent first):");
    for (const [name, hist] of perExercise) {
      lines.push(`- ${name}: ${hist.map((h) => `${h.date} ${h.best}`).join(" | ")}`);
    }
  }

  if (workouts.length) {
    lines.push("");
    lines.push("Recent sessions:");
    for (const w of workouts.slice(0, 10)) {
      const mins =
        w.finished_at
          ? Math.round((new Date(w.finished_at).getTime() - new Date(w.started_at).getTime()) / 60000)
          : null;
      lines.push(
        `- ${dayKey(w.started_at)} "${w.name}"${mins ? ` (${mins} min)` : " (in progress)"}${
          w.notes ? ` note: ${w.notes}` : ""
        }`,
      );
    }
  }

  if (activities.length) {
    lines.push("");
    lines.push("Non-gym activity:");
    for (const a of activities.slice(0, 15)) {
      lines.push(
        `- ${dayKey(a.occurred_at)} ${a.kind}, ${a.duration_min} min, intensity ${a.intensity}${
          a.notes ? ` (${a.notes})` : ""
        }`,
      );
    }
  } else {
    lines.push("");
    lines.push("Non-gym activity: none logged.");
  }

  if (weights.length) {
    lines.push("");
    lines.push(`Body weight: ${weights.map((w) => `${w.logged_on} ${Number(w.weight)}${unit}`).join(", ")}`);
  }

  if (!workouts.length) {
    lines.push("");
    lines.push("No workouts logged yet — this athlete is brand new to the app.");
  }

  return lines.join("\n");
}

export const PARSER_SYSTEM_PROMPT = `You convert free-form gym talk into structured sets.
Return ONLY JSON: {"entries":[{"exercise":"<name>","sets":[{"weight":<number>,"reps":<number>,"rpe":<number|null>,"set_type":"normal|warmup|dropset|restpause|superset"}],"note":"<short note or empty>"}]}
Rules:
- "3x8 squat at 60kg" means 3 identical sets of 8 reps at 60.
- Match the exercise to the CLOSEST name from the provided library list; copy that name exactly. If nothing is close, use the user's wording.
- Bodyweight movements with no load use weight 0.
- Convert pounds to the athlete's unit only if explicitly asked; otherwise keep the number as spoken.
- "felt heavy"/"grindy" -> rpe 9; "easy" -> rpe 6; leave null when unclear.
- Never invent sets that were not mentioned.`;
