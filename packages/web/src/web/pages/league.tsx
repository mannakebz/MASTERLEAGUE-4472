import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  Trophy,
  CalendarDays,
  Users,
  ArrowLeftRight,
  Radio,
  Clock3,
  ChevronRight,
  Goal,
} from "lucide-react";
import { useLeague, type LeagueData } from "../queries/league";
import {
  Crest,
  money,
  dateLabel,
  SectionHead,
  PageHead,
  Empty,
  Standings,
  FixtureList,
  NewsList,
  PhotoContext,
} from "../components/league-ui";
import { Squad } from "../components/player-ui";
import { PlayerValues } from "../components/player-values";
import { PlayerRatings } from "../components/player-ratings";
import { StatsPage, PlayerPage, TotwPage } from "./stats";

function Overview({ data }: { data: LeagueData }) {
  const matches = data.fixtures.filter((f) => f.status === "Completed").length;
  const goals = data.teams.reduce((n, t) => n + t.gf, 0);
  const breaking = data.news.find((n) => n.breaking);
  return (
    <>
      <div className="breaking-bar">
        <span className="breaking-tag">
          <Radio size={14} />
          BREAKING
        </span>
        {breaking ? (
          <Link href={`/news/${breaking.id}`}>{breaking.title}</Link>
        ) : (
          <span>Welcome to Master League. A new season. A fresh start. All eyes on the pitch.</span>
        )}
        <Link href="/news?category=breaking" className="breaking-more">
          News centre
          <ChevronRight size={15} />
        </Link>
      </div>
      <section className="hero">
        <div className="hero-text">
          <div className="hero-kicker">
            <span />
            THE OFFICIAL MASTER LEAGUE HUB
          </div>
          <h1>
            Four teams.
            <br />
            One <span>glory.</span>
          </h1>
          <p>
            The rivalries. The passion. The beautiful game.
            <br />
            Follow every moment of Master League, right here.
          </p>
          <div className="hero-actions">
            <Link href="/fixtures" className="button orange">
              <CalendarDays size={16} />
              Explore fixtures
              <ArrowRight size={16} />
            </Link>
            <Link href="/teams" className="hero-team-link">
              Meet the teams
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
        <div className="season-card">
          <div className="season-card-top">
            <Trophy size={19} />
            <span>LEAGUE AT A GLANCE</span>
          </div>
          <div className="season-status">
            <span className="status-dot" />
            {matches ? "SEASON IN PROGRESS" : "READY FOR KICK-OFF"}
          </div>
          <div className="season-numbers">
            <div>
              <strong>04</strong>
              <span>Competing teams</span>
            </div>
            <div>
              <strong>{String(matches).padStart(2, "0")}</strong>
              <span>Matches played</span>
            </div>
          </div>
          <div className="season-bottom">
            <span>{matches ? "Every moment counts." : "Every team starts on equal ground."}</span>
            <ArrowUpRight size={18} />
          </div>
        </div>
        <div className="hero-caption">
          <span className="hero-line" />
          OUR GAME. OUR LEAGUE. OUR TIME.
        </div>
      </section>
      <section className="team-strip">
        <span className="strip-label">
          THE
          <br />
          <b>CONTENDERS</b>
        </span>
        {data.teams.map((t) => (
          <Link href={`/teams/${t.id}`} key={t.id}>
            <Crest team={t} />
            <div>
              <b>{t.name}</b>
              <span>
                Team profile
                <ArrowUpRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </section>
      <div className="overview-grid">
        <section className="panel standings-panel">
          <SectionHead
            eyebrow="THE RACE TO THE TOP"
            title="LEAGUE STANDINGS"
            link="Full table"
            href="/standings"
          />
          <Standings teams={data.teams} />
          <div className="table-note">
            <span className="orange-dot" />
            {matches
              ? "Ranked by points, goal difference, then goals scored."
              : "A clean slate. All teams start with 0 points."}
            <span>PTS · Points</span>
          </div>
        </section>
        <section className="panel fixture-panel">
          <SectionHead eyebrow="ON THE HORIZON" title="NEXT UP" />
          <FixtureList data={data} limit={1} />
          <Link href="/fixtures" className="panel-bottom-link">
            View all fixtures
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <section className="league-stats">
        <div>
          <Goal size={21} />
          <strong>{goals}</strong>
          <span>Goals scored</span>
        </div>
        <div>
          <Users size={21} />
          <strong>{data.teams.reduce((n, t) => n + t.players, 0)}</strong>
          <span>Registered players</span>
        </div>
        <div>
          <ArrowLeftRight size={21} />
          <strong>{data.transfers.filter((t) => t.status === "Confirmed").length}</strong>
          <span>Completed transfers</span>
        </div>
        <div>
          <span className="sle-icon">Le</span>
          <strong>
            {money(
              data.transfers.filter((t) => t.status === "Confirmed").reduce((n, t) => n + t.fee, 0),
            )}
          </strong>
          <span>Total transfer spend</span>
        </div>
      </section>
      <div className="news-transfer-grid">
        <section className="panel">
          <SectionHead
            eyebrow="FROM AROUND THE LEAGUE"
            title="THE LATEST"
            link="All news"
            href="/news"
          />
          <NewsList data={data} limit={3} />
        </section>
        <section className="transfer-promo">
          <div className="eyebrow">THE BUSINESS OF FOOTBALL</div>
          <ArrowLeftRight size={34} strokeWidth={1.3} />
          <h2>
            New moves.
            <br />
            New possibilities.
          </h2>
          <p>
            Every signing. Every switch.
            <br />
            Your league's transfer activity in one place.
          </p>
          <div className="transfer-promo-total">
            <span>TOTAL TRANSFER VALUE</span>
            <strong>
              {money(
                data.transfers
                  .filter((t) => t.status === "Confirmed")
                  .reduce((n, t) => n + t.fee, 0),
              )}
            </strong>
          </div>
          <Link href="/transfers">
            Visit transfer centre
            <ArrowRight size={17} />
          </Link>
        </section>
      </div>
      <PlayerRatings data={data} />
      <PlayerValues data={data} />
      <div className="performance-promos">
        <Link href="/stats">
          <div className="eyebrow">PLAYER & TEAM STATS</div>
          <h2>Every contribution counts.</h2>
          <p>Top scorers · Top assisters · Goals + assists</p>
          <span>
            Explore performance centre <ArrowRight size={16} />
          </span>
        </Link>
        <Link href="/totw">
          <div className="eyebrow">TEAM OF THE WEEK</div>
          <h2>The standout XI.</h2>
          <p>
            {data.totw.published
              ? `Official selection · Week ${data.totw.week}`
              : "Awaiting the first official team selection"}
          </p>
          <span>
            View TOTW <ArrowRight size={16} />
          </span>
        </Link>
      </div>
    </>
  );
}
function TeamsPage({ data, id }: { data: LeagueData; id?: string }) {
  const team = data.teams.find((t) => t.id === id);
  if (id && !team)
    return (
      <Empty
        type="teams"
        title="Team not found"
        text="Choose one of the four teams from the Teams page."
      />
    );
  if (team)
    return (
      <>
        <Link href="/teams" className="text-link">
          ← All teams
        </Link>
        <div className="team-profile">
          <Crest team={team} large />
          <div>
            <div className="eyebrow">MASTER LEAGUE CONTENDER</div>
            <h1>{team.name}</h1>
            <p>{team.bio || "One of four teams competing for Master League glory."}</p>
          </div>
        </div>
        <div className="profile-stats">
          {[
            ["Points", team.points],
            ["Played", team.played],
            ["Wins", team.wins],
            ["Draws", team.draws],
            ["Losses", team.losses],
            ["Goals scored", team.gf],
            ["Squad players", data.squad.filter((p) => p.teamId === team.id).length],
            ["Team budget", money(team.budget)],
          ].map(([l, v]) => (
            <div key={l}>
              <span>{l}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
        <div className="section-head squad-section-head">
          <div>
            <div className="eyebrow">THE PLAYERS BEHIND THE BADGE</div>
            <h2>THE 15-PLAYER SQUAD</h2>
          </div>
          <Link href="/stats" className="text-link">
            Player stats →
          </Link>
        </div>
        {data.squad.some((p) => p.teamId === team.id && p.sample) && (
          <p className="sample-note">
            Generated player names are editable samples. The admin can replace names, add photos and
            update all statistics.
          </p>
        )}
        <Squad data={data} teamId={team.id} />
        <PlayerValues data={data} teamId={team.id} />
        <div className="panel">
          <SectionHead title="TEAM FIXTURES" />
          <FixtureList
            data={{
              ...data,
              fixtures: data.fixtures.filter((f) => f.home === id || f.away === id),
            }}
          />
        </div>
      </>
    );
  return (
    <>
      <PageHead
        tag="THE CONTENDERS"
        title="FOUR TEAMS. ONE AMBITION."
        description="Meet the clubs writing the next chapter of Master League."
      />
      <div className="teams-grid">
        {data.teams.map((t, i) => (
          <Link
            href={`/teams/${t.id}`}
            key={t.id}
            className="team-card"
            style={{ "--team-color": t.color } as React.CSSProperties}
          >
            <span className="team-number">0{i + 1}</span>
            <Crest team={t} large />
            <div className="eyebrow">MASTER LEAGUE</div>
            <h2>{t.name}</h2>
            <div className="team-card-stats">
              <div>
                <b>{t.points}</b>
                <span>Points</span>
              </div>
              <div>
                <b>{data.squad.filter((p) => p.teamId === t.id).length}</b>
                <span>Squad</span>
              </div>
              <div>
                <b>{money(t.budget)}</b>
                <span>Budget</span>
              </div>
            </div>
            <div className="team-card-link">
              Explore team
              <ArrowUpRight size={17} />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
function NewsPage({ data, id }: { data: LeagueData; id?: string }) {
  const [category, setCategory] = useState(
    window.location.search.includes("breaking") ? "Breaking news" : "All news",
  );
  const item = data.news.find((n) => n.id === id);
  if (id)
    return item ? (
      <article className="article">
        <Link href="/news" className="text-link">
          ← Back to news
        </Link>
        <span className="tag">{item.breaking ? "Breaking news" : item.category}</span>
        <h1>{item.title}</h1>
        <p className="article-meta">
          <Clock3 size={14} />
          {dateLabel(item.date)} · Master League
        </p>
        <div className="article-body">{item.body}</div>
        {item.photo && data.photoUrls[item.photo] && (
          <img className="article-photo" src={data.photoUrls[item.photo]} alt={item.title} />
        )}
      </article>
    ) : (
      <Empty
        title="Article not found"
        text="This story is no longer available. Visit the news centre for the latest."
      />
    );
  const filtered = data.news.filter(
    (n) =>
      category === "All news" ||
      (category === "Breaking news"
        ? n.breaking || n.category === category
        : n.category === category),
  );
  return (
    <>
      <PageHead
        tag="THE NEWSROOM"
        title="BEYOND THE FINAL WHISTLE."
        description="Official league updates, team stories and breaking news. Straight from Master League."
      />
      <div className="tabs">
        {["All news", "League news", "Team news", "Transfers", "Breaking news"].map((c) => (
          <button
            key={c}
            className={category === c ? "selected" : ""}
            onClick={() => setCategory(c)}
          >
            {c}
            {c === "Breaking news" && <span className="red-dot" />}
          </button>
        ))}
      </div>
      <div className="panel">
        <NewsList data={{ ...data, news: filtered }} />
      </div>
    </>
  );
}
function FixturesPage({ data }: { data: LeagueData }) {
  const [tab, setTab] = useState("Upcoming");
  return (
    <>
      <PageHead
        tag="MATCH CENTRE"
        title="EVERY MATCH. EVERY MOMENT."
        description="Your complete guide to upcoming fixtures and results from around the league."
      />
      <div className="tabs">
        {["Upcoming", "Completed", "All matches"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={t === tab ? "selected" : ""}>
            {t}
          </button>
        ))}
      </div>
      <div className="panel">
        <FixtureList
          data={{
            ...data,
            fixtures: data.fixtures.filter((f) => tab === "All matches" || f.status === tab),
          }}
        />
      </div>
      <p className="muted footnote">
        Standings are updated manually by the league administrator after matches.
      </p>
    </>
  );
}
function TransfersPage({ data }: { data: LeagueData }) {
  const [filter, setFilter] = useState("All activity");
  const confirmed = data.transfers.filter((t) => t.status === "Confirmed");
  const list = data.transfers.filter((t) => filter === "All activity" || t.status === filter);
  return (
    <>
      <PageHead
        tag="TRANSFER CENTRE"
        title="THE NEXT BIG MOVE."
        description="Follow confirmed signings and transfer rumours. All fees shown in Sierra Leone leones."
      />
      <div className="profile-stats transfer-stats">
        <div>
          <span>Confirmed transfers</span>
          <strong>{confirmed.length}</strong>
        </div>
        <div>
          <span>Total spend</span>
          <strong>{money(confirmed.reduce((s, t) => s + t.fee, 0))}</strong>
        </div>
        <div>
          <span>Transfer rumours</span>
          <strong>{data.transfers.filter((t) => t.status === "Rumour").length}</strong>
        </div>
      </div>
      <div className="tabs">
        {["All activity", "Confirmed", "Rumour"].map((t) => (
          <button key={t} onClick={() => setFilter(t)} className={filter === t ? "selected" : ""}>
            {t}
          </button>
        ))}
      </div>
      <section className="panel">
        {list.length ? (
          <div className="table-scroll">
            <table className="transfers-table">
              <thead>
                <tr>
                  <th>PLAYER</th>
                  <th>FROM</th>
                  <th>TO</th>
                  <th>FEE (LEONES)</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <b>{t.player}</b>
                    </td>
                    <td>
                      {data.teams.find((team) => team.id === t.from)?.name ||
                        t.from ||
                        "Free agent"}
                    </td>
                    <td>{data.teams.find((team) => team.id === t.to)?.name}</td>
                    <td>{money(t.fee)}</td>
                    <td>
                      <span className="pill">{t.status}</span>
                    </td>
                    <td>{dateLabel(t.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No moves. Yet."
            text="When the first transfer is announced, you'll find the player, clubs and fee right here."
          />
        )}
      </section>
      <PlayerValues data={data} />
    </>
  );
}
export default function LeaguePage() {
  const { data, isLoading, error, refetch } = useLeague();
  const [path] = useLocation();
  if (isLoading)
    return (
      <div className="container loading-page">
        <div className="loader" />
        <p>Getting the league ready…</p>
      </div>
    );
  if (!data)
    return (
      <div className="container loading-page">
        <h2>Unable to load the league</h2>
        <p>Check your connection and try again.</p>
        <button className="button orange" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  let content;
  if (path === "/stats") content = <StatsPage data={data} />;
  else if (path === "/totw") content = <TotwPage data={data} />;
  else if (path.startsWith("/players/"))
    content = <PlayerPage data={data} id={path.split("/")[2]} />;
  else if (path.startsWith("/teams")) content = <TeamsPage data={data} id={path.split("/")[2]} />;
  else if (path === "/standings")
    content = (
      <>
        <PageHead
          tag="THE RACE TO THE TOP"
          title="THE LEAGUE TABLE."
          description="Four contenders. Every point matters. Follow the standings throughout the season."
        />
        <div className="panel">
          <Standings teams={data.teams} full />
          <div className="table-note">
            P · Played &nbsp; W · Wins &nbsp; D · Draws &nbsp; L · Losses &nbsp; GD · Goal
            difference &nbsp; PTS · Points
          </div>
        </div>
        <div className="standings-info">
          <Trophy size={22} />
          <div>
            <h3>It all starts here.</h3>
            <p>
              Teams are ranked by points, then goal difference, then goals scored. Teams level on
              all three share equal standing.
            </p>
          </div>
        </div>
      </>
    );
  else if (path === "/fixtures") content = <FixturesPage data={data} />;
  else if (path.startsWith("/news")) content = <NewsPage data={data} id={path.split("/")[2]} />;
  else if (path === "/transfers") content = <TransfersPage data={data} />;
  else if (path === "/") content = <Overview data={data} />;
  else
    content = (
      <>
        <PageHead tag="404" title="OFF THE PITCH." description="That page doesn't exist." />
        <Link href="/" className="button orange">
          Back to overview
        </Link>
      </>
    );
  return (
    <PhotoContext.Provider value={data.photoUrls}>
      <div className={`container page-content ${path === "/" ? "home-content" : ""}`}>
        {error && (
          <output className="stale-warning">
            Showing the last loaded league data.{" "}
            <button onClick={() => refetch()}>Retry updates</button>
          </output>
        )}
        {content}
      </div>
    </PhotoContext.Provider>
  );
}
