export type RatingStats = {
  played: boolean;
  goals: number;
  assists: number;
  cleanSheets: number;
  redCards: number;
  yellowCards: number;
};

export function playerRating(player: RatingStats, position: string): number | null {
  if (!player.played) return null;
  if (player.redCards > 0) return 0;
  return (
    Math.round(
      Math.min(
        10,
        Math.max(
          0,
          6 +
            player.goals * 1.5 +
            player.assists * 0.9 +
            player.cleanSheets * (position === "DEF" ? 1.5 : position === "MID" ? 1.2 : 1.0) -
            player.yellowCards * 0.5,
        ),
      ) * 10,
    ) / 10
  );
}

export const emptyWeeklyStats: RatingStats = {
  played: false,
  goals: 0,
  assists: 0,
  cleanSheets: 0,
  yellowCards: 0,
  redCards: 0,
};

export function ratingColor(rating: number | null) {
  return rating === null
    ? "unrated"
    : rating >= 9
      ? "excellent"
      : rating >= 7
        ? "good"
        : rating >= 5
          ? "average"
          : "low";
}
