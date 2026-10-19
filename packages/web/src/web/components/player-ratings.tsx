import { useState } from "react";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import type { LeagueData } from "../queries/league";
import { emptyWeeklyStats, playerRating, ratingColor } from "../lib/player-rating";
import { Avatar } from "./player-ui";

export function PlayerRatings({ data }: { data: LeagueData }) {
  const [team, setTeam] = useState("all");
  const [selectedWeek, setSelectedWeek] = useState(
    () => Number(new URLSearchParams(window.location.search).get("ratingWeek")) || 0,
  );
  const weeks = [...data.weeklyRatings].sort((a, b) => b.week - a.week);
  const current = weeks.find((w) => w.week === selectedWeek) ?? weeks[0];
  return (
    <section className="player-ratings-section" aria-labelledby="player-ratings-title">
      <div className="ratings-heading">
        <div>
          <div className="eyebrow">THIS WEEK’S PERFORMANCE</div>
          <h2 id="player-ratings-title">Player ratings</h2>
          <p>
            {current
              ? `Week ${current.week} · Published weekly performances, rated out of 10.`
              : "Weekly ratings will appear after the administrator publishes a week."}
          </p>
        </div>
        <div className="rating-selectors">
          <label>
            Week
            <select
              aria-label="Ratings week"
              disabled={!weeks.length}
              value={current?.week ?? ""}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
            >
              {!weeks.length && <option value="">No published weeks</option>}
              {weeks.map((w) => (
                <option key={w.week} value={w.week}>
                  Week {w.week}
                </option>
              ))}
            </select>
          </label>
          <label>
            Team
            <select
              aria-label="Player ratings team"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            >
              <option value="all">All teams</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="panel rating-formula">
        <Sparkles size={20} aria-hidden="true" />
        <div>
          <b>A fresh 6.0 for everyone who plays</b>
          <p>
            Each goal +1.5 · Each assist +0.9 · Clean sheet: DEF +1.5 / MID +1.2 / Wingers, strikers
            & GK +1.0 · Each yellow card −0.5 · Any red card → 0.0
          </p>
          <small>
            Ratings stay between 0.0 and 10.0. Did not play = no rating. Weekly stats are separate
            from season totals.
          </small>
        </div>
      </div>
      {!current && (
        <output className="weekly-empty">
          No weekly performances published yet. No ratings have been assigned.
        </output>
      )}
      <div className="weekly-team-panels">
        {data.teams
          .filter((t) => team === "all" || t.id === team)
          .map((t) => {
            const players = data.squad.filter((p) => p.teamId === t.id);
            const played = players.filter(
              (p) => current?.players.find((s) => s.playerId === p.id)?.played,
            ).length;
            return (
              <section
                className="panel weekly-team-panel"
                key={t.id}
                aria-label={`${t.name} weekly ratings`}
              >
                <div className="weekly-team-heading">
                  <h3>{t.name}</h3>
                  <span>
                    {current ? `${played} played · Week ${current.week}` : "Awaiting weekly stats"}
                  </span>
                </div>
                <div className="weekly-player-grid">
                  {players.map((p) => {
                    const stats =
                      current?.players.find((s) => s.playerId === p.id) ?? emptyWeeklyStats;
                    const rating = playerRating(stats, p.position);
                    return (
                      <Link
                        key={p.id}
                        href={`/players/${p.id}`}
                        className={`weekly-player-card ${rating === null ? "did-not-play" : ""}`}
                      >
                        <div className="weekly-avatar-wrap">
                          <Avatar player={p} data={data} />
                          {rating !== null && (
                            <strong
                              className={`weekly-rating-badge ${ratingColor(rating)}`}
                              aria-label={`Rating ${rating.toFixed(1)} out of 10`}
                            >
                              {rating.toFixed(1)}
                            </strong>
                          )}
                        </div>
                        <b className="weekly-player-name">
                          <span>{p.number}</span> {p.name}
                        </b>
                        <span className="weekly-player-position">{p.position}</span>
                        {rating === null ? (
                          <small>{current ? "Did not play" : "Not rated"}</small>
                        ) : (
                          <div className="weekly-contributions">
                            <span>{stats.goals} G</span>
                            <span>{stats.assists} A</span>
                            {stats.cleanSheets > 0 && <span>{stats.cleanSheets} CS</span>}
                            {stats.yellowCards > 0 && (
                              <span className="weekly-yellow">{stats.yellowCards} YC</span>
                            )}
                            {stats.redCards > 0 && (
                              <span className="weekly-red">{stats.redCards} RC</span>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </div>
    </section>
  );
}
