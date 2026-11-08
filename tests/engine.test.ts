import { test } from "node:test";
import assert from "node:assert/strict";
import {
  apply,
  makeRoom,
  view,
  hash,
  similar,
  normalize,
  predictionLeaders,
} from "../lib/engine";
import { trivia } from "../data/trivia";
import { prompts } from "../data/prompts";
import type { Action, Room, Game } from "../lib/types";
function party(n = 8) {
  const host = "private-host-token";
  const r = makeRoom("ABC234", host, 1000);
  const tokens: string[] = [];
  for (let i = 0; i < n; i++)
    tokens.push(
      apply(r, { type: "join", name: `Friend ${i + 1}` }, 1000).playerToken!,
    );
  return { r, host, tokens };
}
function command(
  r: Room,
  host: string,
  type: string,
  rest: Partial<Action> = {},
  now = 1000,
) {
  apply(r, { type, token: host, version: r.version, ...rest }, now);
}
function start(game: Game, n = 8) {
  const p = party(n);
  command(p.r, p.host, "start", { game });
  return p;
}
function action(r: Room, t: string, type: string, value: string, now = 1001) {
  return apply(r, { type, token: t, roundId: r.round?.id, value }, now);
}
test("joins cap at eight, restored tokens rejoin full rooms and mid-game", () => {
  const { r, tokens, host } = party();
  assert.equal(r.players.length, 8);
  assert.throws(() => apply(r, { type: "join", name: "Ninth" }, 1000), /full/);
  assert.equal(
    apply(r, { type: "join", name: "Friend 1", token: tokens[0] }, 1000)
      .playerToken,
    tokens[0],
  );
  command(r, host, "start", { game: "bluff" });
  assert.equal(
    apply(r, { type: "join", name: "Friend 1", token: tokens[0] }, 1000)
      .playerToken,
    tokens[0],
  );
  assert.throws(() => apply(r, { type: "join", name: "New" }, 1000), /started/);
});
test("no impersonation, hidden answers/submissions/votes, server-only host commands", () => {
  const { r, tokens } = start("bluff");
  assert.throws(() => view(r, "bogus"), /credentials/);
  assert.throws(() => command(r, tokens[0], "finish"), /host/);
  action(r, tokens[0], "submit", "A very credible invention");
  const v = view(r, tokens[1]);
  assert.equal(v.result, undefined);
  assert.equal(v.options, undefined);
  assert.ok(!JSON.stringify(v).includes("A very credible invention"));
  assert.ok(!JSON.stringify(v).includes(r.round!.answer!));
  assert.ok(!JSON.stringify(v).includes("tokenHash"));
});
test("correct and near-correct submissions never appear as fake answers", () => {
  const { r, tokens, host } = start("bluff");
  action(r, tokens[0], "submit", r.round!.answer!);
  action(r, tokens[1], "submit", "A different definitely fake answer");
  command(r, host, "next");
  assert.equal(r.phase, "vote");
  assert.equal(r.round!.options.filter((o) => o.correct).length, 1);
  assert.ok(r.round!.options.find((o) => o.correct)!.owners.length === 0);
  assert.equal(similar("Sulfuric acid", "Sulfuric acidd"), true);
});
test("similar bluffs merge, every owner is blocked from own card", () => {
  const { r, tokens, host } = start("bluff");
  action(r, tokens[0], "submit", "Dancing purple elephants");
  action(r, tokens[1], "submit", "Dancing purple elephant");
  command(r, host, "next");
  const o = r.round!.options.find((o) => o.owners.length === 2)!;
  assert.ok(o);
  assert.throws(() => action(r, tokens[0], "vote", o.id), /somebody else/);
  assert.throws(() => action(r, tokens[1], "vote", o.id), /somebody else/);
  action(r, tokens[2], "vote", o.id);
  command(r, host, "next");
  assert.equal(r.players[0].scores.bluff, 500);
  assert.equal(r.players[1].scores.bluff, 500);
});
test("eight-player five-question Bluff Masters simulation scores once and carries totals", () => {
  const { r, tokens, host } = start("bluff");
  for (let round = 0; round < 5; round++) {
    assert.equal(r.phase, "write");
    tokens.forEach((t, i) =>
      action(
        r,
        t,
        "submit",
        `Invented answer ${String.fromCharCode(65 + i).repeat(12)}`,
      ),
    );
    assert.equal(r.phase, "vote");
    const correct = r.round!.options.find((o) => o.correct)!;
    const fake = r.round!.options.find((o) =>
      o.owners.includes(r.players[0].id),
    )!;
    tokens.forEach((t, i) =>
      action(r, t, "vote", i === 0 ? correct.id : fake.id),
    );
    assert.equal(r.phase, "reveal");
    assert.equal(r.players[0].scores.bluff, (round + 1) * 4500);
    const scores = r.players.map((p) => p.scores.bluff);
    apply(r, { type: "sync", token: tokens[1] }, 2000);
    assert.deepEqual(
      r.players.map((p) => p.scores.bluff),
      scores,
    );
    command(r, host, "next");
    assert.equal(r.phase, "leaderboard");
    command(r, host, "next");
  }
  assert.equal(r.phase, "final");
  assert.equal(r.players[0].scores.bluff, 22500);
  command(r, host, "lobby");
  command(r, host, "start", { game: "likely" });
  assert.equal(r.players[0].scores.bluff, 22500);
});
test("eight-player social match supports tied prediction winners and anonymous ballots", () => {
  const { r, tokens, host } = start("likely");
  for (let round = 0; round < 8; round++) {
    assert.equal(r.phase, "predict");
    tokens.forEach((t, i) => action(r, t, "predict", r.players[i % 2].id));
    assert.equal(r.phase, "vote");
    tokens.forEach((t, i) =>
      action(r, t, "vote", r.players[i % 2 === 0 ? 1 : 0].id),
    );
    assert.equal(r.phase, "reveal");
    assert.deepEqual(Object.values(r.round!.deltas), Array(8).fill(300));
    const v = view(r, tokens[0]);
    assert.equal(v.result!.votes, undefined);
    assert.equal(v.result!.counts![r.players[0].id], 4);
    command(r, host, "next");
    command(r, host, "next");
  }
  assert.equal(r.phase, "final");
  assert.ok(r.players.every((p) => p.scores.likely === 2400));
});
test("duplicates cannot replace submissions or votes or score twice", () => {
  const { r, tokens, host } = start("bluff");
  action(r, tokens[0], "submit", "The first invention");
  action(r, tokens[0], "submit", "Replacement invention");
  assert.equal(r.round!.submissions[r.players[0].id], "The first invention");
  action(r, tokens[1], "submit", "Something completely different");
  command(r, host, "next");
  const correct = r.round!.options.find((o) => o.correct)!;
  action(r, tokens[0], "vote", correct.id);
  action(r, tokens[0], "vote", correct.id);
  command(r, host, "next");
  assert.equal(r.players[0].scores.bluff, 1000);
  command(r, host, "next");
  assert.equal(r.players[0].scores.bluff, 1000);
});
test("deadlines reject late actions, fallback handles 0 or 1 submissions", () => {
  for (const n of [0, 1]) {
    const { r, tokens } = start("bluff");
    if (n) action(r, tokens[0], "submit", "A lonely bluff");
    const deadline = r.deadline!;
    assert.throws(
      () => action(r, tokens[1], "submit", "Too late", deadline),
      /closed/,
    );
    assert.equal(r.phase, "reveal");
    assert.match(r.round!.note!, /Not enough/);
    assert.ok(r.players.every((p) => p.scores.bluff === 0));
  }
});
test("paused deadlines freeze; resume preserves remaining time", () => {
  const { r, host, tokens } = start("bluff");
  command(r, host, "pause", {}, 10000);
  assert.equal(r.remaining, 51000);
  apply(r, { type: "sync", token: tokens[0] }, 100000);
  assert.equal(r.phase, "write");
  assert.throws(
    () => action(r, tokens[0], "submit", "A paused bluff", 100000),
    /paused/,
  );
  command(r, host, "resume", {}, 100000);
  assert.equal(r.deadline, 151000);
});
test("self-vote toggle is validated on server and reflected in phone view", () => {
  const { r, host, tokens } = start("likely", 2);
  tokens.forEach((t) => action(r, t, "predict", "skip"));
  assert.throws(() => action(r, tokens[0], "vote", r.players[0].id), /friend/);
  r.settings.selfVote = true;
  assert.equal(view(r, tokens[0]).selfVote, true);
  action(r, tokens[0], "vote", r.players[0].id);
  assert.equal(r.round!.votes[r.players[0].id], r.players[0].id);
});
test("optional prediction timeout yields zero rewards when no one votes", () => {
  const { r, tokens } = start("likely");
  apply(r, { type: "sync", token: tokens[0] }, r.deadline!);
  assert.equal(r.phase, "vote");
  apply(r, { type: "sync", token: tokens[0] }, r.deadline!);
  assert.equal(r.phase, "reveal");
  assert.deepEqual(r.round!.deltas, {});
});
test("stale round IDs and stale host versions are rejected", () => {
  const { r, host, tokens } = start("bluff");
  assert.throws(
    () =>
      apply(
        r,
        { type: "submit", token: tokens[0], roundId: "stale", value: "oops" },
        1000,
      ),
    /ended/,
  );
  assert.throws(
    () => apply(r, { type: "next", token: host, version: 999 }, 1000),
    /changed/,
  );
});
test("banks have 25+ sourced questions with answers and 50+ friendly prompts", () => {
  assert.ok(trivia.length >= 25);
  assert.ok(prompts.length >= 50);
  assert.equal(new Set(trivia.map((t) => t.question)).size, trivia.length);
  for (const t of trivia) {
    assert.ok(t.answer.length > 0);
    assert.ok(new URL(t.source).protocol === "https:");
  }
  assert.ok(prompts.filter((p) => p.mode === "family").length >= 8);
  assert.equal(hash("x").length, 64);
  assert.equal(normalize(" THE blue! "), "blue");
});
test("custom playlist validates length, mode, order and text", () => {
  const { r, host } = party(2);
  assert.throws(
    () =>
      command(r, host, "settings", {
        settings: { ...r.settings, prompts: prompts.slice(0, 3) },
      }),
    /exactly 8/,
  );
  const playlist = prompts.slice(0, 8).reverse();
  command(r, host, "settings", {
    settings: { ...r.settings, prompts: playlist },
  });
  command(r, host, "start", { game: "likely" });
  assert.equal(r.round!.question, playlist[0].text);
});
test("a host close at the deadline advances only one phase", () => {
  const { r, tokens, host } = start("bluff");
  action(r, tokens[0], "submit", "A plausible purple story");
  action(r, tokens[1], "submit", "A surprisingly green theory");
  command(r, host, "next", {}, r.deadline!);
  assert.equal(r.phase, "vote");
  assert.equal(r.round!.scored, false);
});
test("normalization preserves initial letters of ordinary words", () => {
  assert.equal(normalize("Alam Ara"), "alamara");
  assert.equal(normalize("a doughnut"), "doughnut");
});

