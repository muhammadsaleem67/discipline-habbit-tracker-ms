import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { loadSharedStreak } from "@/lib/api";

export const Route = createFileRoute("/s/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "A shared streak — Daily Discipline" },
      { name: "description", content: "A read-only view of someone's discipline streak." },
      { property: "og:title", content: "A shared streak — Daily Discipline" },
      { property: "og:description", content: "Streak accountability, without sharing private notes." },
    ],
  }),
  component: SharedStreak,
});

function SharedStreak() {
  const { slug } = Route.useParams();
  const { data, isPending } = useQuery({
    queryKey: ["shared", slug],
    queryFn: () => loadSharedStreak(slug),
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
      {isPending ? (
        <p className="text-sm text-faint">…</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">This streak isn't being shared.</p>
      ) : (
        <>
          <p className="eyebrow">Daily Discipline</p>
          <h1 className="mt-3 font-display text-2xl font-semibold">
            {data.display_name || "Someone"} is on a
          </h1>
          <div className="mt-5 font-display text-6xl font-semibold text-gold">{data.streak}</div>
          <p className="mt-2 text-sm text-muted-foreground">day streak</p>
          <p className="mt-6 text-[13px] text-faint">Best ever: {data.best_streak} days</p>
        </>
      )}
    </main>
  );
}
