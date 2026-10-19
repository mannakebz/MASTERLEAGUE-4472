import { useState } from "react";
import type { LeagueData } from "../queries/league";
import { PhotoUpload } from "./photo-upload";
import { formations } from "./player-ui";
type Props = { draft: LeagueData; setDraft: (data: LeagueData) => void };
export function SquadAdmin({ draft, setDraft }: Props) {
  const [team, setTeam] = useState(draft.teams[0].id);
  function edit(id: string, field: string, value: unknown) {
    setDraft({
      ...draft,
      squad: draft.squad.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    });
  }
  return (
    <>
      <div className="squad-admin-head">
        <label>
          Choose a team
          <select aria-label="Squad team" value={team} onChange={(e) => setTeam(e.target.value)}>
            {draft.teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · 15 players
              </option>
            ))}
          </select>
        </label>
        <p>
          Rename the generated players, add photos and enter their real statistics. Uncheck “sample
          player” when a real player is registered.
        </p>
      </div>
      <div className="admin-forms">
        {draft.squad
          .filter((p) => p.teamId === team)
          .map((p) => (
            <div key={p.id} className="panel edit-panel">
              <h3>
                #{p.number} · {p.name}
              </h3>
              <PhotoUpload
                label={`Photo for ${p.name}`}
                value={p.photo}
                url={draft.photoUrls[p.photo]}
                onChange={(key) => edit(p.id, "photo", key)}
              />
              <div className="form-grid">
                <label>
                  Player name
                  <input
                    aria-label="Player name"
                    required
                    maxLength={100}
                    value={p.name}
                    onChange={(e) => edit(p.id, "name", e.target.value)}
                  />
                </label>
                <label>
                  Position
                  <select
                    aria-label="Position"
                    value={p.position}
                    onChange={(e) => edit(p.id, "position", e.target.value)}
                  >
                    {["GK", "DEF", "MID", "FWD"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Shirt number
                  <input
                    aria-label="Shirt number"
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={p.number}
                    onChange={(e) => edit(p.id, "number", Number(e.target.value))}
                  />
                </label>
                {(
                  [
                    "appearances",
                    "goals",
                    "assists",
                    "cleanSheets",
                    "yellowCards",
                    "redCards",
                  ] as const
                ).map((field) => (
                  <label key={field}>
                    {field.replace(/([A-Z])/g, " $1")}
                    <input
                      aria-label={field}
                      type="number"
                      min={0}
                      required
                      value={p[field]}
                      onChange={(e) => edit(p.id, field, Math.max(0, Number(e.target.value)))}
                    />
                  </label>
                ))}
                <label>
                  Transfer value (SLE)
                  <input
                    aria-label="Transfer value (SLE)"
                    type="number"
                    min={0}
                    max={1000000000}
                    step={1}
                    required
                    value={p.transferValue}
                    onChange={(e) =>
                      edit(p.id, "transferValue", Math.max(0, Number(e.target.value)))
                    }
                  />
                </label>
              </div>
              <div className="derived-stat">
                G/A <strong>{p.goals + p.assists}</strong>
                <span>Calculated automatically</span>
              </div>
              <label>
                Biography
                <textarea
                  aria-label="Player biography"
                  maxLength={2000}
                  rows={3}
                  value={p.bio}
                  onChange={(e) => edit(p.id, "bio", e.target.value)}
                />
              </label>
              <label className="checkbox-label">
                <input
                  aria-label="Sample player"
                  type="checkbox"
                  checked={p.sample}
                  onChange={(e) => edit(p.id, "sample", e.target.checked)}
                />
                This is still a sample player
              </label>
            </div>
          ))}
      </div>
    </>
  );
}
export function TotwAdmin({ draft, setDraft }: Props) {
  const t = draft.totw;
  const positions = formations[t.formation].flatMap((count, row) =>
    Array.from(
      { length: count },
      (_, i) =>
        `${row === 3 ? "Goalkeeper" : row === 2 ? "Defender" : row === 1 ? "Midfielder" : "Forward"} ${i + 1}`,
    ),
  );
  function edit(field: string, value: unknown) {
    setDraft({ ...draft, totw: { ...t, [field]: value } });
  }
  return (
    <div className="panel edit-panel">
      <h3>Team of the Week · manual selection</h3>
      <p className="muted footnote">
        Select 11 different players. Publishing requires a week number above zero and a full XI.
        Match their positions to your chosen formation.
      </p>
      <div className="form-grid">
        <label>
          Week number
          <input
            aria-label="TOTW week"
            type="number"
            min={0}
            required
            value={t.week}
            onChange={(e) => edit("week", Math.max(0, Number(e.target.value)))}
          />
        </label>
        <label>
          Formation
          <select
            aria-label="TOTW formation"
            value={t.formation}
            onChange={(e) => {
              setDraft({
                ...draft,
                totw: {
                  ...t,
                  formation: e.target.value as typeof t.formation,
                  playerIds: Array(11).fill(""),
                  published: false,
                },
              });
            }}
          >
            {Object.keys(formations).map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="totw-select-grid">
        {positions.map((label, i) => (
          <label key={`${t.formation}-${i}`}>
            {label}
            <select
              aria-label={label}
              value={t.playerIds[i]}
              onChange={(e) =>
                edit(
                  "playerIds",
                  t.playerIds.map((id, j) => (i === j ? e.target.value : id)),
                )
              }
            >
              <option value="">Select player</option>
              {draft.teams.map((team) => (
                <optgroup key={team.id} label={team.name}>
                  {draft.squad
                    .filter((p) => p.teamId === team.id)
                    .map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={t.playerIds.includes(p.id) && t.playerIds[i] !== p.id}
                      >
                        {p.name} · {p.position}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className="checkbox-label">
        <input
          aria-label="Publish TOTW"
          type="checkbox"
          checked={t.published}
          onChange={(e) => edit("published", e.target.checked)}
        />
        Publish this XI when saving
      </label>
      <p className="muted small">
        Changing the formation clears the selection so players can be positioned correctly.
      </p>
    </div>
  );
}
