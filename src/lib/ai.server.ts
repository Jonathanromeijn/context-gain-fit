const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "openai/gpt-5.6-sol";

export type AiMessage = { role: "system" | "user" | "assistant"; content: string };

export class AiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function callAi(messages: AiMessage[], jsonMode = false): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError("AI is not configured yet.", 500);

  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    reasoning_effort: "none",
  };
  if (jsonMode) body["response_format"] = { type: "json_object" };

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new AiError("The coach is getting a lot of requests right now. Try again in a moment.", 429);
  }
  if (res.status === 402) {
    throw new AiError("AI credits are used up. Add credits to keep coaching.", 402);
  }
  if (!res.ok) {
    const detail = await res.text();
    console.error("AI gateway error", res.status, detail);
    throw new AiError("The coach could not answer that. Please try again.", res.status);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export function safeJson<T>(raw: string, fallback: T): T {
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function matchExercise<T extends { id: string; name: string }>(
  query: string,
  list: T[],
): T | null {
  const q = normalize(query);
  if (!q) return null;
  let best: { item: T; score: number } | null = null;
  for (const item of list) {
    const n = normalize(item.name);
    let score = 0;
    if (n === q) score = 100;
    else if (n.includes(q) || q.includes(n)) score = 70 + Math.min(20, q.length / 2);
    else {
      const qWords = new Set(q.split(" "));
      const nWords = n.split(" ");
      const hits = nWords.filter((w) => qWords.has(w)).length;
      score = hits === 0 ? 0 : (hits / Math.max(nWords.length, qWords.size)) * 60;
    }
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }
  return best && best.score >= 30 ? best.item : null;
}
