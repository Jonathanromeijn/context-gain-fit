import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Dumbbell, Mic, Activity, LineChart, Zap } from "lucide-react";
import heroImage from "@/assets/hero-gym.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loadline — the workout tracker with a coach that reads your data" },
      {
        name: "description",
        content:
          "Log lifts in seconds, talk to an AI coach that knows your volume, RPE trends and outside-the-gym training, and get progression with reasons — not just numbers.",
      },
      { property: "og:title", content: "Loadline — AI strength coach & workout tracker" },
      {
        property: "og:description",
        content:
          "Log lifts in seconds and get coaching from an AI that already knows your training history.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Brain,
    title: "Coach with context",
    body: "Not a chat tab bolted on. It opens already knowing your last 6 weeks: volume, RPE trend, missed reps, session notes.",
  },
  {
    icon: Mic,
    title: "Log by talking",
    body: '"3x8 squat at 60kg, felt heavy" becomes three logged sets with RPE. Or tap it in — auto-filled from last time.',
  },
  {
    icon: Zap,
    title: "Progression with a reason",
    body: "Every recommendation comes with the why, in plain language — not a rule-based number you have to trust blindly.",
  },
  {
    icon: Activity,
    title: "Life outside the gym counts",
    body: "Ran 10k? Went bouldering? Your coach factors fatigued legs and cooked grip into today's session.",
  },
  {
    icon: LineChart,
    title: "Plateau & fatigue radar",
    body: "Flags stalling volume and creeping RPE before you feel it — proactively, on your home screen.",
  },
  {
    icon: Dumbbell,
    title: "Fast, complete logging",
    body: "Rest timer, previous values, warm-ups, drop sets, rest-pause, PR detection, routines, 60+ exercises.",
  },
];

function Landing() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <span className="text-display text-2xl text-foreground">
          LOAD<span className="text-primary">LINE</span>
        </span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="relative overflow-hidden border-y border-border">
        <img
          src={heroImage}
          alt="Loaded barbell resting on a dark gym floor"
          width={1600}
          height={1104}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
        <div className="relative mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" /> MVP · web app
          </p>
          <h1 className="text-display max-w-3xl text-5xl uppercase sm:text-7xl">
            Your tracker should know
            <span className="text-gradient-lime"> why you stalled</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Loadline logs every set as fast as you can talk, then coaches you with an AI that has
            actually read your training — volume, RPE, missed reps, and the 10k you ran yesterday.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base">
              <Link to="/auth">Start training free</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <a href="#how">See how it works</a>
            </Button>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-display text-3xl uppercase sm:text-4xl">
          Logging is the baseline. <span className="text-primary">Coaching is the point.</span>
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="panel p-5">
              <f.icon className="size-5 text-primary" aria-hidden />
              <h3 className="mt-3 text-lg uppercase">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-display text-3xl uppercase">Ready when you are</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Free tier includes full logging, routines and charts, plus weekly coach queries.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/auth">Create your account</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border px-5 py-8 text-center text-xs text-muted-foreground">
        Loadline · training guidance only, not medical advice.
      </footer>
    </main>
  );
}
