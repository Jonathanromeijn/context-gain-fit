export type Exercise = {
  id: string;
  user_id: string | null;
  name: string;
  muscle: string;
  equipment: string;
  is_builtin: boolean;
};

export type SetType = "normal" | "warmup" | "dropset" | "restpause" | "superset";

export type WorkoutSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  position: number;
  set_index: number;
  weight: number;
  reps: number;
  rpe: number | null;
  set_type: SetType;
  completed: boolean;
  created_at: string;
};

export type Workout = {
  id: string;
  name: string;
  notes: string | null;
  started_at: string;
  finished_at: string | null;
};

export type RoutineItem = { exercise_id: string; name: string; sets: number; reps: number };

export type Routine = {
  id: string;
  name: string;
  notes: string | null;
  items: RoutineItem[];
  created_at: string;
};

export type Activity = {
  id: string;
  kind: string;
  duration_min: number;
  intensity: string;
  notes: string | null;
  occurred_at: string;
};

export type BodyWeightLog = {
  id: string;
  weight: number;
  logged_on: string;
};

export const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "forearms",
  "other",
] as const;

export const EQUIPMENT = [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "other",
] as const;

export const SET_TYPE_LABEL: Record<SetType, string> = {
  normal: "Normal",
  warmup: "Warm-up",
  dropset: "Drop set",
  restpause: "Rest-pause",
  superset: "Superset",
};

export const ACTIVITY_KINDS = [
  "Running",
  "Cycling",
  "Climbing / Bouldering",
  "Padel / Tennis",
  "Soccer",
  "Swimming",
  "Hiking",
  "Basketball",
  "Yoga / Mobility",
  "Other",
] as const;

export function epley1rm(weight: number, reps: number) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

export function setVolume(s: { weight: number; reps: number; set_type: string }) {
  if (s.set_type === "warmup") return 0;
  return s.weight * s.reps;
}
