import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import * as api from "@/lib/api";
import { useApp } from "@/lib/store";
import {
  applicableTasks,
  dateKey,
  logPct,
  prettyDate,
  todayStr,
  type DailyLog,
} from "@/lib/discipline";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Daily Discipline" },
      { name: "description", content: "Heatmap, rolling averages and most-skipped tasks." },
      { property: "og:title", content: "Insights — Daily Discipline" },
      { property: "og:description", content: "See the honest shape of your consistency over time." },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const { userId, tasks } = useApp();
  const today = todayStr();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  const from = `${cursor.y - 1}-01-01`;
  const logsQuery = useQuery({
    queryKey: ["logs", userId, from, today],
    queryFn: () => api.loadLogRange(userId, from, `${cursor.y + 1}-12-31`),
  });
  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const byDate = useMemo(() => {
    const m = new Map<string, DailyLog>();
    for (const l of logs) m.set(l.log_date, l);
    return m;
  }, [logs]);

  const rolling = (days: number) => {
    let sum = 0;
    let n = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const l = byDate.get(dateKey(d.getFullYear(), d.getMonth(), d.getDate()));
      if (!l || l.paused || l.total_count === 0) continue;
      sum += logPct(l);
      n++;
    }
    return n === 0 ? null : Math.round((sum / n) * 100);
  };

  const consistency = useMemo(() => {
    const counts = new Map<string, { done: number; eligible: number }>();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
      const l = byDate.get(key);
      if (!l || l.paused) continue;
      for (const t of applicableTasks(tasks, key)) {
        if (l.na[t.id]) continue;
        const c = counts.get(t.id) ?? { done: 0, eligible: 0 };
        c.eligible++;
        if (l.checked[t.id]) c.done++;
        counts.set(t.id, c);
      }
    }
    return tasks
      .map((t) => {
        const c = counts.get(t.id);
        return {
          task: t.task,
          eligible: c?.eligible ?? 0,
          pct: c && c.eligible > 0 ? Math.round((c.done / c.eligible) * 100) : null,
        };
      })
      .filter((r) => r.eligible > 0)
      .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
  }, [byDate, tasks]);

  const monthCells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const lead = first.getDay();
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(dateKey(cursor.y, cursor.m, d));
    return cells;
  }, [cursor]);

  const shade = (key: string) => {
    const l = byDate.get(key);
    if (!l) return "bg-panel-2 border-border";
    if (l.paused) return "bg-gold-soft border-gold-line";
    const p = logPct(l);
    if (p >= 1) return "bg-teal border-teal";
    if (p >= 0.7) return "bg-teal-soft border-teal-line";
    if (p > 0) return "bg-panel border-border-strong";
    return "bg-panel-2 border-border";
  };

  const selectedLog = selected ? byDate.get(selected) : undefined;

  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3">
        {[
          { label: "Last 7 days", v: rolling(7) },
          { label: "Last 30 days", v: rolling(30) },
        ].map((s) => (
          <div key={s.label} className="surface p-4">
            <div className="eyebrow">{s.label}</div>
            <div className="mt-1 font-display text-2xl font-semibold text-gold">
              {s.v === null ? "—" : `${s.v}%`}
            </div>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-[15px] font-semibold">{monthLabel}</h2>
          <div className="flex gap-2">
            <button
              className="btn-quiet"
              onClick={() =>
                setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 }))
              }
            >
              ←
            </button>
            <button
              className="btn-quiet"
              onClick={() =>
                setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 }))
              }
            >
              →
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="eyebrow pb-1">
              {d}
            </div>
          ))}
          {monthCells.map((key, i) =>
            key === null ? (
              <div key={`e${i}`} />
            ) : (
              <button
                key={key}
                onClick={() => setSelected(key)}
                className={`aspect-square rounded-md border text-[10.5px] text-muted-foreground transition-transform hover:scale-105 ${shade(key)} ${
                  key === today ? "ring-1 ring-gold" : ""
                } ${selected === key ? "ring-1 ring-foreground" : ""}`}
              >
                {Number(key.slice(-2))}
              </button>
            ),
          )}
        </div>
      </section>

      <section className="surface p-4">
        <h2 className="eyebrow mb-2">Look up any date</h2>
        <input
          className="field"
          type="date"
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value || null)}
        />
        {selected ? (
          <div className="mt-4">
            <div className="font-display text-[14.5px]">{prettyDate(selected)}</div>
            {!selectedLog ? (
              <p className="mt-1 text-[13px] text-faint">Nothing recorded on this day.</p>
            ) : (
              <>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {selectedLog.paused
                    ? "Paused day."
                    : `${selectedLog.done_count} of ${selectedLog.total_count} done.`}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {applicableTasks(tasks, selected).map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-[13px]">
                      <span
                        className={
                          selectedLog.na[t.id]
                            ? "text-gold"
                            : selectedLog.checked[t.id]
                              ? "text-teal"
                              : "text-faint"
                        }
                      >
                        {selectedLog.na[t.id] ? "N/A" : selectedLog.checked[t.id] ? "✓" : "○"}
                      </span>
                      <span className="text-muted-foreground">{t.task}</span>
                    </li>
                  ))}
                </ul>
                {selectedLog.notes ? (
                  <p className="mt-3 border-t border-border pt-3 text-[13px] text-muted-foreground italic">
                    {selectedLog.notes}
                  </p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="eyebrow mb-2.5">Most skipped, last 30 days</h2>
        {consistency.length === 0 ? (
          <p className="text-[13px] text-faint">Not enough history yet — keep going.</p>
        ) : (
          <ul className="space-y-2">
            {consistency.slice(0, 8).map((r) => (
              <li key={r.task} className="surface flex items-center gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px]">{r.task}</span>
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-panel-2">
                  <div
                    className={`h-full ${(r.pct ?? 0) < 50 ? "bg-coral" : "bg-teal"}`}
                    style={{ width: `${r.pct ?? 0}%` }}
                  />
                </div>
                <span className="w-10 text-right text-[12px] text-faint">{r.pct}%</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
