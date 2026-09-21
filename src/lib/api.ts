import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_PRAYER,
  DEFAULT_TASKS,
  type Course,
  type DailyLog,
  type PrayerTimes,
  type Settings,
  type Task,
} from "./discipline";

export async function getUserId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------------- settings ---------------- */

export async function loadSettings(userId: string): Promise<Settings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;

  if (data) return normalizeSettings(data);

  const { data: created, error: insertError } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (insertError) throw insertError;
  return normalizeSettings(created);
}

function normalizeSettings(row: Record<string, unknown>): Settings {
  return {
    user_id: row["user_id"] as string,
    display_name: (row["display_name"] as string) ?? "",
    theme: (row["theme"] as string) ?? "default",
    prayer_times: { ...DEFAULT_PRAYER, ...((row["prayer_times"] as PrayerTimes) ?? {}) },
    streak: (row["streak"] as number) ?? 0,
    best_streak: (row["best_streak"] as number) ?? 0,
    last_completed_date: (row["last_completed_date"] as string | null) ?? null,
    badges: (row["badges"] as Record<string, boolean>) ?? {},
    new_badge: (row["new_badge"] as number | null) ?? null,
    share_slug: (row["share_slug"] as string | null) ?? null,
    share_enabled: Boolean(row["share_enabled"]),
    seeded: Boolean(row["seeded"]),
  };
}

export async function updateSettings(userId: string, patch: Partial<Settings>) {
  const { error } = await supabase
    .from("user_settings")
    .update(patch as never)
    .eq("user_id", userId);
  if (error) throw error;
}

/* ---------------- tasks ---------------- */

export async function loadTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Task[];
}

export async function seedDefaultTasks(userId: string) {
  const rows = DEFAULT_TASKS.map((t) => ({ ...t, user_id: userId }));
  const { error } = await supabase.from("tasks").insert(rows as never);
  if (error) throw error;
  await updateSettings(userId, { seeded: true });
}

export async function addTask(userId: string, task: Omit<Task, "id">) {
  const { error } = await supabase.from("tasks").insert({ ...task, user_id: userId } as never);
  if (error) throw error;
}

export async function updateTask(id: string, patch: Partial<Omit<Task, "id">>) {
  const { error } = await supabase.from("tasks").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderTasks(pairs: { id: string; sort_order: number }[]) {
  await Promise.all(pairs.map((p) => updateTask(p.id, { sort_order: p.sort_order })));
}

/* ---------------- daily logs ---------------- */

function normalizeLog(row: Record<string, unknown>): DailyLog {
  return {
    log_date: row["log_date"] as string,
    checked: (row["checked"] as Record<string, boolean>) ?? {},
    na: (row["na"] as Record<string, boolean>) ?? {},
    task_ids: (row["task_ids"] as string[]) ?? [],
    notes: (row["notes"] as string) ?? "",
    paused: Boolean(row["paused"]),
    done_count: (row["done_count"] as number) ?? 0,
    total_count: (row["total_count"] as number) ?? 0,
  };
}

export async function loadLog(userId: string, date: string): Promise<DailyLog | null> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("log_date", date)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeLog(data) : null;
}

export async function loadLogRange(
  userId: string,
  from: string,
  to: string,
): Promise<DailyLog[]> {
  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", from)
    .lte("log_date", to)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(normalizeLog);
}

export async function saveLog(userId: string, log: DailyLog) {
  const { error } = await supabase.from("daily_logs").upsert(
    {
      user_id: userId,
      log_date: log.log_date,
      checked: log.checked,
      na: log.na,
      task_ids: log.task_ids,
      notes: log.notes,
      paused: log.paused,
      done_count: log.done_count,
      total_count: log.total_count,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "user_id,log_date" },
  );
  if (error) throw error;
}

/* ---------------- courses ---------------- */

export async function loadCourses(userId: string): Promise<Course[]> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Course[];
}

export async function addCourse(userId: string, course: Omit<Course, "id">) {
  const { error } = await supabase.from("courses").insert({ ...course, user_id: userId } as never);
  if (error) throw error;
}

export async function updateCourse(id: string, patch: Partial<Course>) {
  const { error } = await supabase.from("courses").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- sharing ---------------- */

export async function loadSharedStreak(slug: string) {
  const { data, error } = await supabase.rpc("get_shared_streak", { _slug: slug });
  if (error) throw error;
  const row = (data ?? [])[0];
  return row
    ? {
        display_name: (row as { display_name: string }).display_name,
        streak: (row as { streak: number }).streak,
        best_streak: (row as { best_streak: number }).best_streak,
      }
    : null;
}
