import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { prettyDate } from "@/lib/discipline";
import { useApp } from "@/lib/store";

const TABS = [
  { to: "/today", label: "Today" },
  { to: "/insights", label: "Insights" },
  { to: "/courses", label: "Courses" },
  { to: "/settings", label: "Settings" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { settings, today, signOut } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-2xl px-5 pt-7 pb-24">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[0.01em]">Daily Discipline</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{prettyDate(today)}</p>
          </div>
          <div className="flex min-w-[86px] flex-col items-end rounded-xl border border-gold-line bg-gold-soft px-4 py-2.5">
            <span className="font-display text-xl leading-none font-semibold text-gold">
              {settings.streak}
            </span>
            <span className="eyebrow mt-1">day streak</span>
            <span className="mt-1 text-[10px] text-faint">best: {settings.best_streak}</span>
          </div>
        </header>

        <nav className="mt-6 flex gap-5 border-b border-border">
          {TABS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="-mb-px border-b-2 border-transparent pb-2.5 text-[13.5px] font-medium text-faint transition-colors hover:text-muted-foreground"
              activeProps={{ className: "!border-gold !text-gold" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="rise-in mt-7">{children}</div>

        <footer className="mt-14 flex items-center justify-between border-t border-border pt-5 text-[11.5px] text-faint">
          <span>Signed in — your data is private to you.</span>
          <button
            className="hover:text-gold"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            Sign out
          </button>
        </footer>
      </div>
    </div>
  );
}
