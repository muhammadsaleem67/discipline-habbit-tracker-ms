import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { quoteOfDay, todayStr } from "@/lib/discipline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Daily Discipline — a quiet coach for your daily routine" },
      {
        name: "description",
        content:
          "Daily Discipline is a calm daily checklist and long-term habit tracker: streaks, N/A days, pause for sick days, and a year of history.",
      },
      { property: "og:title", content: "Daily Discipline — build a routine that holds" },
      {
        property: "og:description",
        content: "A calm daily checklist, streaks that survive sick days, and honest long-term insight.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/today", replace: true });
      else setCheckingSession(false);
    });
  }, [navigate]);

  if (checkingSession) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-faint">…</div>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
      <p className="eyebrow">Daily Discipline</p>
      <h1 className="mt-4 text-4xl leading-tight font-semibold text-foreground sm:text-5xl">
        A quiet coach for the
        <span className="text-gold"> ordinary days.</span>
      </h1>
      <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
        Your morning-to-night routine as one calm checklist. Streaks that survive a sick day, honest
        history going back as far as you've kept it, and long-term course progress in the same place.
      </p>

      <div className="mt-9 flex flex-wrap gap-3">
        <Link to="/auth" search={{ mode: "signup" }} className="btn-accent">
          Start your routine
        </Link>
        <Link to="/auth" search={{ mode: "signin" }} className="btn-quiet">
          I already have an account
        </Link>
      </div>

      <div className="mt-14 grid gap-3 sm:grid-cols-3">
        {[
          { t: "Today", d: "Checklist by phase, live progress, notes, pause and N/A." },
          { t: "Insights", d: "Heatmap, rolling averages, most-skipped tasks." },
          { t: "Courses", d: "Long-term progress trackers in your own units." },
        ].map((c) => (
          <div key={c.t} className="surface p-4">
            <div className="font-display text-sm font-semibold text-gold">{c.t}</div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{c.d}</p>
          </div>
        ))}
      </div>

      <p className="mt-14 border-t border-border pt-6 font-display text-[15px] text-muted-foreground italic">
        “{quoteOfDay(todayStr())}”
      </p>
    </main>
  );
}