test("truth-containing phrases cannot be presented as somebody’s fake answer", () => {
  const { r, tokens, host } = start("bluff");
  const answer = r.round!.answer!;
  action(r, tokens[0], "submit", `The answer is ${answer}, obviously`);
  action(r, tokens[1], "submit", "Dancing clockwork teapots");
  command(r, host, "next");
  assert.equal(r.round!.options.filter((o) => o.correct).length, 1);
  assert.ok(r.round!.options.every((o) => !o.owners.includes(r.players[0].id)));
});

test("your vote cannot turn a wrong prediction into a scoring tie", () => {
  const { r, tokens, host } = start("likely", 4);
  const [a, b, c, d] = r.players.map((p) => p.id);
  tokens.forEach((t, i) => action(r, t, "predict", i === 0 ? b : "skip"));
  action(r, tokens[0], "vote", b);
  action(r, tokens[1], "vote", c);
  action(r, tokens[2], "vote", b);
  action(r, tokens[3], "vote", c);
  assert.equal(r.phase, "reveal");
  assert.equal(r.players[0].scores.likely, 0);
  assert.deepEqual(predictionLeaders(r.round!.votes, a), [c]);
  const phone = view(r, tokens[0]);
  assert.equal(phone.result!.counts![b], 2);
  assert.equal(phone.result!.counts![c], 2);
  assert.deepEqual(phone.result!.prediction, {
    target: b,
    leaders: [c],
    correct: false,
  });
  assert.equal("predictions" in phone.result!, false);
  assert.equal(view(r, host).result!.prediction, undefined);
  assert.equal(view(r, tokens[1]).result!.prediction, undefined);
});

