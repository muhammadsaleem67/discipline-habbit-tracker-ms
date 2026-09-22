import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import * as api from "@/lib/api";
import { useApp } from "@/lib/store";
import { THEMES, type Days, type Prayer, type Task } from "@/lib/discipline";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Daily Discipline" },
      { name: "description", content: "Themes, prayer times and your full task editor." },
      { property: "og:title", content: "Settings — Daily Discipline" },
      { property: "og:description", content: "Shape the routine around your own day." },
    ],
  }),
  component: SettingsPage,
});

const DAY_LABEL: Record<Days, string> = {
  all: "Every day",
  weekday: "Weekdays",
  weekend: "Weekends",
};

function SettingsPage() {
  const { userId, email, settings, tasks, saveSettings, refreshTasks } = useApp();
  const [newTask, setNewTask] = useState({ phase: "", task: "", time: "08:00", days: "all" as Days });

  async function patchTask(t: Task, patch: Partial<Omit<Task, "id">>) {
    await api.updateTask(t.id, patch);
    await refreshTasks();
  }

  async function move(index: number, dir: -1 | 1) {
    const other = tasks[index + dir];
    const current = tasks[index];
    if (!other || !current) return;
    await api.reorderTasks([
      { id: current.id, sort_order: other.sort_order },
      { id: other.id, sort_order: current.sort_order },
    ]);
    await refreshTasks();
  }

  async function addTask() {
    if (!newTask.task.trim()) return;
    const maxOrder = tasks.reduce((m, t) => Math.max(m, t.sort_order), -1);
    await api.addTask(userId, {
      phase: newTask.phase.trim() || "Other",
      task: newTask.task.trim(),
      time: newTask.time,
      days: newTask.days,
      prayer: null,
      sort_order: maxOrder + 1,
    });
    setNewTask({ phase: "", task: "", time: "08:00", days: "all" });
    await refreshTasks();
  }

  const shareUrl =
    settings.share_enabled && settings.share_slug && typeof window !== "undefined"
      ? `${window.location.origin}/s/${settings.share_slug}`
      : null;

  return (
    <div className="space-y-9">
      <section>
        <h2 className="eyebrow mb-3">Your account</h2>
        <div className="surface space-y-3 p-4">
          <p className="text-[13px] text-muted-foreground">{email}</p>
          <input
            className="field"
            placeholder="Display name"
            value={settings.display_name}
            onChange={(e) => void saveSettings({ display_name: e.target.value })}
          />
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Theme</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => void saveSettings({ theme: t.key })}
              className={`surface flex items-center gap-2 px-3 py-2.5 text-left text-[12.5px] transition-colors ${
                settings.theme === t.key ? "border-gold-line bg-gold-soft text-gold" : ""
              }`}
            >
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full"
                style={{ background: t.swatch, boxShadow: `0 0 0 3px ${t.accent}33` }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Prayer times</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["fajr", "maghrib", "isha"] as Prayer[]).map((p) => (
            <label key={p} className="surface p-3">
              <span className="eyebrow">{p}</span>
              <input
                className="field mt-1.5"
                type="time"
                value={settings.prayer_times[p]}
                onChange={(e) =>
                  void saveSettings({
                    prayer_times: { ...settings.prayer_times, [p]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-faint">
          Any task linked to a prayer follows these times everywhere.
        </p>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Share your streak</h2>
        <div className="surface space-y-3 p-4">
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <input
              type="checkbox"
              checked={settings.share_enabled}
              onChange={(e) =>
                void saveSettings({
                  share_enabled: e.target.checked,
                  share_slug:
                    settings.share_slug ?? Math.random().toString(36).slice(2, 10),
                })
              }
            />
            Let anyone with the link see only your name and streak
          </label>
          {shareUrl ? (
            <input className="field" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Tasks</h2>
        <ul className="space-y-2">
          {tasks.map((t, i) => (
            <li key={t.id} className="surface space-y-2 p-3">
              <div className="flex gap-2">
                <input
                  className="field"
                  value={t.task}
                  onChange={(e) => void patchTask(t, { task: e.target.value })}
                />
                <input
                  className="field w-[112px]"
                  type="time"
                  value={t.time}
                  onChange={(e) => void patchTask(t, { time: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="field flex-1"
                  value={t.phase}
                  onChange={(e) => void patchTask(t, { phase: e.target.value })}
                />
                <select
                  className="field w-auto"
                  value={t.days}
                  onChange={(e) => void patchTask(t, { days: e.target.value as Days })}
                >
                  {(["all", "weekday", "weekend"] as Days[]).map((d) => (
                    <option key={d} value={d}>
                      {DAY_LABEL[d]}
                    </option>
                  ))}
                </select>
                <select
                  className="field w-auto"
                  value={t.prayer ?? ""}
                  onChange={(e) =>
                    void patchTask(t, { prayer: (e.target.value || null) as Prayer | null })
                  }
                >
                  <option value="">No prayer link</option>
                  <option value="fajr">Fajr</option>
                  <option value="maghrib">Maghrib</option>
                  <option value="isha">Isha</option>
                </select>
                <button className="btn-quiet" onClick={() => void move(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button
                  className="btn-quiet"
                  onClick={() => void move(i, 1)}
                  disabled={i === tasks.length - 1}
                >
                  ↓
                </button>
                <button
                  className="text-[11.5px] text-faint hover:text-coral"
                  onClick={async () => {
                    await api.deleteTask(t.id);
                    await refreshTasks();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="surface mt-4 space-y-2 p-3">
          <h3 className="eyebrow">Add a task</h3>
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="Task name"
              value={newTask.task}
              onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
            />
            <input
              className="field w-[112px]"
              type="time"
              value={newTask.time}
              onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="field flex-1"
              placeholder="Phase, e.g. Morning — foundation"
              value={newTask.phase}
              onChange={(e) => setNewTask({ ...newTask, phase: e.target.value })}
            />
            <select
              className="field w-auto"
              value={newTask.days}
              onChange={(e) => setNewTask({ ...newTask, days: e.target.value as Days })}
            >
              {(["all", "weekday", "weekend"] as Days[]).map((d) => (
                <option key={d} value={d}>
                  {DAY_LABEL[d]}
                </option>
              ))}
            </select>
            <button className="btn-accent" onClick={() => void addTask()}>
              Add task
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
