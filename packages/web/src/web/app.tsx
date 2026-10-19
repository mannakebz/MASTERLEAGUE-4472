import { Route, Switch, useLocation } from "wouter";
import LeaguePage from "./pages/league";
import AdminPage from "./pages/admin";
import { NotificationCentre } from "./components/notification-bell";
import { Shell } from "./components/league-ui";
import { authClient } from "./lib/auth";
import { useEffect } from "react";
import { Provider } from "./components/provider";
import { PageBoundary, ConnectionStatus } from "./components/resilience";
import { AgentFeedback } from "@runablehq/website-runtime";
import "./liquid-glass.css";
import "./theme.css";

function App() {
  const [location] = useLocation();
  useEffect(() => {
    void authClient.managedAuth
      .handleRedirect()
      .catch((error) => console.error("Sign-in redirect failed", error));
  }, []);
  return (
    <Provider>
      <ConnectionStatus />
      <Shell>
        <PageBoundary key={location}>
          <Switch>
            <Route path="/admin" component={AdminPage} />
            <Route path="/notifications">
              <NotificationCentre page />
            </Route>
            <Route component={LeaguePage} />
          </Switch>
        </PageBoundary>
      </Shell>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
    </Provider>
  );
}

export default App;
