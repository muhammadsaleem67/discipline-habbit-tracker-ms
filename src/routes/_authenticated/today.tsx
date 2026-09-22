import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import {
  applicableTasks,
  computeCounts,
  effectiveTime,
  fmtTime,
  PHASE_ORDER,
  quoteOfDay,
  sortByTime,
  timeToMinutes,
  type Task,
} from "@/lib/discipline";

export const Route = createFileRoute("/_authenticated/today")({
  head: () => ({
    meta: [
      { title: "Today — Daily Discipline" },
      { name: "description", content: "Your daily checklist, streak and notes for today." },
      { property: "og:title", content: "Today — Daily Discipline" },
      { property: "og:description", content: "Check off your routine, one calm step at a time." },
    ],
  }),
  component: TodayPage,
});

function TodayPage() {
  const {
    tasks,
    settings,
    log,
    today,
    toggleDone,
    toggleNA,
    setNotes,
    flushNotes,
    togglePause,
    resetToday,
    dismissBadge,
  } = useApp();

  const list = useMemo(
    () => sortByTime(applicableTasks(tasks, today), settings.prayer_times),
    [tasks, today, settings.prayer_times],
  );
  const { done, total, pct } = computeCounts(list, log.checked, log.na);

  const groups = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of list) {
      const arr = map.get(t.phase) ?? [];
      arr.push(t);
      map.set(t.phase, arr);
    }
    return [...map.entries()].sort((a, b) => {
      const ia = PHASE_ORDER.indexOf(a[0]);
      const ib = PHASE_ORDER.indexOf(b[0]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [list]);

  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const behind =
    !log.paused && nowMin >= 19 * 60 && total > 0 && done / total < 0.7
      ? `${total - done} left and the evening is getting on. Pick the ones that matter most.`
      : null;

  return (
    <div className="space-y-7">
      {settings.new_badge ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-gold-line bg-gold-soft px-4 py-3">
          <div>
            <div className="font-display text-base font-semibold text-gold">
              {settings.new_badge} days in a row
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              That's not luck. That's who you're becoming.
            </p>
          </div>
          <button className="btn-quiet shrink-0" onClick={dismissBadge}>
            Thanks
          </button>
        </div>
      ) : null}

      <section>
        <div className="flex items-end justify-between">
          <span className="eyebrow">{log.paused ? "Paused today" : "Today's progress"}</span>
          <span className="font-display text-sm text-gold">
            {done}/{total} · {pct}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full border border-border bg-panel-2">
          <div
            className="h-full rounded-full bg-teal transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {behind ? <p className="mt-2.5 text-[12.5px] text-coral">{behind}</p> : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <button className="btn-quiet" onClick={togglePause}>
          {log.paused ? "Resume today" : "Pause today"}
        </button>
        <button className="btn-quiet" onClick={resetToday}>
          Reset day
        </button>
      </div>

      {log.paused ? (
        <p className="surface p-4 text-[13px] text-muted-foreground">
          Today is paused — rest, travel, whatever it is. Your streak stays intact.
        </p>
      ) : null}

      <div className={log.paused ? "space-y-7 opacity-50" : "space-y-7"}>
        {groups.map(([phase, items]) => (
          <section key={phase}>
            <h2 className="eyebrow mb-2.5">{phase}</h2>
            <ul className="space-y-2">
              {items.map((t) => {
                const isNa = Boolean(log.na[t.id]);
                const isDone = Boolean(log.checked[t.id]) && !isNa;
                const time = effectiveTime(t, settings.prayer_times);
                const past = timeToMinutes(time) < nowMin;
                return (
                  <li
                    key={t.id}
                    className={`surface flex items-center gap-3 px-3.5 py-3 transition-colors ${
                      isDone ? "border-teal-line bg-teal-soft" : ""
                    } ${isNa ? "opacity-45" : ""}`}
                  >
                    <button
                      aria-label={`Toggle ${t.task}`}
                      onClick={() => toggleDone(t.id)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                        isDone ? "border-teal bg-teal text-on-accent" : "border-border-strong"
                      }`}
                    >
                      {isDone ? (
                        <svg
                          className="check-pop h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-[14px] ${
                          isDone ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      >
                        {t.task}
                      </div>
                      <div className="mt-0.5 text-[11.5px] text-faint">
                        {fmtTime(time)}
                        {t.prayer ? " · prayer" : ""}
                        {!isDone && !isNa && past ? " · overdue" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNA(t.id)}
                      className={`shrink-0 rounded-md border px-2 py-1 text-[10.5px] tracking-wide uppercase transition-colors ${
                        isNa
                          ? "border-gold-line bg-gold-soft text-gold"
                          : "border-border-strong text-faint hover:text-muted-foreground"
                      }`}
                    >
                      N/A
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <section>
        <h2 className="eyebrow mb-2">Notes for today</h2>
        <textarea
          className="field min-h-[96px] resize-y"
          placeholder="How did the day actually go?"
          value={log.notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={flushNotes}
        />
      </section>

      <p className="border-t border-border pt-5 font-display text-[14.5px] text-muted-foreground italic">
        “{quoteOfDay(today)}”
      </p>
    </div>
  );
}
