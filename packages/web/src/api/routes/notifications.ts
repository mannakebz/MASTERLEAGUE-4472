import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import webpush from "web-push";
import { desc, eq, and } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { base } from "../__core/app";
import { db } from "../database";
import { notificationEvents, pushSubscriptions } from "../database/schema";
import type { UpdateEvent } from "../lib/notification-diff";

export function validPushEndpoint(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      (u.hostname === "fcm.googleapis.com" ||
        u.hostname === "updates.push.services.mozilla.com" ||
        u.hostname === "push.services.mozilla.com" ||
        u.hostname === "web.push.apple.com" ||
        u.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
const endpoint = z
  .string()
  .url()
  .max(2000)
  .refine(validPushEndpoint, "Unsupported browser push provider.");
const key = z
  .string()
  .regex(/^[A-Za-z0-9_-]+=*$/)
  .max(180);
const subscription = z.object({
  endpoint,
  expirationTime: z.number().nullable().optional(),
  keys: z.object({ p256dh: key.min(80), auth: key.min(20) }),
});
const capability = z.string().regex(/^[a-f0-9]{64}$/);
function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
const recent = new Map<string, { count: number; at: number }>();
const limited = base.use(async ({ context, next }) => {
  const ip = context.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now();
  const entry = recent.get(ip);
  if (entry && now - entry.at < 60000) {
    if (entry.count >= 20) throw new ORPCError("TOO_MANY_REQUESTS");
    entry.count++;
  } else recent.set(ip, { count: 1, at: now });
  if (recent.size > 1000)
    for (const [id, val] of recent) if (now - val.at > 60000) recent.delete(id);
  return next();
});
export const notifications = {
  list: base.handler(() =>
    db.select().from(notificationEvents).orderBy(desc(notificationEvents.createdAt)).limit(100),
  ),
  config: base.handler(() => ({
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  })),
  subscribe: limited
    .input(z.object({ subscription, capability: capability.optional() }))
    .handler(async ({ input }) => {
      const id = hash(input.subscription.endpoint);
      const [existing] = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.id, id));
      if (existing && (!input.capability || hash(input.capability) !== existing.capability))
        throw new ORPCError("FORBIDDEN", {
          message: "Remove the previous browser subscription and try again.",
        });
      const token = input.capability || randomBytes(32).toString("hex");
      await db
        .insert(pushSubscriptions)
        .values({
          id,
          endpoint: input.subscription.endpoint,
          data: JSON.stringify(input.subscription),
          capability: hash(token),
          createdAt: Date.now(),
        })
        .onConflictDoUpdate({
          target: pushSubscriptions.id,
          set: { data: JSON.stringify(input.subscription) },
        });
      return { id, capability: token };
    }),
  unsubscribe: limited
    .input(z.object({ id: z.string().regex(/^[a-f0-9]{64}$/), capability }))
    .handler(async ({ input }) => {
      await db
        .delete(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.id, input.id),
            eq(pushSubscriptions.capability, hash(input.capability)),
          ),
        );
      return { success: true };
    }),
};
export async function sendUpdatePush(events: UpdateEvent[]) {
  if (!events.length || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY)
    return { sent: 0, failed: 0 };
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:Mkd@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  const subscribers = await db.select().from(pushSubscriptions);
  const event =
    events.length === 1
      ? events[0]
      : {
          title: "Master League updates",
          body: events
            .map((e) => e.title)
            .join(" · ")
            .slice(0, 220),
          url: "/notifications",
          id: events[0].id,
        };
  let sent = 0,
    failed = 0;
  for (let i = 0; i < subscribers.length; i += 10) {
    await Promise.all(
      subscribers.slice(i, i + 10).map(async (s) => {
        try {
          if (!validPushEndpoint(s.endpoint)) throw new Error("Invalid push endpoint");
          await webpush.sendNotification(
            JSON.parse(s.data),
            JSON.stringify({ title: event.title, body: event.body, url: event.url, tag: event.id }),
            { TTL: 86400, timeout: 5000 },
          );
          sent++;
        } catch (error) {
          failed++;
          const status = (error as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410)
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, s.id));
        }
      }),
    );
  }
  return { sent, failed };
}
