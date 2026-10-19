import { Link } from "wouter";
import { useState } from "react";
import { UserRound, ArrowUpRight } from "lucide-react";
import type { LeagueData } from "../queries/league";
import { CardStats } from "./card-stats";
import { emptyWeeklyStats, playerRating, ratingColor } from "../lib/player-rating";
export type Player = LeagueData["squad"][number];
export function Avatar({
  player,
  data,
  large = false,
}: {
  player: Player;
  data: LeagueData;
  large?: boolean;
}) {
  const src = data.photoUrls[player.photo];
  const [failed, setFailed] = useState("");
  return (
    <div className={`player-avatar ${large ? "big" : ""}`}>
      {src && src !== failed ? (
        <img
          src={src}
          alt={player.name}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
        />
      ) : (
        <UserRound strokeWidth={1.3} />
      )}
    </div>
  );
}
export function Squad({ data, teamId }: { data: LeagueData; teamId: string }) {
  const players = data.squad.filter((p) => p.teamId === teamId);
  return (
    <div className="squad-grid">
      {players.map((p) => (
        <Link href={`/players/${p.id}`} key={p.id} className="squad-card">
          <div className="squad-card-top">
            <Avatar player={p} data={data} />
            <span className="squad-number">{String(p.number).padStart(2, "0")}</span>
          </div>
          <span className="tag">
            {p.position}
            {p.sample ? " · SAMPLE PLAYER" : ""}
          </span>
          <h3>{p.name}</h3>
          <div className="squad-mini-stats">
            <span>
              <b>{p.appearances}</b>APP
            </span>
            <span>
              <b>{p.goals}</b>GOALS
            </span>
            <span>
              <b>{p.assists}</b>ASSISTS
            </span>
            <span>
              <b>{p.goals + p.assists}</b>G/A
            </span>
          </div>
          <div className="squad-card-link">
            <CardStats yellow={p.yellowCards} red={p.redCards} />
            Player profile
            <ArrowUpRight size={15} />
          </div>
        </Link>
      ))}
    </div>
  );
}
export const formations = {
  "4-3-3": [3, 3, 4, 1],
  "4-4-2": [2, 4, 4, 1],
  "3-5-2": [2, 5, 3, 1],
} as const;
export function Pitch({ data }: { data: LeagueData }) {
  let offset = 0;
  const week = data.weeklyRatings.find((record) => record.week === data.totw.week);
  return (
    <div className="totw-pitch">
      <div className="pitch-markings">
        <div className="pitch-centre" />
        <div className="pitch-box top" />
        <div className="pitch-box bottom" />
      </div>
      {formations[data.totw.formation].map((count, row) => {
        const start = offset;
        offset += count;
        return (
          <div className="pitch-row" key={row}>
            {Array.from({ length: count }, (_, i) => {
              const id = data.totw.published ? data.totw.playerIds[start + i] : "";
              const p = data.squad.find((player) => player.id === id);
              const rating = p
                ? playerRating(
                    week?.players.find((stats) => stats.playerId === p.id) ?? emptyWeeklyStats,
                    p.position,
                  )
                : null;
              return p ? (
                <Link href={`/players/${p.id}`} key={i} className="pitch-player">
                  <div className="pitch-rating-avatar">
                    <Avatar player={p} data={data} />
                    {rating !== null && (
                      <strong
                        className={`pitch-rating-badge ${ratingColor(rating)}`}
                        aria-label={`Week ${data.totw.week} rating ${rating.toFixed(1)} out of 10`}
                      >
                        {rating.toFixed(1)}
                      </strong>
                    )}
                  </div>
                  <b>{p.name}</b>
                  <span>{data.teams.find((t) => t.id === p.teamId)?.name}</span>
                  {rating === null && <small className="pitch-not-rated">Not rated</small>}
                </Link>
              ) : (
                <div key={i} className="pitch-player unselected">
                  <div className="pitch-empty">
                    <UserRound size={22} />
                  </div>
                  <b>To be selected</b>
                  <span>{row === 3 ? "GK" : row === 2 ? "DEF" : row === 1 ? "MID" : "FWD"}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
