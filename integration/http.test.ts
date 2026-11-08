import { test } from "node:test";
import assert from "node:assert/strict";
import type { View } from "../lib/types";
const base = process.env.TEST_URL ?? "http://127.0.0.1:3000";
async function request(
  action: Record<string, unknown>,
  pin?: string,
  token?: string,
) {
  const res = await fetch(`${base}/api/party`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ pin, action }),
  });
  return { status: res.status, ...(await res.json()) } as {
    status: number;
    state: View;
    token?: string;
    error?: string;
  };
}
test("real HTTP: concurrent eight-player joins, duplicate writes, scoring, social anonymity, recovery", async () => {
  const created = await request({ type: "create" });
  assert.equal(created.status, 200, created.error);
  const pin = created.state.pin,
    host = created.token!;
  let h = created.state;
  const join = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      request({ type: "join", name: `HTTP friend ${i + 1}` }, pin),
    ),
  );
  for (const p of join) assert.equal(p.status, 200, p.error);
  const tokens = join.map((p) => p.token!);
  let v = await request({ type: "sync" }, pin, host);
  h = v.state;
  assert.equal(h.players.length, 8);
  assert.equal(
    (await request({ type: "join", name: "Ninth" }, pin)).status,
    400,
  );
  assert.equal((await request({ type: "sync" }, pin, "bad token")).status, 401);
  const cmd = async (type: string, extra = {}) => {
    h = (await request({ type, version: h.version, ...extra }, pin, host))
      .state;
    assert.ok(h, `missing host state for ${type}`);
  };
  await cmd("start", { game: "bluff" });
  assert.equal(h.phase, "write");
  const rid = h.roundId;
  const results = await Promise.all(
    tokens.flatMap((t, i) =>
      Array.from({ length: 2 }, () =>
        request(
          {
            type: "submit",
            roundId: rid,
            value: `Invented ${String.fromCharCode(65 + i).repeat(14)}`,
          },
          pin,
          t,
        ),
      ),
    ),
  );
  assert.ok(results.some((p) => p.status === 200));
  h = (await request({ type: "sync" }, pin, host)).state;
  assert.equal(h.phase, "vote");
  assert.equal(h.options!.length, 9);
  assert.equal(h.result, undefined);
  const votes = await Promise.all(
    tokens.map(async (t) => {
      const player = (await request({ type: "sync" }, pin, t)).state;
      const choice = player.options!.find((o) => !o.own)!;
      return request({ type: "vote", roundId: rid, value: choice.id }, pin, t);
    }),
  );
  for (const p of votes) assert.equal(p.status, 200, p.error);
  h = (await request({ type: "sync" }, pin, host)).state;
  assert.equal(h.phase, "reveal");
  const totals = h.players.map((p) => p.total);
  await request(
    { type: "vote", roundId: rid, value: h.options![0].id },
    pin,
    tokens[0],
  );
  h = (await request({ type: "sync" }, pin, host)).state;
  assert.deepEqual(
    h.players.map((p) => p.total),
    totals,
  );
  await cmd("lobby");
  await cmd("start", { game: "likely" });
  assert.equal(h.phase, "predict");
  await Promise.all(
    tokens.map((t) =>
      request({ type: "predict", roundId: h.roundId, value: "skip" }, pin, t),
    ),
  );
  h = (await request({ type: "sync" }, pin, host)).state;
  assert.equal(h.phase, "vote");
  await Promise.all(
    tokens.map((t, i) =>
      request(
        { type: "vote", roundId: h.roundId, value: join[(i + 1) % 8].state.me },
        pin,
        t,
      ),
    ),
  );
  h = (await request({ type: "sync" }, pin, host)).state;
  assert.equal(h.phase, "reveal");
  assert.equal(h.result!.votes, undefined);
  assert.equal(
    Object.values(h.result!.counts!).reduce((a, b) => a + b, 0),
    8,
  );
  assert.deepEqual(
    h.players.map((p) => p.total),
    totals,
  );
  const recovered = (await request({ type: "sync" }, pin, tokens[0])).state;
  assert.equal(recovered.me, join[0].state.me);
  assert.equal(recovered.phase, "reveal");
});
test("HTTP payload validation and origin guard", async () => {
  const bad = await fetch(`${base}/api/party`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({ action: { type: "create" } }),
  });
  assert.equal(bad.status, 403);
  const huge = await fetch(`${base}/api/party`, {
    method: "POST",
    body: "x".repeat(17000),
  });
  assert.equal(huge.status, 413);
});

test("HTTP: host timers persist between rounds and a self-fulfilling prediction earns nothing", async () => {
  const created = await request({ type: "create" });
  assert.equal(created.status, 200, created.error);
  const pin = created.state.pin,
    host = created.token!;
  let h = created.state;
  const joined = await Promise.all(
    Array.from({ length: 4 }, (_, i) =>
      request({ type: "join", name: `Timer friend ${i + 1}` }, pin),
    ),
  );
  for (const p of joined) assert.equal(p.status, 200, p.error);
  const tokens = joined.map((p) => p.token!);
  const [a, b, c] = joined.map((p) => p.state.me!);
  h = (await request({ type: "sync" }, pin, host)).state;
  async function command(type: string, extra = {}) {
    const result = await request(
      { type, version: h.version, ...extra },
      pin,
      host,
    );
    assert.equal(result.status, 200, result.error);
    h = result.state;
  }
  const timings = {
    bluffWrite: 120,
    bluffVote: 75,
    likelyPredict: 45,
    likelyVote: 90,
  };
  const denied = await request(
    { type: "timings", version: h.version, timings },
    pin,
    tokens[0],
  );
  assert.equal(denied.status, 400);
  await command("timings", { timings });
  assert.deepEqual(h.timings, timings);
  await command("start", { game: "likely" });
  assert.ok(h.deadline! - h.now > 44000 && h.deadline! - h.now <= 45000);
  const rejected = await request(
    { type: "timings", version: h.version, timings },
    pin,
    host,
  );
  assert.equal(rejected.status, 400);
  await Promise.all(
    tokens.map((t, i) =>
      request(
        { type: "predict", roundId: h.roundId, value: i === 0 ? b : "skip" },
        pin,
        t,
      ),
    ),
  );
  h = (await request({ type: "sync" }, pin, host)).state;
  assert.equal(h.phase, "vote");
  assert.ok(h.deadline! - h.now > 89000 && h.deadline! - h.now <= 90000);
  await Promise.all(
    tokens.map((t, i) =>
      request(
        { type: "vote", roundId: h.roundId, value: [b, c, b, c][i] },
        pin,
        t,
      ),
    ),
  );
  h = (await request({ type: "sync" }, pin, host)).state;
  assert.equal(h.phase, "reveal");
  assert.equal(h.players.find((p) => p.id === a)!.scores.likely, 0);
  assert.equal(h.result!.counts![b], 2);
  assert.equal(h.result!.counts![c], 2);
  assert.equal("predictions" in h.result!, false);
  assert.equal(h.result!.prediction, undefined);
  const phone = (await request({ type: "sync" }, pin, tokens[0])).state;
  assert.deepEqual(phone.result!.prediction, {
    target: b,
    leaders: [c],
    correct: false,
  });
  await command("next");
  await command("timings", { timings: { ...timings, likelyPredict: 60 } });
  await command("next");
  assert.equal(h.phase, "predict");
  assert.ok(h.deadline! - h.now > 59000 && h.deadline! - h.now <= 60000);
});
