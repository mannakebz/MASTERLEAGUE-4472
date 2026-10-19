import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bell, X, CheckCheck } from "lucide-react";
import {
  useNotifications,
  usePushConfig,
  usePushToggle,
  storedPush,
} from "../queries/notifications";
import { PageHead } from "./league-ui";
const seenKey = "master-league-notifications-seen";
function seenTime() {
  try {
    const value = Number(localStorage.getItem(seenKey) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}
export function NotificationCentre({ page = false }: { page?: boolean }) {
  const feed = useNotifications();
  const config = usePushConfig();
  const toggle = usePushToggle();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(seenTime);
  const [enabled, setEnabled] = useState(() => Boolean(storedPush()));
  const shell = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [location]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!shell.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        shell.current?.querySelector<HTMLButtonElement>(".notification-bell")?.focus();
      }
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    window.addEventListener("league-navigation-open", close);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("league-navigation-open", close);
    };
  }, []);
  useEffect(() => {
    const sync = () => {
      setSeen(seenTime());
      setEnabled(Boolean(storedPush()));
    };
    window.addEventListener("storage", sync);
    window.addEventListener("league-notifications-read", sync);
    window.addEventListener("league-push-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("league-notifications-read", sync);
      window.removeEventListener("league-push-changed", sync);
    };
  }, []);
  const unread = feed.data?.filter((n) => n.createdAt > seen).length || 0;
  function mark() {
    const time = Date.now();
    setSeen(time);
    try {
      localStorage.setItem(seenKey, String(time));
      window.dispatchEvent(new Event("league-notifications-read"));
    } catch {}
  }
  const content = (
    <>
      <div className="notification-heading">
        <div>
          <h3>League notifications</h3>
          <p>{unread ? `${unread} unread updates` : "You’re all caught up"}</p>
        </div>
        <button aria-label="Mark all notifications read" onClick={mark}>
          <CheckCheck size={19} />
        </button>
        {!page && (
          <button aria-label="Close notifications" onClick={() => setOpen(false)}>
            <X size={19} />
          </button>
        )}
      </div>
      <div className="push-opt-in">
        <Bell size={19} />
        <div>
          <b>{enabled ? "Push alerts enabled on this device" : "Never miss a league update"}</b>
          <p>News, stats, cards, fixtures, transfers and TOTW.</p>
          <button
            disabled={toggle.isPending || config.isLoading || !config.data?.configured}
            onClick={() =>
              toggle.mutate(
                { enable: !enabled, key: config.data!.publicKey },
                { onSuccess: setEnabled },
              )
            }
          >
            {toggle.isPending
              ? "Setting up…"
              : enabled
                ? "Turn off push alerts"
                : "Enable push alerts"}
          </button>
        </div>
      </div>
      {toggle.error && (
        <p className="notification-error" role="alert">
          {toggle.error.message}
        </p>
      )}
      <p className="push-help">
        Push needs permission and the published HTTPS website. On iPhone/iPad, add this site to your
        Home Screen first. Each device subscribes separately.
      </p>
      {feed.isLoading ? (
        <p className="notification-empty">Loading updates…</p>
      ) : feed.error ? (
        <div className="notification-empty">
          Unable to load updates.<button onClick={() => feed.refetch()}>Try again</button>
        </div>
      ) : !feed.data?.length ? (
        <div className="notification-empty">
          <Bell size={26} />
          <h3>No announcements yet</h3>
          <p>Published league updates will appear here. No alerts are sent for unchanged saves.</p>
        </div>
      ) : (
        <div className="notification-list">
          {feed.data.map((n) => (
            <Link
              key={n.id}
              href={n.url}
              className={`notification-item ${n.createdAt > seen ? "unread" : ""}`}
              onClick={() => {
                mark();
                setOpen(false);
              }}
            >
              <span className="notification-category">{n.category}</span>
              <b>{n.title}</b>
              <p>{n.body}</p>
              <time>
                {new Date(n.createdAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </Link>
          ))}
        </div>
      )}
      {!page && (
        <Link href="/notifications" className="all-notifications" onClick={() => setOpen(false)}>
          Open notification centre →
        </Link>
      )}
    </>
  );
  if (page)
    return (
      <div className="container page-content">
        <PageHead
          tag="STAY IN THE KNOW"
          title="EVERY UPDATE. ONE PLACE."
          description="Follow news, player and team statistics, card records, fixtures, transfers and Team of the Week."
        />
        <section className="panel notification-page">{content}</section>
      </div>
    );
  return (
    <div className="notification-shell" ref={shell}>
      <button
        className="notification-bell"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          window.dispatchEvent(new Event("league-notifications-open"));
        }}
      >
        <Bell size={19} />
        {unread > 0 && <span>{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && <div className="notification-dropdown">{content}</div>}
    </div>
  );
}
