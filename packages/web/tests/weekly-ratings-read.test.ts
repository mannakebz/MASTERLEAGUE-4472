import { call } from "@orpc/server";
import { league } from "../src/api/routes/league";
import { weeklyRatingsSchema } from "../src/api/lib/weekly-ratings";
const headers = new Headers();
const original = await call(league.get, undefined, { context: { headers } });
if (!weeklyRatingsSchema.safeParse(original.weeklyRatings).success)
  throw new Error("Invalid public weekly data");
const updated = structuredClone(original);
if (!updated.weeklyRatings.length) updated.weeklyRatings.push({ week: 1, players: [] });
try {
  await call(league.save, updated, { context: { headers } });
  throw new Error("Anonymous write accepted");
} catch (error) {
  if ((error as { code: string }).code !== "UNAUTHORIZED") throw error;
}
const after = await call(league.get, undefined, { context: { headers } });
const { photoUrls: _beforePhotos, ...beforeData } = original;
const { photoUrls: _afterPhotos, ...afterData } = after;
if (JSON.stringify(beforeData) !== JSON.stringify(afterData))
  throw new Error("Data changed during read-only test");
console.log(
  "PASS: public weekly read, anonymous save rejection and unchanged owner state. No database writes.",
);
