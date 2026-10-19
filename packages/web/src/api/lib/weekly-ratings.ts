import { z } from "zod";

const count = z.number().int().min(0).max(1000);
export const weeklyPlayerSchema = z
  .object({
    playerId: z.string().min(1).max(200),
    played: z.boolean(),
    goals: count,
    assists: count,
    cleanSheets: count.default(0),
    yellowCards: count,
    redCards: count,
  })
  .refine(
    (p) => p.played || !(p.goals || p.assists || p.cleanSheets || p.yellowCards || p.redCards),
    {
      message: "A player who did not play cannot have weekly goals, assists or cards.",
    },
  );
export const weeklyRatingsSchema = z
  .array(
    z.object({
      week: z.number().int().min(1).max(10000),
      players: z.array(weeklyPlayerSchema).max(60),
    }),
  )
  .max(500)
  .default([]);

export function validWeeklyReferences(
  weeks: z.infer<typeof weeklyRatingsSchema>,
  playerIds: string[],
) {
  return (
    new Set(weeks.map((w) => w.week)).size === weeks.length &&
    weeks.every(
      (w) =>
        new Set(w.players.map((p) => p.playerId)).size === w.players.length &&
        w.players.every((p) => playerIds.includes(p.playerId)),
    )
  );
}
