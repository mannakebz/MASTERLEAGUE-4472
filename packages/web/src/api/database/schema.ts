import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export * from "./auth-schema";
export const leagueState = sqliteTable("league_state", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});
export const notificationEvents = sqliteTable("notification_events", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  url: text("url").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  data: text("data").notNull(),
  capability: text("capability").notNull(),
  createdAt: integer("created_at").notNull(),
});
