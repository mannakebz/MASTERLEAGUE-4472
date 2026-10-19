import { call } from "@orpc/server";
import { playerSchema, seedPlayers } from "../src/api/lib/squad";
import { detectUpdates } from "../src/api/lib/notification-diff";
import { league } from "../src/api/routes/league";
function assert(value: unknown, label: string) {
  if (!value) throw new Error(label);
  console.log("PASS:", label);
}
const seeded = seedPlayers(["seirin", "blue-lock", "alhamdulilah", "psycho-riders"]);
assert(
  seeded.length === 60 && seeded.every((p) => p.transferValue === 0),
  "60 player values start at zero",
);
const { transferValue: _value, ...legacy } = seeded[0];
assert(playerSchema.parse(legacy).transferValue === 0, "old player records migrate safely to zero");
assert(
  playerSchema.parse({ ...legacy, transferValue: 12345 }).transferValue === 12345,
  "valid SLE valuation retained",
);
for (const value of [-1, 1.5, NaN, 1000000001])
  assert(
    !playerSchema.safeParse({ ...legacy, transferValue: value }).success,
    `invalid value ${value} rejected`,
  );
const original = await call(league.get, undefined, { context: { headers: new Headers() } });
assert(
  original.squad.every((p) => Number.isInteger(p.transferValue) && p.transferValue >= 0),
  "public read supplies values for all existing players",
);
const updated = structuredClone(original);
updated.squad[0].transferValue = 12345;
assert(
  detectUpdates(original, updated).some(
    (e) => e.category === "Transfers" && e.url === "/transfers",
  ),
  "valuation edit generates transfer-centre alert",
);
assert(detectUpdates(original, original).length === 0, "unchanged values do not create alerts");
try {
  await call(league.save, updated, { context: { headers: new Headers() } });
  throw new Error("Anonymous write accepted");
} catch (error) {
  assert(
    (error as { code: string }).code === "UNAUTHORIZED",
    "anonymous valuation writes remain protected",
  );
}
console.log("Read-only/schema tests complete; no published data modified.");
