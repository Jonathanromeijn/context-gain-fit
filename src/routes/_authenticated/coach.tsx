import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { coachChat } from "@/lib/ai.functions";
import { fetchCoachMessages } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI coach — Loadline" },
      {
        name: "description",
        content: "Ask your coach anything — it already knows your volume, RPE trends and recent sessions.",
      },
      { property: "og:title", content: "AI coach — Loadline" },
      { property: "og:description", content: "Context-aware strength coaching based on your own training data." },
    ],
  }),
  component: CoachPage,
});

const PROMPTS = [
  "Why has my bench stalled?",
  "I ran 12k yesterday — adjust today's session",
  "Am I doing enough back volume?",
  "Build me a 4-day upper/lower split",
];

function CoachPage() {
  const qc = useQueryClient();
  const send = useServerFn(coachChat);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const messages = useQuery({ queryKey: ["coach-messages"], queryFn: fetchCoachMessages });

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, pending]);

  async function submit(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setPending(message);
    setBusy(true);
    try {
      await send({ data: { message } });
      await qc.invalidateQueries({ queryKey: ["coach-messages"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Coach is unavailable");
    } finally {
      setPending(null);
      setBusy(false);
    }
  }

  const list = messages.data ?? [];

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col">
      <div>
        <h1 className="text-display text-4xl uppercase">Coach</h1>
        <p className="text-sm text-muted-foreground">
          Knows your last 6 weeks of sets, RPE and outside training.
        </p>
      </div>

      <div className="mt-5 flex-1 space-y-3">
        {messages.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !list.length && !pending ? (
          <div className="panel p-6">
            <Sparkles className="size-5 text-primary" aria-hidden />
            <p className="mt-3 text-sm text-muted-foreground">
              Ask anything about your training. Try one of these:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <Button key={p} size="sm" variant="outline" onClick={() => submit(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {list.map((m) => (
          <Bubble key={m.id} role={m.role} content={m.content} />
        ))}
        {pending && <Bubble role="user" content={pending} />}
        {busy && (
          <div className="panel w-fit p-3 text-sm text-muted-foreground">Reading your training…</div>
        )}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="sticky bottom-16 mt-4 flex items-end gap-2 border-t border-border bg-background/90 py-3 backdrop-blur md:bottom-0"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach…"
          className="min-h-11 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
          <Send />
        </Button>
      </form>
    </div>
  );
}

function Bubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-card-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none prose-headings:uppercase">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
