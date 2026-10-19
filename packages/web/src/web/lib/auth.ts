import { createAuthClient } from "better-auth/react";
import { managedAuthClient } from "@runablehq/managed-auth/client";
const emailTokenKey = "master-league-email-session";
function emailToken() {
  try {
    return localStorage.getItem(emailTokenKey) || "";
  } catch {
    return "";
  }
}
export function sessionToken(): string {
  return authClient.managedAuth.getToken() || emailToken();
}
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_WEBSITE_URL ?? window.location.origin,
  basePath: "/api/auth",
  fetchOptions: {
    auth: { type: "Bearer", token: () => sessionToken() },
    onSuccess: (context) => {
      const path = new URL(context.request.url).pathname;
      if (path.endsWith("/sign-in/email") || path.endsWith("/sign-up/email")) {
        const token = context.response.headers.get("set-auth-token");
        if (token) {
          try {
            localStorage.setItem(emailTokenKey, token);
          } catch {
            /* Cookie sessions remain available. */
          }
        }
      }
      if (path.endsWith("/sign-out")) {
        try {
          localStorage.removeItem(emailTokenKey);
        } catch {
          /* No stored token. */
        }
      }
    },
  },
  plugins: [
    managedAuthClient({
      applicationId: import.meta.env.VITE_APPLICATION_ID,
      issuer: import.meta.env.VITE_RUNABLE_AUTH_ISSUER,
    }),
  ],
});
