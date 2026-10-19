import { call } from "@orpc/server";
import { eq } from "drizzle-orm";
import { league } from "../src/api/routes/league";
import { auth } from "../src/api/auth";
import { db } from "../src/api/database";
import { user, leagueState } from "../src/api/database/schema";
import { photos } from "../src/api/routes/photos";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

function assert(value: unknown, label: string) {
  if (!value) throw new Error(label);
  console.log(`PASS: ${label}`);
}
const empty = { context: { headers: new Headers() } };
const original = await call(league.get, undefined, empty);
assert(
  original.teams.length === 4 && original.teams.every((t) => t.points === 0 && t.budget === 0),
  "four teams, zero points and budgets",
);
const before = await db.select().from(leagueState).where(eq(leagueState.id, "master"));
assert(
  original.squad.length === 60 &&
    original.teams.every((t) => original.squad.filter((p) => p.teamId === t.id).length === 15),
  "15 sample players per team",
);
assert(
  original.squad.every((p) => p.goals === 0 && p.assists === 0 && p.appearances === 0),
  "zero initial player performance stats",
);
let userId: string | undefined;
const configuredBefore = process.env.MASTER_LEAGUE_ADMIN_EMAIL;
try {
  try {
    await call(league.save, original, empty);
    throw new Error("Unauthorized save accepted");
  } catch (e) {
    assert((e as { code: string }).code === "UNAUTHORIZED", "anonymous writes rejected");
  }
  const email = `league-test-${crypto.randomUUID()}@example.com`;
  const result = await auth.api.signUpEmail({
    body: { email, password: crypto.randomUUID(), name: "Temporary test" },
  });
  userId = result.user.id;
  const context = {
    context: { headers: new Headers({ Authorization: `Bearer ${result.token}` }) },
  };
  delete process.env.MASTER_LEAGUE_ADMIN_EMAIL;
  try {
    await call(league.save, original, context);
    throw new Error("Unassigned save accepted");
  } catch (e) {
    assert(
      (e as { code: string }).code === "FORBIDDEN",
      "signed-in users cannot edit without assigned admin",
    );
  }
  process.env.MASTER_LEAGUE_ADMIN_EMAIL = email;
  try {
    await call(league.save, original, context);
    throw new Error("Unverified save accepted");
  } catch (e) {
    assert((e as { code: string }).code === "FORBIDDEN", "unverified assigned account rejected");
  }
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));
  assert(
    (await call(league.access, undefined, context)).allowed,
    "verified assigned admin recognized",
  );
  const changed = structuredClone(original);
  changed.teams[0].budget = 100;
  changed.teams[0].points = 3;
  changed.news.push({
    id: "test-news",
    title: "Test headline",
    body: "Test body",
    category: "Breaking news",
    breaking: true,
    date: "2026-10-07",
    photo: "",
  });
  changed.fixtures.push({
    id: "test-match",
    home: "seirin",
    away: "blue-lock",
    date: "2026-10-07",
    venue: "Test venue",
    status: "Completed",
    homeScore: 1,
    awayScore: 0,
  });
  changed.transfers.push({
    id: "test-transfer",
    player: "Test player",
    from: "Free agent",
    to: "seirin",
    fee: 100,
    date: "2026-10-07",
    status: "Confirmed",
  });
  await call(league.save, changed, context);
  const expanded = structuredClone(changed);
  expanded.squad[0].name = "Editable test name";
  expanded.squad[0].goals = 2;
  expanded.squad[0].assists = 3;
  expanded.squad[0].sample = false;
  expanded.totw = {
    week: 1,
    formation: "4-3-3",
    published: true,
    playerIds: expanded.squad.slice(0, 11).map((p) => p.id),
  };
  await call(league.save, expanded, context);
  const updated = await call(league.get, undefined, empty);
  assert(
    updated.squad[0].name === "Editable test name" &&
      updated.squad[0].goals + updated.squad[0].assists === 5 &&
      updated.teams[0].players === 1 &&
      updated.totw.published,
    "player edits, registration count and TOTW persist",
  );
  const duplicate = structuredClone(expanded);
  duplicate.totw.playerIds[1] = duplicate.totw.playerIds[0];
  try {
    await call(league.save, duplicate, context);
    throw new Error("Duplicate TOTW accepted");
  } catch (e) {
    assert((e as { code: string }).code === "BAD_REQUEST", "duplicate TOTW selection rejected");
  }
  const incomplete = structuredClone(expanded);
  incomplete.totw.playerIds[0] = "";
  try {
    await call(league.save, incomplete, context);
    throw new Error("Incomplete TOTW accepted");
  } catch (e) {
    assert((e as { code: string }).code === "BAD_REQUEST", "incomplete published TOTW rejected");
  }
  const wrongSquad = structuredClone(expanded);
  wrongSquad.squad[0].teamId = "blue-lock";
  try {
    await call(league.save, wrongSquad, context);
    throw new Error("Invalid squad accepted");
  } catch (e) {
    assert((e as { code: string }).code === "BAD_REQUEST", "15-player team limit enforced");
  }
  try {
    await call(photos.presign, { contentType: "image/png", size: 50 }, empty);
    throw new Error("Unauthorized photo upload accepted");
  } catch (e) {
    assert((e as { code: string }).code === "UNAUTHORIZED", "anonymous photo uploads rejected");
  }
  const upload = await call(photos.presign, { contentType: "image/png", size: 50 }, context);
  assert(
    upload.key.startsWith("league-images/") && upload.url.startsWith("https://"),
    "admin receives signed image upload URL",
  );
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWl8AAAAASUVORK5CYII=",
    "base64",
  );
  const realUpload = await call(
    photos.presign,
    { contentType: "image/png", size: image.length },
    context,
  );
  try {
    const put = await fetch(realUpload.url, {
      method: "PUT",
      body: image,
      headers: { "Content-Type": "image/png" },
    });
    assert(put.ok, "photo bytes upload to object storage");
    const preview = await call(photos.preview, { key: realUpload.key }, context);
    const get = await fetch(preview.url);
    assert(
      get.ok && (await get.arrayBuffer()).byteLength === image.length,
      "stored photo preview is retrievable",
    );
  } finally {
    const s3 = new S3Client({
      region: "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: realUpload.key }));
  }
  const read = await call(league.get, undefined, empty);
  assert(
    read.teams[0].budget === 100 &&
      read.news.length === 1 &&
      read.fixtures.length === 1 &&
      read.transfers.length === 1,
    "manual updates persist and are readable publicly",
  );
  const bad = structuredClone(changed);
  bad.fixtures[0].away = bad.fixtures[0].home;
  try {
    await call(league.save, bad, context);
    throw new Error("Same team fixture accepted");
  } catch (e) {
    assert((e as { code: string }).code === "BAD_REQUEST", "same-team fixtures rejected");
  }
  process.env.MASTER_LEAGUE_ADMIN_EMAIL = "other@example.com";
  try {
    await call(league.save, original, context);
    throw new Error("Wrong email accepted");
  } catch (e) {
    assert((e as { code: string }).code === "FORBIDDEN", "non-admin verified users rejected");
  }
} finally {
  if (before.length)
    await db.update(leagueState).set({ data: before[0].data }).where(eq(leagueState.id, "master"));
  else await db.delete(leagueState).where(eq(leagueState.id, "master"));
  if (userId) await db.delete(user).where(eq(user.id, userId));
  if (configuredBefore) process.env.MASTER_LEAGUE_ADMIN_EMAIL = configuredBefore;
  else delete process.env.MASTER_LEAGUE_ADMIN_EMAIL;
  console.log("Restored original zero-state and removed temporary test identity.");
}
