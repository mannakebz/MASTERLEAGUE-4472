import { expect, test } from "bun:test";
import { emptyWeeklyStats, playerRating, ratingColor } from "../src/web/lib/player-rating";
import { weeklyRatingsSchema, validWeeklyReferences } from "../src/api/lib/weekly-ratings";
import { detectUpdates } from "../src/api/lib/notification-diff";

const base = { ...emptyWeeklyStats, played: true };
test("participants start at 6.0, nonparticipants have no rating", () => {
  expect(playerRating(base, "DEF")).toBe(6);
  expect(playerRating(emptyWeeklyStats, "DEF")).toBeNull();
});
test("goals, assists, yellow cards combine", () => {
  expect(playerRating({ ...base, goals: 1 }, "FWD")).toBe(7.5);
  expect(playerRating({ ...base, assists: 1 }, "MID")).toBe(6.9);
  expect(playerRating({ ...base, yellowCards: 1 }, "MID")).toBe(5.5);
  expect(playerRating({ ...base, goals: 1, assists: 1, yellowCards: 1 }, "MID")).toBe(7.9);
});
test("clean-sheet bonuses depend on player position", () => {
  const stats = { ...base, cleanSheets: 1 };
  expect(playerRating(stats, "DEF")).toBe(7.5);
  expect(playerRating(stats, "MID")).toBe(7.2);
  for (const position of ["GK", "FWD"]) expect(playerRating(stats, position)).toBe(7);
  expect(playerRating({ ...stats, cleanSheets: 2 }, "MID")).toBe(8.4);
  expect(playerRating({ ...stats, played: false }, "GK")).toBeNull();
  expect(playerRating({ ...stats, goals: 1, assists: 1, yellowCards: 1 }, "DEF")).toBe(9.4);
});
test("red overrides every contribution; bounds and one-decimal rounding", () => {
  expect(playerRating({ ...base, redCards: 1, goals: 5, cleanSheets: 1 }, "DEF")).toBe(0);
  expect(playerRating({ ...base, goals: 5 }, "FWD")).toBe(10);
  expect(playerRating({ ...base, yellowCards: 50 }, "DEF")).toBe(0);
  expect(playerRating({ ...base, assists: 3 }, "MID")).toBe(8.7);
  expect(ratingColor(0)).toBe("low");
  expect(ratingColor(null)).toBe("unrated");
});
test("schema defaults preserve legacy state; invalid weekly entries rejected", () => {
  expect(weeklyRatingsSchema.parse(undefined)).toEqual([]);
  const player = { ...base, playerId: "p" };
  const legacy = { ...player };
  delete (legacy as Partial<typeof player>).cleanSheets;
  expect(
    weeklyRatingsSchema.parse([{ week: 1, players: [legacy] }])[0].players[0].cleanSheets,
  ).toBe(0);
  for (const changes of [
    { played: false, goals: 1 },
    { played: false, cleanSheets: 1 },
    { goals: -1 },
    { assists: 1.5 },
    { yellowCards: 1001 },
  ])
    expect(
      weeklyRatingsSchema.safeParse([{ week: 1, players: [{ ...player, ...changes }] }]).success,
    ).toBe(false);
  expect(weeklyRatingsSchema.safeParse([{ week: 0, players: [] }]).success).toBe(false);
});
test("unique valid week and player references required", () => {
  const week = { week: 1, players: [{ ...base, playerId: "p" }] };
  expect(validWeeklyReferences([week], ["p"])).toBe(true);
  expect(validWeeklyReferences([week, week], ["p"])).toBe(false);
  expect(
    validWeeklyReferences([{ ...week, players: [...week.players, ...week.players] }], ["p"]),
  ).toBe(false);
  expect(validWeeklyReferences([week], ["other"])).toBe(false);
});
test("weekly publish produces one linked alert; unchanged publish is silent", () => {
  const before = {
    teams: [],
    squad: [],
    news: [],
    fixtures: [],
    transfers: [],
    totw: { published: false, week: 0 },
    weeklyRatings: [],
  };
  const after = { ...before, weeklyRatings: [{ week: 1, players: [{ ...base, playerId: "p" }] }] };
  const events = detectUpdates(before, after);
  expect(events.length).toBe(1);
  expect(events[0].url).toBe("/?ratingWeek=1#player-ratings-title");
  expect(detectUpdates(after, after)).toEqual([]);
  expect(before.weeklyRatings).toEqual([]);
});
