import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as api from "@/lib/api";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({
    meta: [
      { title: "Courses — Daily Discipline" },
      { name: "description", content: "Long-term progress trackers in your own units." },
      { property: "og:title", content: "Courses — Daily Discipline" },
      { property: "og:description", content: "Track modules, chapters or hours over the long run." },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { userId, courses, refreshCourses } = useApp();
  const [name, setName] = useState("");
  const [total, setTotal] = useState("40");
  const [unit, setUnit] = useState("modules");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    await api.addCourse(userId, {
      name: name.trim(),
      total: Math.max(1, Number(total) || 1),
      unit: unit.trim() || "units",
      done: 0,
    });
    setName("");
    await refreshCourses();
    setBusy(false);
  }

  async function step(id: string, done: number) {
    await api.updateCourse(id, { done });
    await refreshCourses();
  }

  return (
    <div className="space-y-7">
      <section className="surface p-4">
        <h2 className="eyebrow mb-3">Add a course</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_90px_110px_auto]">
          <input
            className="field"
            placeholder="Course name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="field"
            type="number"
            min={1}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
          <input
            className="field"
            placeholder="modules"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <button className="btn-accent" disabled={busy} onClick={add}>
            Add
          </button>
        </div>
      </section>

      {courses.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No courses yet. Add anything you're working through over weeks or months.
        </p>
      ) : null}

      <ul className="space-y-3">
        {courses.map((c) => {
          const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
          return (
            <li key={c.id} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-[15px] font-semibold">{c.name}</div>
                  <div className="mt-0.5 text-[12px] text-faint">
                    {c.done} of {c.total} {c.unit} · {pct}%
                  </div>
                </div>
                <button
                  className="text-[11.5px] text-faint hover:text-coral"
                  onClick={async () => {
                    await api.deleteCourse(c.id);
                    await refreshCourses();
                  }}
                >
                  Remove
                </button>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full border border-border bg-panel-2">
                <div className="h-full bg-gold transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  className="btn-quiet"
                  onClick={() => step(c.id, Math.max(0, c.done - 1))}
                  disabled={c.done <= 0}
                >
                  −1
                </button>
                <button
                  className="btn-accent"
                  onClick={() => step(c.id, Math.min(c.total, c.done + 1))}
                  disabled={c.done >= c.total}
                >
                  +1 {c.unit}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
