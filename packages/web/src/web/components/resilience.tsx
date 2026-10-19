import { Component, useEffect, useState, type ReactNode } from "react";

export class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Page rendering failed", error);
  }
  render() {
    if (this.state.failed)
      return (
        <div className="container loading-page" role="alert">
          <h2>This page needs a refresh</h2>
          <p>Your published league data is safe. Reload this page to try again.</p>
          <button className="button orange" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    return this.props.children;
  }
}

export function ConnectionStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline ? (
    <output className="connection-status">
      You’re offline. Updates will reconnect when your connection returns.
    </output>
  ) : null;
}