test("prediction leaders and reward eligibility do not depend on your own ballot", () => {
  const others = { b: "c", c: "b", d: "c" };
  for (const own of ["a", "b", "c", "d"]) {
    assert.deepEqual(predictionLeaders({ ...others, a: own }, "a"), ["c"]);
  }
  assert.deepEqual(predictionLeaders({ a: "b" }, "a"), []);
  assert.deepEqual(predictionLeaders({ a: "b", b: "b", c: "c" }, "a"), [
    "b",
    "c",
  ]);
});

test("a tie among the other voters counts even if your ballot breaks the overall tie", () => {
  const { r, tokens } = start("likely", 3);
  const [a, b, c] = r.players.map((p) => p.id);
  tokens.forEach((t, i) => action(r, t, "predict", i === 0 ? c : "skip"));
  action(r, tokens[0], "vote", b);
  action(r, tokens[1], "vote", c);
  action(r, tokens[2], "vote", b);
  assert.equal(r.players[0].scores.likely, 300);
  assert.deepEqual(predictionLeaders(r.round!.votes, a).sort(), [b, c].sort());
});

test("a lone voter cannot award their own prediction bonus", () => {
  const { r, tokens, host } = start("likely", 3);
  tokens.forEach((t, i) =>
    action(r, t, "predict", i === 0 ? r.players[1].id : "skip"),
  );
  action(r, tokens[0], "vote", r.players[1].id);
  command(r, host, "next");
  assert.equal(r.players[0].scores.likely, 0);
  assert.deepEqual(view(r, tokens[0]).result!.prediction!.leaders, []);
});

