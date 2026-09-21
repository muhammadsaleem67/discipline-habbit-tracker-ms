export type Days = "all" | "weekday" | "weekend";
export type Prayer = "fajr" | "maghrib" | "isha";

export interface Task {
  id: string;
  phase: string;
  task: string;
  time: string;
  days: Days;
  prayer: Prayer | null;
  sort_order: number;
}

export interface DailyLog {
  log_date: string;
  checked: Record<string, boolean>;
  na: Record<string, boolean>;
  task_ids: string[];
  notes: string;
  paused: boolean;
  done_count: number;
  total_count: number;
}

export interface Course {
  id: string;
  name: string;
  total: number;
  unit: string;
  done: number;
}

export interface PrayerTimes {
  fajr: string;
  maghrib: string;
  isha: string;
}

export interface Settings {
  user_id: string;
  display_name: string;
  theme: string;
  prayer_times: PrayerTimes;
  streak: number;
  best_streak: number;
  last_completed_date: string | null;
  badges: Record<string, boolean>;
  new_badge: number | null;
  share_slug: string | null;
  share_enabled: boolean;
  seeded: boolean;
}

export const PHASE_ORDER = [
  "Morning — foundation",
  "Study block 1 — peak focus",
  "School",
  "Afternoon — recovery and review",
  "Evening — growth block",
  "Wind down",
];

export const DEFAULT_PRAYER: PrayerTimes = {
  fajr: "05:00",
  maghrib: "19:00",
  isha: "21:15",
};

type SeedTask = Omit<Task, "id"> & { prayer: Prayer | null };

export const DEFAULT_TASKS: SeedTask[] = [
  { phase: "Morning — foundation", task: "Fajr prayer", time: "05:00", days: "all", prayer: "fajr" },
  { phase: "Morning — foundation", task: "Qur'an / dhikr", time: "05:30", days: "all", prayer: null },
  { phase: "Morning — foundation", task: "Light exercise or stretching", time: "06:00", days: "all", prayer: null },
  { phase: "Morning — foundation", task: "Freshen up and breakfast", time: "06:30", days: "all", prayer: null },
  { phase: "Study block 1 — peak focus", task: "Deepest focus study, no phone", time: "07:00", days: "all", prayer: null },
  { phase: "School", task: "Classes", time: "09:00", days: "weekday", prayer: null },
  { phase: "Afternoon — recovery and review", task: "Lunch and rest", time: "15:00", days: "all", prayer: null },
  { phase: "Afternoon — recovery and review", task: "Power nap, 20–30 min", time: "15:30", days: "all", prayer: null },
  { phase: "Afternoon — recovery and review", task: "Review today's class notes", time: "16:15", days: "weekday", prayer: null },
  { phase: "Evening — growth block", task: "Asr prayer", time: "17:00", days: "all", prayer: null },
  { phase: "Evening — growth block", task: "English & communication skills practice", time: "17:30", days: "all", prayer: null },
  { phase: "Evening — growth block", task: "Homework / school revision", time: "18:15", days: "weekday", prayer: null },
  { phase: "Evening — growth block", task: "Maghrib prayer", time: "19:00", days: "all", prayer: "maghrib" },
  { phase: "Evening — growth block", task: "Dinner and family time", time: "19:30", days: "all", prayer: null },
  { phase: "Evening — growth block", task: "Data analyst course", time: "20:15", days: "all", prayer: null },
  { phase: "Evening — growth block", task: "Online course work", time: "21:00", days: "all", prayer: null },
  { phase: "Evening — growth block", task: "Isha prayer", time: "21:15", days: "all", prayer: "isha" },
  { phase: "Wind down", task: "Plan tomorrow", time: "21:45", days: "all", prayer: null },
  { phase: "Wind down", task: "Free time, screens off", time: "22:15", days: "all", prayer: null },
  { phase: "Wind down", task: "Sleep", time: "22:45", days: "all", prayer: null },
].map((t, i) => ({ ...t, sort_order: i })) as SeedTask[];

export const THEMES: { key: string; label: string; swatch: string; accent: string }[] = [
  { key: "default", label: "Midnight brass", swatch: "#D4A24C", accent: "#4FA88F" },
  { key: "ocean", label: "Deep water", swatch: "#5FB8D6", accent: "#3E8FC4" },
  { key: "forest", label: "Pine", swatch: "#B7C86A", accent: "#5C9E6E" },
  { key: "plum", label: "Dusk plum", swatch: "#C79FE0", accent: "#8F7ED6" },
];

export const QUOTES = [
  "Discipline is choosing what you want most over what you want now.",
  "Small consistent steps outlast big irregular efforts.",
  "You don't need motivation for what has already become habit.",
  "Show up on the ordinary days — that's where discipline is built.",
  "Progress hides inside repetition, not intensity.",
  "The version of you that you're building shows up one checkbox at a time.",
  "Discipline is a quiet act of self-respect.",
  "What you repeat, you become.",
  "A slow habit kept is worth more than a fast plan abandoned.",
  "Today's effort is tomorrow's ease.",
  "Consistency turns effort into identity.",
  "Every completed day is evidence you can trust yourself.",
];

export function quoteOfDay(dateStr: string) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) % 100000;
  return QUOTES[hash % QUOTES.length];
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

export function todayStr() {
  const d = new Date();
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function prettyDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function daysBetween(a: string, b: string) {
  return (
    Math.round(
      (new Date(a + "T00:00:00").getTime() - new Date(b + "T00:00:00").getTime()) / 86400000,
    ) * -1
  );
}

export function isWeekendDate(dateStr: string) {
  const dow = new Date(dateStr + "T00:00:00").getDay();
  return dow === 0 || dow === 6;
}

export function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${period}`;
}

export function timeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function effectiveTime(t: Task, prayerTimes: PrayerTimes) {
  if (t.prayer && prayerTimes[t.prayer]) return prayerTimes[t.prayer];
  return t.time;
}

export function applicableTasks(tasks: Task[], dateStr: string) {
  const weekend = isWeekendDate(dateStr);
  return tasks.filter((t) => t.days === "all" || (t.days === "weekend") === weekend);
}

export function sortByTime(list: Task[], prayerTimes: PrayerTimes) {
  return [...list].sort(
    (a, b) => timeToMinutes(effectiveTime(a, prayerTimes)) - timeToMinutes(effectiveTime(b, prayerTimes)),
  );
}

export function computeCounts(list: Task[], checked: Record<string, boolean>, na: Record<string, boolean>) {
  const naCount = list.filter((t) => na[t.id]).length;
  const total = list.length - naCount;
  const done = list.filter((t) => checked[t.id] && !na[t.id]).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

export function logPct(log: { done_count: number; total_count: number }) {
  return log.total_count > 0 ? log.done_count / log.total_count : 0;
}

export const MILESTONES = [7, 30, 100, 365];
