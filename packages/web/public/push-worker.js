self.addEventListener("push", (event) => {
  let data = {
    title: "Master League",
    body: "New league updates are available.",
    url: "/notifications",
  };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/images/push-icon.png",
      badge: "/images/push-icon.png",
      tag: data.tag,
      data: { url: data.url },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/notifications", self.location.origin);
  if (target.origin !== self.location.origin) return;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      for (const window of windows) {
        if (new URL(window.url).origin === target.origin) {
          await window.navigate(target.href);
          return window.focus();
        }
      }
      return clients.openWindow(target.href);
    }),
  );
});
