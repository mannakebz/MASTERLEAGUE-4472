import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ShieldCheck, LockKeyhole, Save, Plus, Trash2, LogOut, ArrowRight } from "lucide-react";
import { authClient } from "../lib/auth";
import { useAccess, useLeague, useSaveLeague, type LeagueData } from "../queries/league";
import { PageHead, money } from "../components/league-ui";
import { PhotoUpload } from "../components/photo-upload";
import { SquadAdmin, TotwAdmin } from "../components/squad-admin";
import { WeeklyRatingsAdmin } from "../components/weekly-ratings-admin";

export default function AdminPage() {
  const access = useAccess();
  const league = useLeague();
  const save = useSaveLeague();
  const { data: session } = authClient.useSession();
  const [tab, setTab] = useState("Teams");
  const [draft, setDraft] = useState<LeagueData | null>(null);
  const baseline = useRef("");
  const received = useRef<LeagueData | null>(null);
  const dirty = Boolean(draft && JSON.stringify(draft) !== baseline.current);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (league.data && league.data !== received.current && !dirty && !save.isPending) {
      received.current = league.data;
      baseline.current = JSON.stringify(league.data);
      setDraft(structuredClone(league.data));
    }
  }, [league.data, dirty, save.isPending]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    const leave = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.("a[href]");
      if (anchor && !window.confirm("Leave this page and discard your unpublished changes?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = signup
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) setError(result.error.message || "Unable to sign in");
      else {
        await access.refetch();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.managedAuth.signIn({ provider: "google" });
      if (result.error) setError(result.error.message || "Google sign-in was not completed");
      await access.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to connect to Google.");
    } finally {
      setBusy(false);
    }
  }
  function edit(
    kind: "teams" | "news" | "fixtures" | "transfers",
    index: number,
    field: string,
    value: unknown,
  ) {
    if (!draft) return;
    setDraft({
      ...draft,
      [kind]: draft[kind].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    });
    setNotice("");
  }
  function remove(kind: "news" | "fixtures" | "transfers", index: number) {
    if (draft && window.confirm("Remove this item? The change is only published when you save."))
      setDraft({ ...draft, [kind]: draft[kind].filter((_, i) => i !== index) });
  }
  const date = () => new Date().toISOString().slice(0, 10);
  function add() {
    if (!draft) return;
    const id = crypto.randomUUID();
    if (tab === "News")
      setDraft({
        ...draft,
        news: [
          {
            id,
            title: "",
            body: "",
            category: "League news",
            date: date(),
            breaking: false,
            photo: "",
          },
          ...draft.news,
        ],
      });
    if (tab === "Fixtures")
      setDraft({
        ...draft,
        fixtures: [
          ...draft.fixtures,
          {
            id,
            home: draft.teams[0].id,
            away: draft.teams[1].id,
            date: "",
            venue: "",
            status: "Upcoming",
            homeScore: 0,
            awayScore: 0,
          },
        ],
      });
    if (tab === "Transfers")
      setDraft({
        ...draft,
        transfers: [
          {
            id,
            player: "",
            from: "",
            to: draft.teams[0].id,
            fee: 0,
            date: date(),
            status: "Confirmed",
          },
          ...draft.transfers,
        ],
      });
  }
  function numberField(
    kind: "teams" | "news" | "fixtures" | "transfers",
    index: number,
    field: string,
    label: string,
    value: number,
  ) {
    return (
      <label key={field}>
        {label}
        <input
          aria-label={label}
          type="number"
          min="0"
          max="1000000000"
          step="1"
          required
          value={value}
          onChange={(e) => edit(kind, index, field, Math.max(0, Number(e.target.value)))}
        />
      </label>
    );
  }
  function teamSelect(
    kind: "teams" | "news" | "fixtures" | "transfers",
    index: number,
    field: string,
    label: string,
    value: string,
  ) {
    return (
      <label>
        {label}
        <select value={value} onChange={(e) => edit(kind, index, field, e.target.value)}>
          {draft?.teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (access.isLoading)
    return (
      <div className="container loading-page">
        <div className="loader" />
        <p>Checking admin access…</p>
      </div>
    );
  if (access.error || (access.data?.allowed && league.error && !draft))
    return (
      <div className="container loading-page" role="alert">
        <h2>Unable to load administration</h2>
        <p>Check your connection and try again. Your access has not changed.</p>
        <button
          className="button orange"
          onClick={() => {
            void access.refetch();
            void league.refetch();
          }}
        >
          Try again
        </button>
      </div>
    );
  return (
    <div className="container page-content">
      <PageHead
        tag="LEAGUE CONTROL ROOM"
        title="BEHIND THE GAME."
        description="Manage squads, player statistics, photos, TOTW, news, fixtures and transfers."
      />
      {access.error && (
        <div className="form-error">
          Unable to check permissions. <button onClick={() => access.refetch()}>Try again</button>
        </div>
      )}
      {!access.data?.allowed ? (
        <div className="admin-entry">
          <div className="admin-explainer">
            <ShieldCheck size={45} strokeWidth={1.3} />
            <h2>
              Your league.
              <br />
              Your control.
            </h2>
            <p>
              Manual updates. No automatic scores, no invented news. The league administrator
              decides what goes live.
            </p>
            <ul>
              <li>Update standings and team budgets</li>
              <li>Publish news and breaking alerts</li>
              <li>Manage fixtures and match results</li>
              <li>Record transfers in leones</li>
              <li>Edit all 60 players, add photos and select TOTW</li>
            </ul>
            <div className="admin-lock">
              <LockKeyhole size={18} />
              <div>
                <b>
                  {access.data?.configured
                    ? "Restricted to the assigned administrator"
                    : "Admin access is not assigned yet"}
                </b>
                <p>
                  {access.data?.configured
                    ? "Only the verified, approved account can make updates."
                    : "Provide your admin email to activate editing. All public data is protected until then."}
                </p>
              </div>
            </div>
          </div>
          <div className="login-box">
            {session ? (
              <>
                <h2>{access.data?.configured ? "Access restricted" : "Account connected"}</h2>
                <p>
                  Signed in as <b>{session.user.email}</b>.
                </p>
                <p className="muted">
                  {!access.data?.configured
                    ? "No administrator has been assigned. Your account cannot edit league data yet."
                    : !access.data.verified
                      ? "This account needs a verified identity. Use Google with the assigned email, or have the owner verify this account during setup."
                      : "This account is not the assigned league administrator."}
                </p>
                <button
                  className="button dark"
                  onClick={async () => {
                    await authClient.signOut();
                    await access.refetch();
                  }}
                >
                  Sign out
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <div className="eyebrow">AUTHORIZED PERSONNEL ONLY</div>
                <h2>{signup ? "Create an account" : "Admin sign in"}</h2>
                <p className="muted">Sign in to your Master League account.</p>
                <button disabled={busy} className="google-button" onClick={google}>
                  <b>G</b>
                  {busy ? "Connecting…" : "Continue with Google"}
                </button>
                <div className="login-divider">or with email</div>
                <form onSubmit={signIn}>
                  {signup && (
                    <label>
                      Name
                      <input
                        aria-label="Name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                      />
                    </label>
                  )}
                  <label>
                    Email address
                    <input
                      aria-label="Email address"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    Password
                    <input
                      aria-label="Password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                  </label>
                  {error && (
                    <div role="alert" className="form-error">
                      {error}
                    </div>
                  )}
                  <button disabled={busy} className="button orange" type="submit">
                    {busy ? "Please wait…" : signup ? "Create account" : "Sign in"}
                    <ArrowRight size={16} />
                  </button>
                </form>
                <button
                  className="switch-auth"
                  onClick={() => {
                    setSignup(!signup);
                    setError("");
                  }}
                >
                  {signup ? "Already have an account? Sign in" : "Need an account? Register"}
                </button>
                <p className="login-note">
                  <LockKeyhole size={12} />
                  Creating an account does not grant admin access.
                </p>
              </>
            )}
          </div>
        </div>
      ) : draft ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setNotice("");
            save.mutate(draft, {
              onSuccess: (result) => {
                const { notificationsCreated: _count, push: _push, ...updated } = result;
                const next = { ...updated, photoUrls: draft.photoUrls };
                received.current = league.data || null;
                baseline.current = JSON.stringify(next);
                setDraft(structuredClone(next));
                setNotice(
                  `All league updates are now published. ${result.notificationsCreated} notification${result.notificationsCreated === 1 ? "" : "s"} created.${result.push.failed ? " Some push alerts could not be delivered; in-site updates are available." : result.push.sent ? ` Push delivered to ${result.push.sent} device${result.push.sent === 1 ? "" : "s"}.` : ""}`,
                );
              },
              onError: (e) => setNotice(e.message),
            });
          }}
        >
          <div className="admin-toolbar">
            <span>
              <ShieldCheck size={18} />
              Signed in as {session?.user.email}
            </span>
            <button
              type="button"
              className="text-link"
              onClick={async () => {
                if (dirty && !window.confirm("Discard your unpublished changes and sign out?"))
                  return;
                await authClient.signOut();
                await access.refetch();
              }}
            >
              Sign out
              <LogOut size={15} />
            </button>
          </div>
          {dirty && (
            <output className="draft-warning">
              Unpublished changes — save before leaving this page.
            </output>
          )}
          <div className="admin-tabbar">
            <div className="tabs">
              {["Teams", "Players", "Weekly ratings", "TOTW", "News", "Fixtures", "Transfers"].map(
                (t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTab(t)}
                    className={tab === t ? "selected" : ""}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
            <button className="button orange" type="submit" disabled={save.isPending}>
              <Save size={16} />
              {save.isPending ? "Publishing…" : "Save & publish"}
            </button>
          </div>
          {notice && (
            <output className={save.isError ? "form-error" : "form-success"}>{notice}</output>
          )}
          {["News", "Fixtures", "Transfers"].includes(tab) && (
            <button className="button dark add-button" type="button" onClick={add}>
              <Plus size={16} />
              Add {tab === "News" ? "story" : tab === "Fixtures" ? "fixture" : "transfer"}
            </button>
          )}
          <fieldset disabled={save.isPending} className="admin-editor-fields">
            {tab === "Players" && <SquadAdmin draft={draft} setDraft={setDraft} />}
            {tab === "Weekly ratings" && <WeeklyRatingsAdmin draft={draft} setDraft={setDraft} />}
            {tab === "TOTW" && <TotwAdmin draft={draft} setDraft={setDraft} />}
            {tab === "Teams" && (
              <div className="admin-forms">
                {draft.teams.map((t, i) => (
                  <div className="panel edit-panel" key={t.id}>
                    <h3>{t.name}</h3>
                    <PhotoUpload
                      label={`Team picture for ${t.name}`}
                      value={t.photo}
                      url={draft.photoUrls[t.photo]}
                      onChange={(key) => edit("teams", i, "photo", key)}
                    />
                    <label>
                      Team profile
                      <textarea
                        aria-label="Team profile"
                        rows={3}
                        maxLength={2000}
                        value={t.bio}
                        onChange={(e) => edit("teams", i, "bio", e.target.value)}
                      />
                    </label>
                    <div className="form-grid">
                      {numberField("teams", i, "played", "Played", t.played)}
                      {numberField("teams", i, "wins", "Wins", t.wins)}
                      {numberField("teams", i, "draws", "Draws", t.draws)}
                      {numberField("teams", i, "losses", "Losses", t.losses)}
                      {numberField("teams", i, "gf", "Goals for", t.gf)}
                      {numberField("teams", i, "ga", "Goals against", t.ga)}
                      {numberField("teams", i, "points", "Points", t.points)}
                      {numberField("teams", i, "budget", "Budget (SLE)", t.budget)}
                    </div>
                    <p className="small muted">
                      Budget: {money(t.budget)}. 15 squad members;{" "}
                      {draft.squad.filter((p) => p.teamId === t.id && !p.sample).length} registered
                      players. Standings are edited independently of match results.
                    </p>
                  </div>
                ))}
              </div>
            )}
            {tab === "News" &&
              draft.news.map((n, i) => (
                <div className="panel edit-panel" key={n.id}>
                  <div className="edit-heading">
                    <h3>News story</h3>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => remove("news", i)}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                  <label>
                    Headline
                    <input
                      aria-label="Headline"
                      value={n.title}
                      required
                      maxLength={180}
                      onChange={(e) => edit("news", i, "title", e.target.value)}
                    />
                  </label>
                  <PhotoUpload
                    label="News picture"
                    value={n.photo}
                    url={draft.photoUrls[n.photo]}
                    onChange={(key) => edit("news", i, "photo", key)}
                  />
                  <label>
                    Article
                    <textarea
                      aria-label="Article"
                      rows={5}
                      required
                      value={n.body}
                      onChange={(e) => edit("news", i, "body", e.target.value)}
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Category
                      <select
                        value={n.category}
                        onChange={(e) => edit("news", i, "category", e.target.value)}
                      >
                        {["League news", "Team news", "Transfers", "Breaking news"].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Date
                      <input
                        aria-label="News date"
                        type="date"
                        required
                        value={n.date}
                        onChange={(e) => edit("news", i, "date", e.target.value)}
                      />
                    </label>
                  </div>
                  <label className="checkbox-label">
                    <input
                      aria-label="Feature in the breaking news ticker"
                      type="checkbox"
                      checked={n.breaking}
                      onChange={(e) => edit("news", i, "breaking", e.target.checked)}
                    />
                    Feature in the breaking news ticker
                  </label>
                </div>
              ))}
            {tab === "Fixtures" &&
              draft.fixtures.map((f, i) => (
                <div className="panel edit-panel" key={f.id}>
                  <div className="edit-heading">
                    <h3>Fixture</h3>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => remove("fixtures", i)}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                  <div className="form-grid">
                    {teamSelect("fixtures", i, "home", "Home team", f.home)}
                    {teamSelect("fixtures", i, "away", "Away team", f.away)}
                    <label>
                      Date
                      <input
                        aria-label="Fixture date"
                        type="date"
                        value={f.date}
                        onChange={(e) => edit("fixtures", i, "date", e.target.value)}
                      />
                    </label>
                    <label>
                      Venue
                      <input
                        aria-label="Venue"
                        value={f.venue}
                        onChange={(e) => edit("fixtures", i, "venue", e.target.value)}
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={f.status}
                        onChange={(e) => edit("fixtures", i, "status", e.target.value)}
                      >
                        <option>Upcoming</option>
                        <option>Completed</option>
                      </select>
                    </label>
                    {numberField("fixtures", i, "homeScore", "Home score", f.homeScore)}
                    {numberField("fixtures", i, "awayScore", "Away score", f.awayScore)}
                  </div>
                </div>
              ))}
            {tab === "Transfers" &&
              draft.transfers.map((t, i) => (
                <div className="panel edit-panel" key={t.id}>
                  <div className="edit-heading">
                    <h3>Transfer</h3>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => remove("transfers", i)}
                    >
                      <Trash2 size={16} />
                      Remove
                    </button>
                  </div>
                  <div className="form-grid">
                    <label>
                      Player
                      <input
                        aria-label="Player"
                        required
                        value={t.player}
                        onChange={(e) => edit("transfers", i, "player", e.target.value)}
                      />
                    </label>
                    <label>
                      From (club or free agent)
                      <input
                        aria-label="From club"
                        value={t.from}
                        onChange={(e) => edit("transfers", i, "from", e.target.value)}
                      />
                    </label>
                    {teamSelect("transfers", i, "to", "Joining team", t.to)}
                    {numberField("transfers", i, "fee", "Fee (SLE)", t.fee)}
                    <label>
                      Date
                      <input
                        aria-label="Transfer date"
                        type="date"
                        required
                        value={t.date}
                        onChange={(e) => edit("transfers", i, "date", e.target.value)}
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={t.status}
                        onChange={(e) => edit("transfers", i, "status", e.target.value)}
                      >
                        <option>Confirmed</option>
                        <option>Rumour</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            {["News", "Fixtures", "Transfers"].includes(tab) &&
              !draft[tab === "News" ? "news" : tab === "Fixtures" ? "fixtures" : "transfers"]
                .length && (
                <div className="panel admin-empty">
                  No entries yet. Add the first one above, then save and publish.
                </div>
              )}
          </fieldset>
        </form>
      ) : (
        <div className="loading-page">
          {league.error ? "Unable to load league data." : "Loading the control room…"}
        </div>
      )}
      <Link href="/" className="text-link admin-back">
        ← Back to the league
      </Link>
    </div>
  );
}