test("host timers control every phase in both games and can change between rounds", () => {
  const { r, tokens, host } = party(2);
  const timings = {
    bluffWrite: 120,
    bluffVote: 75,
    likelyPredict: 30,
    likelyVote: 90,
  };
  command(r, host, "timings", { timings });
  command(r, host, "start", { game: "bluff" });
  assert.equal(r.deadline, 121000);
  assert.throws(
    () => command(r, host, "timings", { timings }),
    /between rounds/,
  );
  tokens.forEach((t, i) =>
    action(
      r,
      t,
      "submit",
      i ? "Blue clockwork cats" : "Golden spinning bicycles",
      2000,
    ),
  );
  assert.equal(r.phase, "vote");
  assert.equal(r.deadline, 77000);
  command(r, host, "next", {}, 3000);
  command(r, host, "timings", { timings: { ...timings, bluffWrite: 150 } });
  command(r, host, "next");
  command(r, host, "next", {}, 4000);
  assert.equal(r.phase, "write");
  assert.equal(r.deadline, 154000);
  command(r, host, "lobby");
  command(r, host, "start", { game: "likely" });
  assert.equal(r.deadline, 31000);
  tokens.forEach((t) => action(r, t, "predict", "skip", 2000));
  assert.equal(r.deadline, 92000);
});

test("timers are host-only and reject missing, non-integer or out-of-range values", () => {
  const { r, host, tokens } = party(2);
  const timings = {
    bluffWrite: 60,
    bluffVote: 45,
    likelyPredict: 20,
    likelyVote: 45,
  };
  assert.throws(() => command(r, tokens[0], "timings", { timings }), /host/);
  for (const value of [0, 4, 301, 5.5, NaN, Infinity, "60", null, undefined]) {
    const invalid = {
      ...timings,
      bluffWrite: value,
    } as unknown as typeof timings;
    assert.throws(
      () => command(r, host, "timings", { timings: invalid }),
      /whole number/,
    );
  }
  assert.throws(() => command(r, host, "timings"), /whole number/);
  command(r, host, "timings", {
    timings: { ...timings, bluffWrite: 5, likelyVote: 300 },
  });
  assert.equal(r.timings!.bluffWrite, 5);
  assert.equal(r.timings!.likelyVote, 300);
});

test("old rooms without timer settings recover with defaults without changing an active deadline", () => {
  const { r, host, tokens } = start("bluff", 2);
  delete r.timings;
  r.deadline = 46000;
  apply(r, { type: "sync", token: host }, 2000);
  assert.equal(r.deadline, 46000);
  assert.equal(view(r, host).timings.likelyVote, 45);
  tokens.forEach((t, i) =>
    action(
      r,
      t,
      "submit",
      i ? "Brass clockwork birds" : "Plastic dancing lobsters",
      3000,
    ),
  );
  assert.equal(r.deadline, 48000);
});

test("already-scored legacy rounds retain their scores without presenting a new-rule outcome", () => {
  const { r, tokens } = start("likely", 3);
  tokens.forEach((t, i) =>
    action(r, t, "predict", i === 0 ? r.players[1].id : "skip"),
  );
  tokens.forEach((t, i) => action(r, t, "vote", r.players[(i + 1) % 3].id));
  delete r.round!.predictionRule;
  const scores = r.players.map((p) => p.scores.likely);
  const result = view(r, tokens[0]).result!;
  assert.equal(result.prediction, undefined);
  assert.match(result.note!, /earlier prediction rule/);
  apply(r, { type: "sync", token: tokens[0] }, 2000);
  assert.deepEqual(
    r.players.map((p) => p.scores.likely),
    scores,
  );
});
