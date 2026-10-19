import { z } from "zod";
import { ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { base } from "../__core/app";
import { db } from "../database";
import { leagueState, notificationEvents } from "../database/schema";
import { auth } from "../auth";
import { admin } from "../middleware/admin";
import { playerSchema, totwSchema, emptyTotw, seedPlayers, photo } from "../lib/squad";
import { photoUrl } from "./photos";
import { detectUpdates } from "../lib/notification-diff";
import { sendUpdatePush } from "./notifications";
import { weeklyRatingsSchema, validWeeklyReferences } from "../lib/weekly-ratings";

const nonnegative = z.number().int().min(0).max(1_000_000_000);
const teamSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  short: z.string().max(4),
  color: z.string(),
  played: nonnegative,
  wins: nonnegative,
  draws: nonnegative,
  losses: nonnegative,
  gf: nonnegative,
  ga: nonnegative,
  points: nonnegative,
  players: nonnegative,
  budget: nonnegative,
  bio: z.string().max(2000).default(""),
  photo,
});
const newsSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(180),
  body: z.string().min(1).max(20000),
  category: z.enum(["League news", "Team news", "Transfers", "Breaking news"]),
  date: z.string(),
  breaking: z.boolean(),
  photo,
});
const fixtureSchema = z.object({
  id: z.string(),
  home: z.string(),
  away: z.string(),
  date: z.string(),
  venue: z.string().max(200),
  status: z.enum(["Upcoming", "Completed"]),
  homeScore: nonnegative,
  awayScore: nonnegative,
});
const transferSchema = z.object({
  id: z.string(),
  player: z.string().min(1).max(100),
  from: z.string().max(100),
  to: z.string(),
  fee: nonnegative,
  date: z.string(),
  status: z.enum(["Confirmed", "Rumour"]),
});
const stateSchema = z.object({
  teams: z.array(teamSchema).length(4),
  news: z.array(newsSchema).max(500),
  fixtures: z.array(fixtureSchema).max(500),
  transfers: z.array(transferSchema).max(500),
  squad: z.array(playerSchema).length(60),
  totw: totwSchema,
  weeklyRatings: weeklyRatingsSchema,
});
type State = z.infer<typeof stateSchema>;
const initial: State = {
  teams: [
    { id: "seirin", name: "FC Seirin", short: "FCS", color: "#bf393f" },
    { id: "blue-lock", name: "Blue Lock", short: "BL", color: "#2c62c6" },
    { id: "alhamdulilah", name: "FC alhamdulilah", short: "FCA", color: "#268564" },
    { id: "psycho-riders", name: "Psycho Riders", short: "PR", color: "#7d5baf" },
  ].map((t) => ({
    ...t,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0,
    players: 0,
    budget: 0,
    bio: "",
    photo: "",
  })),
  news: [],
  fixtures: [],
  transfers: [],
  squad: seedPlayers(["seirin", "blue-lock", "alhamdulilah", "psycho-riders"]),
  totw: emptyTotw,
  weeklyRatings: [],
};
async function getState(): Promise<State> {
  const [row] = await db.select().from(leagueState).where(eq(leagueState.id, "master"));
  if (!row) return initial;
  const stored = JSON.parse(row.data);
  return stateSchema.parse({
    ...stored,
    squad: stored.squad ?? seedPlayers(stored.teams.map((t: { id: string }) => t.id)),
    totw: stored.totw ?? emptyTotw,
  });
}
export const league = {
  get: base.handler(async () => {
    const state = await getState();
    const keys = [
      ...new Set(
        [...state.teams, ...state.squad, ...state.news].map((item) => item.photo).filter(Boolean),
      ),
    ];
    const entries = await Promise.all(keys.map(async (key) => [key, await photoUrl(key)] as const));
    return { ...state, photoUrls: Object.fromEntries(entries) };
  }),
  access: base.handler(async ({ context }) => {
    const session = await auth.api.getSession({ headers: context.headers });
    const email = process.env.MASTER_LEAGUE_ADMIN_EMAIL?.trim().toLowerCase();
    return {
      configured: Boolean(email),
      allowed: Boolean(
        email && session?.user.emailVerified && session.user.email.toLowerCase() === email,
      ),
      signedIn: Boolean(session),
      verified: Boolean(session?.user.emailVerified),
    };
  }),
  save: admin.input(stateSchema).handler(async ({ input }) => {
    const ids = input.teams.map((t) => t.id);
    if (new Set(ids).size !== 4 || ids.some((id) => !initial.teams.some((t) => t.id === id)))
      throw new ORPCError("BAD_REQUEST", { message: "Keep the four registered team IDs." });
    if (
      input.fixtures.some(
        (f) => f.home === f.away || !ids.includes(f.home) || !ids.includes(f.away),
      ) ||
      input.transfers.some((t) => !ids.includes(t.to))
    )
      throw new ORPCError("BAD_REQUEST", { message: "Select valid teams." });
    const playerIds = input.squad.map((p) => p.id);
    if (
      new Set(playerIds).size !== 60 ||
      input.squad.some((p) => !ids.includes(p.teamId)) ||
      ids.some((id) => input.squad.filter((p) => p.teamId === id).length !== 15)
    )
      throw new ORPCError("BAD_REQUEST", {
        message: "Each team must have exactly 15 unique players.",
      });
    const selected = input.totw.playerIds.filter(Boolean);
    if (!validWeeklyReferences(input.weeklyRatings, playerIds))
      throw new ORPCError("BAD_REQUEST", {
        message: "Use unique week numbers and different valid players in each weekly record.",
      });
    if (
      new Set(selected).size !== selected.length ||
      selected.some((id) => !playerIds.includes(id))
    )
      throw new ORPCError("BAD_REQUEST", { message: "Select different valid players for TOTW." });
    if (input.totw.published && (selected.length !== 11 || input.totw.week < 1))
      throw new ORPCError("BAD_REQUEST", {
        message: "Publishing TOTW requires a week number and all 11 players.",
      });
    const normalized = {
      ...input,
      teams: input.teams.map((t) => ({
        ...t,
        players: input.squad.filter((p) => p.teamId === t.id && !p.sample).length,
      })),
    };
    const before = await getState();
    if (
      before.weeklyRatings.some(
        (w) => !normalized.weeklyRatings.some((next) => next.week === w.week),
      )
    )
      throw new ORPCError("BAD_REQUEST", {
        message: "Keep all published rating weeks. Reload administration before publishing.",
      });
    const events = detectUpdates(before, normalized);
    await db.transaction(async (tx) => {
      await tx
        .insert(leagueState)
        .values({ id: "master", data: JSON.stringify(normalized) })
        .onConflictDoUpdate({ target: leagueState.id, set: { data: JSON.stringify(normalized) } });
      if (events.length) await tx.insert(notificationEvents).values(events);
    });
    let push = { sent: 0, failed: 0 };
    try {
      push = await sendUpdatePush(events);
    } catch {
      push = { sent: 0, failed: 1 };
    }
    return { ...normalized, notificationsCreated: events.length, push };
  }),
};
