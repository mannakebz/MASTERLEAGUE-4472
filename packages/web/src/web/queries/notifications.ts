import { useQuery, useMutation } from "@tanstack/react-query";
import { orpc, client } from "../lib/api";
export function useNotifications() {
  return useQuery(
    orpc.notifications.list.queryOptions({ refetchInterval: 30000, refetchOnWindowFocus: true }),
  );
}
export function usePushConfig() {
  return useQuery(orpc.notifications.config.queryOptions({ staleTime: 60000 }));
}
type LocalPush = { id: string; capability: string };
const storageKey = "master-league-push";
export function storedPush(): LocalPush | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || "null");
    return value && /^[a-f0-9]{64}$/.test(value.id) && /^[a-f0-9]{64}$/.test(value.capability)
      ? value
      : null;
  } catch {
    return null;
  }
}
function bytes(key: string) {
  const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export function usePushToggle() {
  return useMutation({
    mutationFn: async ({ enable, key }: { enable: boolean; key: string }) => {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window) ||
        !window.isSecureContext
      )
        throw new Error(
          "This browser does not support push alerts. Use the published HTTPS site in a supported browser.",
        );
      if (window.top !== window.self)
        throw new Error("Open the website directly, outside the preview, to enable push alerts.");
      if (enable) {
        try {
          localStorage.setItem(`${storageKey}-test`, "1");
          localStorage.removeItem(`${storageKey}-test`);
        } catch {
          throw new Error(
            "Device storage is blocked. Enable site storage to save a push subscription.",
          );
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted")
          throw new Error(
            permission === "denied"
              ? "Notifications are blocked. Allow them in your browser settings to continue."
              : "Notification permission was not granted.",
          );
      }
      const registration = await navigator.serviceWorker.register("/push-worker.js", {
        scope: "/",
      });
      const worker = registration.active || registration.installing || registration.waiting;
      if (worker && worker.state !== "activated")
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Push setup timed out. Try again.")),
            10000,
          );
          worker.addEventListener("statechange", () => {
            if (worker.state === "activated") {
              clearTimeout(timer);
              resolve();
            }
          });
        });
      if (!enable) {
        const stored = storedPush();
        if (stored) await client.notifications.unsubscribe(stored);
        const current = await registration.pushManager.getSubscription();
        await current?.unsubscribe();
        localStorage.removeItem(storageKey);
        return false;
      }
      let existing = await registration.pushManager.getSubscription();
      const saved = storedPush();
      if (existing && !saved) {
        await existing.unsubscribe();
        existing = null;
      }
      const subscription =
        existing ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes(key),
        }));
      try {
        const json = subscription.toJSON();
        const result = await client.notifications.subscribe({
          subscription: {
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime,
            keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth },
          },
          capability: saved?.capability,
        });
        localStorage.setItem(storageKey, JSON.stringify(result));
        return true;
      } catch (error) {
        if (!existing) await subscription.unsubscribe();
        throw error;
      }
    },
    onSuccess: () => window.dispatchEvent(new Event("league-push-changed")),
  });
}
