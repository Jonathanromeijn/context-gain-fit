import { supabase } from "@/integrations/supabase/client";
import type { Activity, BodyWeightLog, Exercise, Routine, Workout, WorkoutSet } from "./types";

export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, user_id, name, muscle, equipment, is_builtin")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function fetchWorkouts(limit = 30): Promise<Workout[]> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, name, notes, started_at, finished_at")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Workout[];
}

export async function fetchActiveWorkout(): Promise<Workout | null> {
  const { data, error } = await supabase
    .from("workouts")
    .select("id, name, notes, started_at, finished_at")
    .is("finished_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as Workout | null;
}

export async function fetchSets(workoutId: string): Promise<WorkoutSet[]> {
  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      "id, workout_id, exercise_id, position, set_index, weight, reps, rpe, set_type, completed, created_at",
    )
    .eq("workout_id", workoutId)
    .order("position")
    .order("set_index");
  if (error) throw error;
  return (data ?? []) as unknown as WorkoutSet[];
}

export async function fetchAllSets(): Promise<(WorkoutSet & { workout_started_at: string })[]> {
  const { data, error } = await supabase
    .from("workout_sets")
    .select(
      "id, workout_id, exercise_id, position, set_index, weight, reps, rpe, set_type, completed, created_at, workouts(started_at)",
    )
    .order("created_at", { ascending: true })
    .limit(4000);
  if (error) throw error;
  return ((data ?? []) as unknown as (WorkoutSet & { workouts: { started_at: string } | null })[]).map(
    (s) => ({ ...s, workout_started_at: s.workouts?.started_at ?? s.created_at }),
  );
}

export async function fetchRoutines(): Promise<Routine[]> {
  const { data, error } = await supabase
    .from("routines")
    .select("id, name, notes, items, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Routine[];
}

export async function fetchActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from("activities")
    .select("id, kind, duration_min, intensity, notes, occurred_at")
    .order("occurred_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function fetchBodyWeights(): Promise<BodyWeightLog[]> {
  const { data, error } = await supabase
    .from("body_weight_logs")
    .select("id, weight, logged_on")
    .order("logged_on", { ascending: true })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as BodyWeightLog[]).map((w) => ({ ...w, weight: Number(w.weight) }));
}

export async function fetchCoachMessages() {
  const { data, error } = await supabase
    .from("coach_messages")
    .select("id, role, content, created_at")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as { id: string; role: string; content: string; created_at: string }[];
}
