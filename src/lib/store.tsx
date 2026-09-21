import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import * as api from "./api";
import {
  applicableTasks,
  computeCounts,
  daysBetween,
  MILESTONES,
  todayStr,
  type Course,
  type DailyLog,
  type Settings,
  type Task,
} from "./discipline";

interface AppData {
  userId: string;
  email: string;
  settings: Settings;
  tasks: Task[];
  courses: Course[];
  log: DailyLog;
  today: string;
  loading: boolean;
  toggleDone: (taskId: string) => void;
  toggleNA: (taskId: string) => void;
  setNotes: (notes: string) => void;
  flushNotes: () => void;
  togglePause: () => void;
  resetToday: () => void;
  dismissBadge: () => void;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshCourses: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

function emptyLog(date: string): DailyLog {
  return {
    log_date: date,
    checked: {},
    na: {},
    task_ids: [],
    notes: "",
    paused: false,
    done_count: 0,
    total_count: 0,
  };
}

export function AppDataProvider({
  userId,
  email,
  children,
}: {
  userId: string;
  email: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [today, setToday] = useState(todayStr());

  // roll over at midnight
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayStr();
      setToday((prev) => (prev === t ? prev : t));
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const settingsQuery = useQuery({
    queryKey: ["settings", userId],
    queryFn: () => api.loadSettings(userId),
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", userId],
    queryFn: () => api.loadTasks(userId),
  });

  const coursesQuery = useQuery({
    queryKey: ["courses", userId],
    queryFn: () => api.loadCourses(userId),
  });

  const logQuery = useQuery({
    queryKey: ["log", userId, today],
    queryFn: () => api.loadLog(userId, today),
  });

  // seed the starter routine once
  const seedingRef = useRef(false);
  useEffect(() => {
    const s = settingsQuery.data;
    const t = tasksQuery.data;
    if (!s || !t || seedingRef.current) return;
    if (t.length === 0 && !s.seeded) {
      seedingRef.current = true;
      api
        .seedDefaultTasks(userId)
        .then(() => queryClient.invalidateQueries({ queryKey: ["tasks", userId] }))
        .finally(() => {
          seedingRef.current = false;
        });
    }
  }, [settingsQuery.data, tasksQuery.data, userId, queryClient]);

  const [log, setLog] = useState<DailyLog>(() => emptyLog(today));
  const hydratedFor = useRef<string | null>(null);

  useEffect(() => {
    if (logQuery.isPending) return;
    const key = `${userId}:${today}`;
    if (hydratedFor.current === key) return;
    hydratedFor.current = key;
    setLog(logQuery.data ?? emptyLog(today));
  }, [logQuery.data, logQuery.isPending, today, userId]);

  const settings = settingsQuery.data;
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const persist = useCallback(
    (next: DailyLog) => {
      void api.saveLog(userId, next).then(() => {
        queryClient.setQueryData(["log", userId, next.log_date], next);
      });
    },
    [queryClient, userId],
  );

  const applyLog = useCallback(
    (mutate: (draft: DailyLog) => DailyLog) => {
      setLog((prev) => {
        const list = applicableTasks(tasks, prev.log_date);
        const draft = mutate({ ...prev, checked: { ...prev.checked }, na: { ...prev.na } });
        const { total, done } = computeCounts(list, draft.checked, draft.na);
        const next: DailyLog = {
          ...draft,
          task_ids: list.map((t) => t.id),
          done_count: done,
          total_count: total,
        };
        persist(next);
        void maybeAdvanceStreak(next, total, done);
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, persist, settings],
  );

  const maybeAdvanceStreak = useCallback(
    async (next: DailyLog, total: number, done: number) => {
      if (!settings) return;
      if (next.log_date !== todayStr()) return;
      if (total <= 0 || done < total) return;
      if (settings.last_completed_date === next.log_date) return;

      const continues =
        settings.last_completed_date && daysBetween(settings.last_completed_date, next.log_date) === 1;
      const streak = continues ? settings.streak + 1 : 1;
      const best = Math.max(streak, settings.best_streak);
      const badges = { ...settings.badges };
      let newBadge: number | null = settings.new_badge;
      for (const m of MILESTONES) {
        if (streak === m && !badges[String(m)]) {
          badges[String(m)] = true;
          newBadge = m;
        }
      }
      const patch: Partial<Settings> = {
        streak,
        best_streak: best,
        last_completed_date: next.log_date,
        badges,
        new_badge: newBadge,
      };
      queryClient.setQueryData(["settings", userId], { ...settings, ...patch });
      await api.updateSettings(userId, patch);
    },
    [settings, queryClient, userId],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (!settings) return;
      queryClient.setQueryData(["settings", userId], { ...settings, ...patch });
      await api.updateSettings(userId, patch);
      await queryClient.invalidateQueries({ queryKey: ["settings", userId] });
    },
    [settings, queryClient, userId],
  );

  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setNotes = useCallback(
    (notes: string) => {
      setLog((prev) => {
        const next = { ...prev, notes };
        if (notesTimer.current) clearTimeout(notesTimer.current);
        notesTimer.current = setTimeout(() => persist(next), 700);
        return next;
      });
    },
    [persist],
  );

  const value: AppData | null = settings
    ? {
        userId,
        email,
        settings,
        tasks,
        courses: coursesQuery.data ?? [],
        log,
        today,
        loading: tasksQuery.isPending || logQuery.isPending,
        toggleDone: (taskId) =>
          applyLog((d) => {
            if (d.na[taskId] || d.paused) return d;
            d.checked[taskId] = !d.checked[taskId];
            return d;
          }),
        toggleNA: (taskId) =>
          applyLog((d) => {
            if (d.paused) return d;
            d.na[taskId] = !d.na[taskId];
            if (d.na[taskId]) d.checked[taskId] = false;
            return d;
          }),
        setNotes,
        flushNotes: () => {
          if (notesTimer.current) clearTimeout(notesTimer.current);
          persist(log);
        },
        togglePause: () => {
          applyLog((d) => ({ ...d, paused: !d.paused }));
          if (!log.paused && settings.last_completed_date !== log.log_date) {
            void saveSettings({ last_completed_date: log.log_date });
          }
        },
        resetToday: () => applyLog((d) => ({ ...d, checked: {}, na: {} })),
        dismissBadge: () => void saveSettings({ new_badge: null }),
        saveSettings,
        refreshTasks: async () => {
          await queryClient.invalidateQueries({ queryKey: ["tasks", userId] });
        },
        refreshCourses: async () => {
          await queryClient.invalidateQueries({ queryKey: ["courses", userId] });
        },
        signOut: async () => {
          await queryClient.cancelQueries();
          queryClient.clear();
          await supabase.auth.signOut();
        },
      }
    : null;

  // theme
  useEffect(() => {
    if (settings?.theme) document.documentElement.dataset["theme"] = settings.theme;
  }, [settings?.theme]);

  if (!value) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-faint">
        Loading your day…
      </div>
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppDataProvider");
  return ctx;
}
