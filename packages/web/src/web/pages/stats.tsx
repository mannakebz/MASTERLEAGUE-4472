import { useState } from "react";
import { Link } from "wouter";
import type { LeagueData } from "../queries/league";
import { PageHead, SectionHead, Empty, money } from "../components/league-ui";
import { Avatar, Pitch } from "../components/player-ui";
import { CardStats } from "../components/card-stats";
export function StatsPage({ data }: { data: LeagueData }) {
  const [tab, setTab] = useState("Top scorers");
  const [team, setTeam] = useState("all");
  const metric = (p: LeagueData["squad"][number]) =>
    tab === "Yellow cards"
      ? p.yellowCards
      : tab === "Red cards"
        ? p.redCards
        : tab === "Top scorers"
          ? p.goals
          : tab === "Top assisters"
            ? p.assists
            : p.goals + p.assists;
  const players = data.squad
    .filter((p) => team === "all" || p.teamId === team)
    .sort((a, b) => metric(b) - metric(a) || a.name.localeCompare(b.name));
  return (
    <>
      <PageHead
        tag="THE NUMBERS BEHIND THE GAME"
        title="THE PERFORMANCE CENTRE."
        description="Top scorers, top assisters and total goal contributions. Every performance statistic starts at zero."
      />
      <div className="stats-controls">
        <div className="tabs">
          {["Top scorers", "Top assisters", "G/A", "Yellow cards", "Red cards", "Team stats"].map(
            (t) => (
              <button key={t} className={tab === t ? "selected" : ""} onClick={() => setTab(t)}>
                {t}
              </button>
            ),
          )}
        </div>
        {tab !== "Team stats" && (
          <select
            aria-label="Filter by team"
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
        )}
      </div>
      <section className="panel">
        <SectionHead title={tab.toUpperCase()} />
        <div className="table-scroll">
          <table className="performance-table">
            <thead>
              {tab === "Team stats" ? (
                <tr>
                  <th>TEAM</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>GD</th>
                  <th>PTS</th>
                  <th>SQUAD</th>
                  <th>YC</th>
                  <th>RC</th>
                </tr>
              ) : (
                <tr>
                  <th>#</th>
                  <th>PLAYER</th>
                  <th>TEAM</th>
                  <th>APP</th>
                  <th>GOALS</th>
                  <th>ASSISTS</th>
                  <th>G/A</th>
                  <th>YC</th>
                  <th>RC</th>
                </tr>
              )}
            </thead>
            <tbody>
              {tab === "Team stats"
                ? data.teams.map((t) => (
                    <tr key={t.id}>
                      <td aria-label={t.name}>
                        <Link href={`/teams/${t.id}`}>
                          <b>{t.name}</b>
                        </Link>
                      </td>
                      <td>{t.played}</td>
                      <td>{t.wins}</td>
                      <td>{t.draws}</td>
                      <td>{t.losses}</td>
                      <td>{t.gf}</td>
                      <td>{t.ga}</td>
                      <td>{t.gf - t.ga}</td>
                      <td>{t.points}</td>
                      <td>{data.squad.filter((p) => p.teamId === t.id).length}</td>
                      <td>
                        {data.squad
                          .filter((p) => p.teamId === t.id)
                          .reduce((sum, p) => sum + p.yellowCards, 0)}
                      </td>
                      <td>
                        {data.squad
                          .filter((p) => p.teamId === t.id)
                          .reduce((sum, p) => sum + p.redCards, 0)}
                      </td>
                    </tr>
                  ))
                : players.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {metric(p) === 0
                          ? "—"
                          : players.findIndex((q) => metric(q) === metric(p)) + 1}
                      </td>
                      <td>
                        <Link className="player-table-name" href={`/players/${p.id}`}>
                          <Avatar player={p} data={data} />
                          <div>
                            <b>{p.name}</b>
                            <span>
                              {p.position}
                              {p.sample ? " · Sample name" : ""}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td>{data.teams.find((t) => t.id === p.teamId)?.name}</td>
                      <td>{p.appearances}</td>
                      <td className={tab === "Top scorers" ? "metric-active" : ""}>{p.goals}</td>
                      <td className={tab === "Top assisters" ? "metric-active" : ""}>
                        {p.assists}
                      </td>
                      <td className={tab === "G/A" ? "metric-active" : ""}>
                        {p.goals + p.assists}
                      </td>
                      <td className={tab === "Yellow cards" ? "metric-active" : ""}>
                        <span className="card-cell">
                          <i className="yellow-card" />
                          {p.yellowCards}
                        </span>
                      </td>
                      <td className={tab === "Red cards" ? "metric-active" : ""}>{p.redCards}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        <div className="table-note">
          G/A = goals + assists. No leading player is declared while all totals are zero. Generated
          names are editable samples, not confirmed squad registrations. YC · Yellow cards. RC · Red
          cards. Disciplinary tabs sort by card totals.
        </div>
      </section>
    </>
  );
}
export function PlayerPage({ data, id }: { data: LeagueData; id?: string }) {
  const p = data.squad.find((p) => p.id === id);
  if (!p)
    return (
      <Empty
        title="Player not found"
        text="Choose a player from a team squad or the performance centre."
      />
    );
  const t = data.teams.find((t) => t.id === p.teamId)!;
  return (
    <>
      <Link href={`/teams/${t.id}`} className="text-link">
        ← {t.name} squad
      </Link>
      <div className="player-profile">
        <Avatar player={p} data={data} large />
        <div>
          <div className="eyebrow">
            {t.name.toUpperCase()} · {p.position} · #{p.number}
          </div>
          <h1>{p.name}</h1>
          {p.sample && <span className="sample-label">EDITABLE SAMPLE PLAYER</span>}
          <p>{p.bio || "Player biography will be added by the league administrator."}</p>
          <CardStats yellow={p.yellowCards} red={p.redCards} />
          <div className="player-value-badge">
            <span>Transfer value</span>
            <strong>{money(p.transferValue)}</strong>
          </div>
        </div>
      </div>
      <div className="profile-stats">
        {[
          ["Appearances", p.appearances],
          ["Goals", p.goals],
          ["Assists", p.assists],
          ["G/A", p.goals + p.assists],
          ["Clean sheets", p.cleanSheets],
          ["Yellow cards", p.yellowCards],
          ["Red cards", p.redCards],
          ["Shirt number", p.number],
        ].map(([l, v]) => (
          <div key={l}>
            <span>{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <p className="muted footnote">
        Performance statistics are manually maintained by the admin. G/A is calculated from goals
        and assists.
      </p>
    </>
  );
}
export function TotwPage({ data }: { data: LeagueData }) {
  return (
    <>
      <PageHead
        tag="TEAM OF THE WEEK"
        title="THE WEEK'S STANDOUT XI."
        description="Eleven players. Four clubs. Selected manually by the Master League administrator."
      />
      <div className="totw-layout">
        <Pitch data={data} />
        <aside className="panel totw-info">
          <div className="eyebrow">MASTER LEAGUE · TOTW</div>
          <h2>{data.totw.published ? `Week ${data.totw.week}` : "Awaiting the first XI."}</h2>
          <div className="totw-formation">{data.totw.formation}</div>
          <p>
            {data.totw.published
              ? "The official team of the week. Select any player on the pitch to see their profile."
              : "The admin has not published a team of the week yet. The pitch stays unselected until an official XI is announced."}
          </p>
          {data.totw.published && (
            <p>
              Badges show player ratings for Week {data.totw.week}, using the same formula as
              Overview. Players without a recorded appearance for this week are not rated.
            </p>
          )}
          <div className="totw-info-bottom">
            <span>{data.totw.published ? "OFFICIAL SELECTION" : "NOT YET PUBLISHED"}</span>
            <Link href="/stats" className="text-link">
              Explore player stats →
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
