import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  Shield,
  Menu,
  X,
  ArrowUpRight,
  Trophy,
  CalendarDays,
  Newspaper,
  Sun,
  Moon,
} from "lucide-react";
import type { Team, LeagueData } from "../queries/league";
import { NotificationCentre } from "./notification-bell";

const navigation = [
  ["/", "Overview"],
  ["/teams", "Teams"],
  ["/standings", "Standings"],
  ["/fixtures", "Fixtures & results"],
  ["/news", "News"],
  ["/transfers", "Transfers"],
  ["/stats", "Stats"],
  ["/totw", "TOTW"],
];
const themeKey = "master-league-theme";
function savedTheme(): "light" | "dark" {
  try {
    return window.localStorage.getItem(themeKey) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
export function displayTitle(title: string) {
  if (title !== title.toUpperCase()) return title;
  return title
    .toLowerCase()
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, char) => prefix + char.toUpperCase())
    .replace(/\btotw\b/g, "TOTW")
    .replace(/\bxi\b/g, "XI");
}
export const PhotoContext = createContext<Record<string, string>>({});
export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(savedTheme);
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const sync = () => setTheme(savedTheme());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function switchTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      window.localStorage.setItem(themeKey, next);
    } catch {
      // The toggle still works for this page when storage is unavailable.
    }
  }
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [location]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeMenu = () => setOpen(false);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("league-notifications-open", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("league-notifications-open", closeMenu);
    };
  }, []);
  return (
    <>
      <div className="topline">
        <div className="container">
          <span>FOUR TEAMS. ONE LEAGUE.</span>
          <span>
            THE HOME OF MASTER LEAGUE <span className="top-dot" />
          </span>
        </div>
      </div>
      <header ref={headerRef}>
        <div className="container header-inner">
          <Link href="/" className="brand">
            <img src="/images/master-league-logo.png" alt="Master League logo" />
          </Link>
          <nav
            id="primary-navigation"
            aria-label="Main navigation"
            className={open ? "is-open" : ""}
          >
            {navigation.map(([path, label]) => (
              <Link
                key={path}
                href={path}
                onClick={() => setOpen(false)}
                className={location === path ? "active" : ""}
                aria-current={location === path ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
          <NotificationCentre />
          <button
            type="button"
            className="theme-toggle"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-pressed={theme === "dark"}
            onClick={switchTheme}
          >
            {theme === "dark" ? (
              <Sun size={19} aria-hidden="true" />
            ) : (
              <Moon size={19} aria-hidden="true" />
            )}
          </button>
          <Link href="/admin" className="admin-link">
            <Shield size={15} />
            Admin access
            <ArrowUpRight size={14} />
          </Link>
          <button
            className="menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={open}
            aria-controls="primary-navigation"
            onClick={() => {
              setOpen(!open);
              window.dispatchEvent(new Event("league-navigation-open"));
            }}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer>
        <div className="container footer-top">
          <div>
            <div className="footer-wordmark">
              MASTER<span>LEAGUE</span>
              <span className="orange-dot" />
            </div>
            <p>Four teams. One ambition. Our league.</p>
          </div>
          <div className="footer-links">
            <Link href="/teams">The teams</Link>
            <Link href="/fixtures">Match centre</Link>
            <Link href="/news">Latest news</Link>
            <Link href="/admin">Administration</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Master League. All rights reserved.</span>
          <span>All monetary values in Sierra Leone leones (SLE).</span>
        </div>
      </footer>
    </>
  );
}
export function Crest({ team, large = false }: { team: Team; large?: boolean }) {
  const photos = useContext(PhotoContext);
  const [failed, setFailed] = useState("");
  if (team.photo && photos[team.photo] && failed !== photos[team.photo])
    return (
      <div className={`crest ${large ? "large" : ""} uploaded-crest`}>
        <img
          src={photos[team.photo]}
          alt={`${team.name} crest`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(photos[team.photo])}
        />
      </div>
    );
  return (
    <div
      className={`crest ${large ? "large" : ""}`}
      style={{ "--team-color": team.color } as React.CSSProperties}
    >
      <Shield className="crest-outline" strokeWidth={1.5} />
      <span>{team.short}</span>
      <div className="crest-stars">✦</div>
    </div>
  );
}
export const money = (amount: number) => `SLE ${amount.toLocaleString("en-SL")}`;
export const dateLabel = (date: string) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date to be announced";
export function SectionHead({
  eyebrow,
  title,
  link,
  href,
}: {
  eyebrow?: string;
  title: string;
  link?: string;
  href?: string;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2>{displayTitle(title)}</h2>
      </div>
      {link && href && (
        <Link href={href} className="text-link">
          {link}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
export function PageHead({
  tag,
  title,
  description,
}: {
  tag: string;
  title: string;
  description: string;
}) {
  return (
    <div className="page-head">
      <div className="eyebrow">
        <span />
        {tag}
      </div>
      <h1>{displayTitle(title)}</h1>
      <p>{description}</p>
    </div>
  );
}
export function Empty({
  type = "news",
  title,
  text,
}: {
  type?: string;
  title: string;
  text: string;
}) {
  const Icon = type === "fixtures" ? CalendarDays : type === "teams" ? Trophy : Newspaper;
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={26} strokeWidth={1.4} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      <span className="empty-label">A NEW CHAPTER IS COMING</span>
    </div>
  );
}
export function Standings({ teams, full = false }: { teams: Team[]; full?: boolean }) {
  const sorted = [...teams].sort(
    (a, b) => b.points - a.points || b.gf - b.ga - (a.gf - a.ga) || b.gf - a.gf,
  );
  return (
    <div className="table-scroll">
      <table className="standings">
        <thead>
          <tr>
            <th className="rank-col">#</th>
            <th className="team-col">TEAM</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            {full && (
              <>
                <th>GF</th>
                <th>GA</th>
              </>
            )}
            <th>GD</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr key={t.id}>
              <td className="rank-col">
                <span className={i === 0 ? "first-rank" : ""}>{i + 1}</span>
              </td>
              <td className="team-col">
                <Link href={`/teams/${t.id}`}>
                  <Crest team={t} />
                  <span>{t.name}</span>
                </Link>
              </td>
              <td>{t.played}</td>
              <td>{t.wins}</td>
              <td>{t.draws}</td>
              <td>{t.losses}</td>
              {full && (
                <>
                  <td>{t.gf}</td>
                  <td>{t.ga}</td>
                </>
              )}
              <td>{t.gf - t.ga}</td>
              <td className="points">{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function FixtureList({ data, limit }: { data: LeagueData; limit?: number }) {
  const fixtures = [...data.fixtures].sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
  if (!fixtures.length)
    return (
      <Empty
        type="fixtures"
        title="The stage is being set."
        text="Fixtures haven't been announced yet. Check back for the first matchday."
      />
    );
  return (
    <div className="fixture-list">
      {fixtures.map((f) => {
        const home = data.teams.find((t) => t.id === f.home)!;
        const away = data.teams.find((t) => t.id === f.away)!;
        return (
          <div className="fixture" key={f.id}>
            <div className="fixture-meta">
              <span>{dateLabel(f.date)}</span>
              <span className="pill">{f.status}</span>
            </div>
            <div className="fixture-match">
              <div>
                <Crest team={home} />
                <b>{home.name}</b>
              </div>
              <span className="score">
                {f.status === "Completed" ? `${f.homeScore} : ${f.awayScore}` : "VS"}
              </span>
              <div>
                <Crest team={away} />
                <b>{away.name}</b>
              </div>
            </div>
            <p>{f.venue || "Venue to be announced"}</p>
          </div>
        );
      })}
    </div>
  );
}
export function NewsList({ data, limit }: { data: LeagueData; limit?: number }) {
  const articles = [...data.news].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  if (!articles.length)
    return (
      <Empty
        title="The story starts here."
        text="Official league news, team updates and breaking stories will appear here as they're published."
      />
    );
  return (
    <div className="news-list">
      {articles.map((n) => (
        <Link key={n.id} href={`/news/${n.id}`} className="news-item">
          {n.photo && data.photoUrls[n.photo] && (
            <img className="news-photo" src={data.photoUrls[n.photo]} alt={n.title} />
          )}
          <div>
            <span className={`tag ${n.breaking ? "red" : ""}`}>
              {n.breaking ? "Breaking news" : n.category}
            </span>
            <h3>{n.title}</h3>
            <p>
              {n.body.slice(0, 130)}
              {n.body.length > 130 ? "…" : ""}
            </p>
            <span className="muted small">{dateLabel(n.date)}</span>
          </div>
          <ArrowUpRight size={23} />
        </Link>
      ))}
    </div>
  );
}
