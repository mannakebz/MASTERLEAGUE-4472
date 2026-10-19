import { Link } from "wouter";
import type { LeagueData } from "../queries/league";
import { money, Crest } from "./league-ui";
import { Avatar } from "./player-ui";

export function PlayerValues({ data, teamId }: { data: LeagueData; teamId?: string }) {
  const teams = data.teams.filter((team) => !teamId || team.id === teamId);
  return (
    <section className="player-values-section" aria-label="Player transfer values">
      <div className="section-head">
        <div>
          <div className="eyebrow">SQUAD VALUATIONS · SLE</div>
          <h2>Player transfer values</h2>
        </div>
      </div>
      <p className="valuation-note">
        Values are set by the league administrator, not actual transfer fees. Unassigned values
        start at SLE 0.
      </p>
      <div className="player-values-grid">
        {teams.map((team) => {
          const players = data.squad
            .filter((p) => p.teamId === team.id)
            .sort((a, b) => b.transferValue - a.transferValue || a.number - b.number);
          return (
            <article className="panel team-values-panel" key={team.id}>
              <div className="team-values-heading">
                <Crest team={team} />
                <div>
                  <h3>{team.name}</h3>
                  <span>{players.length} players</span>
                </div>
                <div className="team-value-total">
                  <small>Squad value</small>
                  <b>{money(players.reduce((sum, p) => sum + p.transferValue, 0))}</b>
                </div>
              </div>
              <section className="table-scroll" aria-label={`${team.name} player transfer values`}>
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Position</th>
                      <th>Transfer value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link className="player-table-name" href={`/players/${p.id}`}>
                            <Avatar player={p} data={data} />
                            <div>
                              <b>{p.name}</b>
                              <span>
                                #{p.number}
                                {p.sample ? " · Sample player" : ""}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td>{p.position}</td>
                        <td className="value-cell">{money(p.transferValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </article>
          );
        })}
      </div>
    </section>
  );
}
