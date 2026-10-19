import { call } from "@orpc/server";
import { eq, inArray } from "drizzle-orm";
import { detectUpdates } from "../src/api/lib/notification-diff";
import { notifications, validPushEndpoint } from "../src/api/routes/notifications";
import { league } from "../src/api/routes/league";
import { auth } from "../src/api/auth";
import { db } from "../src/api/database";
import {
  user,
  leagueState,
  notificationEvents,
  pushSubscriptions,
} from "../src/api/database/schema";
function assert(value: unknown, label: string) {
  if (!value) throw new Error(label);
  console.log("PASS:", label);
}
const options = { context: { headers: new Headers() } };
const original = await call(league.get, undefined, options);
assert(detectUpdates(original, original).length === 0, "unchanged saves create no alerts");
const cardUpdate = structuredClone(original);
cardUpdate.squad[0].yellowCards++;
cardUpdate.squad[0].redCards++;
assert(
  detectUpdates(original, cardUpdate).some((e) => e.category === "Stats"),
  "yellow and red card edits create stats alerts",
);
const draft = structuredClone(original);
draft.totw.week = 7;
assert(
  !detectUpdates(original, draft).some((e) => e.category === "TOTW"),
  "unpublished TOTW does not alert visitors",
);
assert(
  !validPushEndpoint("https://127.0.0.1/test") &&
    !validPushEndpoint("http://fcm.googleapis.com/test") &&
    !validPushEndpoint("https://fcm.googleapis.com.evil.test/push"),
  "unsafe push endpoints rejected",
);
const sub = {
  endpoint: `https://fcm.googleapis.com/fcm/send/test-${crypto.randomUUID()}`,
  keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) },
};
const result = await call(notifications.subscribe, { subscription: sub }, options);
try {
  try {
    await call(notifications.subscribe, { subscription: sub }, options);
    throw new Error("Missing capability accepted");
  } catch (e) {
    assert(
      (e as { code: string }).code === "FORBIDDEN",
      "existing subscription cannot be overwritten without capability",
    );
  }
  await call(notifications.unsubscribe, { id: result.id, capability: "f".repeat(64) }, options);
  assert(
    (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, result.id)))
      .length === 1,
    "wrong capability cannot remove subscriber",
  );
} finally {
  await call(notifications.unsubscribe, result, options);
}
assert(
  !(await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.id, result.id))).length,
  "opt-out removes subscription",
);
const subscribers = await db.select().from(pushSubscriptions);
if (subscribers.length)
  console.log("SKIP save integration: live subscribers present; no test push sent.");
else {
  const before = await db.select().from(leagueState).where(eq(leagueState.id, "master"));
  const eventsBefore = await db.select().from(notificationEvents);
  const emailBefore = process.env.MASTER_LEAGUE_ADMIN_EMAIL;
  let id = "";
  try {
    const email = `notification-test-${crypto.randomUUID()}@example.com`;
    const created = await auth.api.signUpEmail({
      body: { name: "Temporary notification test", email, password: crypto.randomUUID() },
    });
    id = created.user.id;
    await db.update(user).set({ emailVerified: true }).where(eq(user.id, id));
    process.env.MASTER_LEAGUE_ADMIN_EMAIL = email;
    const adminOptions = {
      context: { headers: new Headers({ Authorization: `Bearer ${created.token}` }) },
    };
    const saved = await call(league.save, cardUpdate, adminOptions);
    assert(
      saved.notificationsCreated === 1,
      "admin card save creates a persisted stats notification",
    );
    const again = await call(league.save, cardUpdate, adminOptions);
    assert(
      again.notificationsCreated === 0,
      "saving the same update twice avoids duplicate alerts",
    );
    const feed = await call(notifications.list, undefined, options);
    assert(
      feed.some((n) => n.category === "Stats" && n.url === "/stats"),
      "public notification feed exposes update",
    );
  } finally {
    if (before.length)
      await db
        .update(leagueState)
        .set({ data: before[0].data })
        .where(eq(leagueState.id, "master"));
    else await db.delete(leagueState).where(eq(leagueState.id, "master"));
    const all = await db.select().from(notificationEvents);
    const ids = all.filter((n) => !eventsBefore.some((e) => e.id === n.id)).map((n) => n.id);
    if (ids.length) await db.delete(notificationEvents).where(inArray(notificationEvents.id, ids));
    if (id) await db.delete(user).where(eq(user.id, id));
    process.env.MASTER_LEAGUE_ADMIN_EMAIL = emailBefore;
    console.log("Restored real league state; test events, subscription and identity removed.");
  }
}
