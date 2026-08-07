import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callAi, matchExercise, safeJson } from "@/lib/ai.server";
import {
  COACH_SYSTEM_PROMPT,
  PARSER_SYSTEM_PROMPT,
  buildTrainingContext,
} from "@/lib/coach-context.server";

export const coachChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message: string }) => {
    const message = (input?.message ?? "").trim();
    if (!message) throw new Error("Message is empty");
    return { message: message.slice(0, 2000) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [history, trainingContext] = await Promise.all([
      supabase
        .from("coach_messages")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      buildTrainingContext(supabase, userId),
    ]);

    const prior = ((history.data ?? []) as { role: string; content: string }[])
      .slice()
      .reverse()
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    const reply = await callAi([
      { role: "system", content: COACH_SYSTEM_PROMPT },
      { role: "system", content: `TRAINING DATA\n${trainingContext}` },
      ...prior,
      { role: "user", content: data.message },
    ]);

    await supabase.from("coach_messages").insert([
      { user_id: userId, role: "user", content: data.message },
      { user_id: userId, role: "assistant", content: reply },
    ]);

    return { reply };
  });

export const coachInsight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const trainingContext = await buildTrainingContext(supabase, userId);

    const raw = await callAi(
      [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        { role: "system", content: `TRAINING DATA\n${trainingContext}` },
        {
          role: "user",
          content: `Give me today's proactive read on my training. Return ONLY JSON:
{"headline":"<max 60 chars>","body":"<2-3 sentences, concrete, cites my numbers>","flags":[{"type":"plateau|fatigue|volume|recovery|momentum","text":"<max 90 chars>"}],"next_session":"<one sentence recommendation for my next gym session>"}
Look for plateaus, rising RPE at the same load, missed reps, volume drops or spikes, and fatigue carried in from non-gym activity.`,
        },
      ],
      true,
    );

    return safeJson(raw, {
      headline: "Not enough data yet",
      body: "Log a couple of sessions and I'll start spotting trends.",
      flags: [] as { type: string; text: string }[],
      next_session: "Start with a full-body session so I can baseline your strength.",
    });
  });

export const suggestProgression = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { exerciseName: string }) => ({
    exerciseName: (input?.exerciseName ?? "").slice(0, 120),
  }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const trainingContext = await buildTrainingContext(supabase, userId);

    const raw = await callAi(
      [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        { role: "system", content: `TRAINING DATA\n${trainingContext}` },
        {
          role: "user",
          content: `What should I do today on ${data.exerciseName}? Return ONLY JSON:
{"target":"<e.g. 3x5 @ 82.5kg>","rationale":"<2-3 sentences explaining WHY, citing my recent numbers and RPE>","confidence":"low|medium|high"}`,
        },
      ],
      true,
    );

    return safeJson(raw, {
      target: "Repeat your last working weight",
      rationale: "I don't have enough history on this lift yet. Log a session and I'll build a real progression.",
      confidence: "low",
    });
  });

export const parseWorkoutText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => {
    const text = (input?.text ?? "").trim();
    if (!text) throw new Error("Nothing to parse");
    return { text: text.slice(0, 1200) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: exercises } = await supabase
      .from("exercises")
      .select("id, name")
      .or(`is_builtin.eq.true,user_id.eq.${userId}`)
      .limit(500);

    const library = (exercises ?? []) as { id: string; name: string }[];

    const raw = await callAi(
      [
        { role: "system", content: PARSER_SYSTEM_PROMPT },
        {
          role: "system",
          content: `Exercise library:\n${library.map((e) => e.name).join(", ")}`,
        },
        { role: "user", content: data.text },
      ],
      true,
    );

    const parsed = safeJson<{
      entries?: {
        exercise?: string;
        note?: string;
        sets?: { weight?: number; reps?: number; rpe?: number | null; set_type?: string }[];
      }[];
    }>(raw, { entries: [] });

    const entries = (parsed.entries ?? []).map((entry) => {
      const match = matchExercise(entry.exercise ?? "", library);
      return {
        exercise_id: match?.id ?? null,
        exercise_name: match?.name ?? entry.exercise ?? "Unknown exercise",
        note: entry.note ?? "",
        sets: (entry.sets ?? []).map((s) => ({
          weight: Number(s.weight ?? 0),
          reps: Number(s.reps ?? 0),
          rpe: s.rpe == null ? null : Number(s.rpe),
          set_type: (s.set_type ?? "normal") as string,
        })),
      };
    });

    return { entries };
  });
