import { useState, type Dispatch, type SetStateAction } from "react";
import type { LeagueData } from "../queries/league";
import { emptyWeeklyStats, playerRating, ratingColor } from "../lib/player-rating";

export function WeeklyRatingsAdmin({
  draft,
  setDraft,
}: {
  draft: LeagueData;
  setDraft: Dispatch<SetStateAction<LeagueData | null>>;
}) {
  const [selected, setSelected] = useState(0);
  const [team, setTeam] = useState(draft.teams[0].id);
  const [newWeek, setNewWeek] = useState(
    Math.max(0, ...draft.weeklyRatings.map((w) => w.week)) + 1,
  );
  const [error, setError] = useState("");
  const weeks = [...draft.weeklyRatings].sort((a, b) => b.week - a.week);
  const current = weeks.find((w) => w.week === selected) ?? weeks[0];
  function addWeek() {
    if (
      !Number.isInteger(newWeek) ||
      newWeek < 1 ||
      newWeek > 10000 ||
      weeks.some((w) => w.week === newWeek)
    ) {
      setError("Choose a new whole week number from 1 to 10000.");
      return;
    }
    if (weeks.length >= 500) {
      setError("The 500-week archive limit has been reached.");
      return;
    }
    setDraft((prev) =>
      prev
        ? { ...prev, weeklyRatings: [...prev.weeklyRatings, { week: newWeek, players: [] }] }
        : prev,
    );
    setSelected(newWeek);
    setNewWeek(newWeek + 1);
    setError("");
  }
  function edit(
    playerId: string,
    field: "played" | "goals" | "assists" | "cleanSheets" | "yellowCards" | "redCards",
    value: boolean | number,
  ) {
    if (!current) return;
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            weeklyRatings: prev.weeklyRatings.map((w) => {
              if (w.week !== current.week) return w;
              const old = w.players.find((p) => p.playerId === playerId) ?? {
                ...emptyWeeklyStats,
                playerId,
              };
              const updated =
                field === "played" && value === false
                  ? { ...emptyWeeklyStats, playerId }
                  : { ...old, [field]: value };
              return {
                ...w,
                players: [...w.players.filter((p) => p.playerId !== playerId), updated],
              };
            }),
          }
        : prev,
    );
  }
  return (
    <div className="panel edit-panel weekly-admin">
      <h3>Weekly player ratings</h3>
      <p className="muted">
        Mark who played this week, then enter their weekly goals, assists, clean sheets and cards.
        Ratings calculate automatically. Season totals are not changed. Use Save & publish to make
        these records public.
      </p>
      <div className="weekly-admin-controls">
        <label>
          Week
          <select
            aria-label="Edit ratings week"
            value={current?.week ?? ""}
            disabled={!weeks.length}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            {!weeks.length && <option value="">Add your first week</option>}
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
            aria-label="Weekly ratings team"
            value={team}
            onChange={(e) => setTeam(e.target.value)}
          >
            {draft.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          New week number
          <input
            aria-label="New ratings week number"
            type="number"
            min={1}
            max={10000}
            step={1}
            value={newWeek}
            onChange={(e) => setNewWeek(Number(e.target.value))}
          />
        </label>
        <button className="button" type="button" onClick={addWeek}>
          Add week
        </button>
      </div>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <p className="small muted">
        6.0 base · Goal +1.5 · Assist +0.9 · Clean sheet: DEF +1.5 / MID +1.2 / Wingers, strikers &
        GK +1.0 · Yellow −0.5 · Red = 0.0 · Limited to 0–10. Unchecking played clears that player’s
        weekly entries.
      </p>
      {current ? (
        <div className="weekly-admin-list">
          {draft.squad
            .filter((p) => p.teamId === team)
            .map((p) => {
              const stats = current.players.find((s) => s.playerId === p.id) ?? emptyWeeklyStats;
              const rating = playerRating(stats, p.position);
              return (
                <div className="weekly-admin-row" key={p.id}>
                  <div className="weekly-admin-player">
                    <b>
                      {p.number}. {p.name}
                    </b>
                    <span className={`weekly-rating-preview ${ratingColor(rating)}`}>
                      {rating === null ? "Not rated" : rating.toFixed(1)}
                    </span>
                  </div>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      aria-label={`${p.name} played`}
                      checked={stats.played}
                      onChange={(e) => edit(p.id, "played", e.target.checked)}
                    />
                    Played in Week {current.week}
                  </label>
                  {
                    <label>
                      Clean sheets
                      <input
                        aria-label={`${p.name} weekly clean sheets`}
                        type="number"
                        min={0}
                        max={1000}
                        step={1}
                        required
                        disabled={!stats.played}
                        value={stats.cleanSheets}
                        onChange={(e) =>
                          edit(p.id, "cleanSheets", Math.max(0, Number(e.target.value)))
                        }
                      />
                    </label>
                  }
                  <div className="form-grid">
                    {(
                      [
                        ["goals", "Goals"],
                        ["assists", "Assists"],
                        ["yellowCards", "Yellow cards"],
                        ["redCards", "Red cards"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          aria-label={`${p.name} weekly ${label.toLowerCase()}`}
                          type="number"
                          min={0}
                          max={1000}
                          step={1}
                          required
                          disabled={!stats.played}
                          value={stats[key]}
                          onChange={(e) => edit(p.id, key, Math.max(0, Number(e.target.value)))}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <p className="weekly-empty">
          Add a week to record performances. All players start without a rating until marked as
          played.
        </p>
      )}
    </div>
  );
}
