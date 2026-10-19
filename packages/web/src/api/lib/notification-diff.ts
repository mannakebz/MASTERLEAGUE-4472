type Item = { id: string; [key: string]: unknown };
type LeagueSnapshot = {
  news: Item[];
  fixtures: Item[];
  transfers: Item[];
  teams: Item[];
  squad: Item[];
  totw: { published: boolean; week: number; [key: string]: unknown };
  weeklyRatings?: { week: number; players: unknown[] }[];
};
export type UpdateEvent = {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string;
  createdAt: number;
};
export function detectUpdates(before: LeagueSnapshot, after: LeagueSnapshot): UpdateEvent[] {
  const events: UpdateEvent[] = [];
  function add(category: string, title: string, body: string, url: string) {
    events.push({ id: crypto.randomUUID(), category, title, body, url, createdAt: Date.now() });
  }
  for (const n of after.news) {
    const old = before.news.find((v) => v.id === n.id);
    if (JSON.stringify(old) !== JSON.stringify(n))
      add(
        n.breaking ? "Breaking news" : "News",
        String(n.title),
        old ? "A league story has been updated." : "A new league story has been published.",
        `/news/${encodeURIComponent(n.id)}`,
      );
  }
  if (JSON.stringify(before.fixtures) !== JSON.stringify(after.fixtures))
    add(
      "Fixtures",
      "Match centre updated",
      "New fixtures, results or match details are available.",
      "/fixtures",
    );
  const values = (items: Item[]) => items.map((p) => [p.id, p.transferValue ?? 0]);
  if (
    JSON.stringify(before.transfers) !== JSON.stringify(after.transfers) ||
    JSON.stringify(values(before.squad)) !== JSON.stringify(values(after.squad))
  )
    add(
      "Transfers",
      "Transfer centre updated",
      "Transfer activity or player transfer values have been updated.",
      "/transfers",
    );
  if (
    JSON.stringify(before.teams) !== JSON.stringify(after.teams) ||
    JSON.stringify(before.squad) !== JSON.stringify(after.squad)
  )
    add(
      "Stats",
      "Player & team stats updated",
      "Squads, standings or player statistics have been updated, including disciplinary records.",
      "/stats",
    );
  if (after.totw.published && JSON.stringify(before.totw) !== JSON.stringify(after.totw))
    add(
      "TOTW",
      `Team of the Week · Week ${after.totw.week}`,
      "The official XI has been published. See this week’s standout players.",
      "/totw",
    );
  for (const week of after.weeklyRatings ?? []) {
    const old = before.weeklyRatings?.find((w) => w.week === week.week);
    if (JSON.stringify(old) !== JSON.stringify(week))
      add(
        "Stats",
        `Player ratings · Week ${week.week}`,
        "Weekly appearances, contributions and player ratings have been published.",
        `/?ratingWeek=${week.week}#player-ratings-title`,
      );
  }
  return events;
}
