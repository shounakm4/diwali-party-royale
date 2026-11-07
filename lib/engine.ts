import { createHash, randomBytes, randomInt } from "node:crypto";
import { trivia } from "@/data/trivia";
import { prompts } from "@/data/prompts";
import type { Action, Game, Option, Room, Settings, View } from "./types";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export const id = () => randomBytes(12).toString("hex");
export function shuffle<T>(values: T[]): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function makeRoom(
  pin: string,
  hostToken: string,
  now = Date.now(),
): Room {
  return {
    pin,
    hostHash: hash(hostToken),
    topic: id(),
    version: 0,
    created: now,
    players: [],
    phase: "lobby",
    game: null,
    index: 0,
    deck: [],
    round: null,
    deadline: null,
    paused: false,
    remaining: 0,
    settings: {
      selfVote: false,
      mode: "family",
      predictions: true,
      prompts: [],
    },
    usedTrivia: [],
    usedPrompts: [],
  };
}
export function normalize(s: string) {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/^(the|an|a)\s+/, "")
    .replace(/[^a-z0-9]/g, "");
}
export function similar(a: string, b: string) {
  const x = normalize(a),
    y = normalize(b);
  if (x === y) return true;
  if (Math.min(x.length, y.length) < 5) return false;
  const d = Array.from({ length: x.length + 1 }, (_, i) => i);
  for (let j = 1; j <= y.length; j++) {
    let prev = d[0];
    d[0] = j;
    for (let i = 1; i <= x.length; i++) {
      const old = d[i];
      d[i] = Math.min(
        d[i] + 1,
        d[i - 1] + 1,
        prev + (x[i - 1] === y[j - 1] ? 0 : 1),
      );
      prev = old;
    }
  }
  return d[x.length] <= Math.floor(Math.max(x.length, y.length) * 0.18);
}
function requireThat(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function phase(r: Room, p: Room["phase"], seconds: number, now: number) {
  r.phase = p;
  r.deadline = seconds ? now + seconds * 1000 : null;
}
function startRound(r: Room, now: number) {
  const entry = r.game === "bluff" ? trivia[r.deck[r.index]] : null;
  const prompt = r.settings.prompts.length
    ? r.settings.prompts[r.index]
    : prompts[r.deck[r.index]];
  r.round = {
    id: id(),
    question: entry?.question ?? prompt.text,
    answer: entry?.answer,
    aliases: entry?.aliases,
    source: entry?.source,
    explanation: entry?.explanation,
    eligible: r.players.map((p) => p.id),
    submissions: {},
    votes: {},
    predictions: {},
    options: [],
    scored: false,
    deltas: {},
  };
  phase(
    r,
    r.game === "bluff" ? "write" : r.settings.predictions ? "predict" : "vote",
    r.game === "bluff" ? 45 : r.settings.predictions ? 10 : 20,
    now,
  );
}
function containsTruth(text: string, answer: string) {
  const plain = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return (
    ` ${plain(text)} `.includes(` ${plain(answer)} `) || similar(text, answer)
  );
}
function buildOptions(r: Room) {
  const rd = r.round!;
  const correct: Option = {
    id: id(),
    text: rd.answer!,
    owners: [],
    correct: true,
  };
  const options = [correct];
  for (const [pid, text] of Object.entries(rd.submissions)) {
    if ([rd.answer!, ...(rd.aliases ?? [])].some((a) => containsTruth(text, a)))
      continue;
    const existing = options.find((o) => !o.correct && similar(o.text, text));
    if (existing) existing.owners.push(pid);
    else options.push({ id: id(), text, owners: [pid], correct: false });
  }
  rd.options = shuffle(options);
}
function reveal(r: Room, now: number) {
  const rd = r.round!;
  if (!rd.scored) {
    rd.scored = true;
    const add = (pid: string, n: number) => {
      const p = r.players.find((p) => p.id === pid);
      if (p) {
        p.scores[r.game!] += n;
        rd.deltas[pid] = (rd.deltas[pid] ?? 0) + n;
      }
    };
    if (r.game === "bluff") {
      for (const [pid, oid] of Object.entries(rd.votes)) {
        const o = rd.options.find((o) => o.id === oid);
        if (o?.correct) add(pid, 1000);
        else
          o?.owners
            .filter((owner) => owner !== pid)
            .forEach((owner) => add(owner, 500));
      }
    } else {
      const counts: Record<string, number> = {};
      Object.values(rd.votes).forEach(
        (pid) => (counts[pid] = (counts[pid] ?? 0) + 1),
      );
      const max = Math.max(0, ...Object.values(counts));
      if (max > 0)
        for (const [pid, pred] of Object.entries(rd.predictions))
          if (counts[pred] === max) add(pid, 300);
    }
  }
  phase(r, "reveal", 0, now);
}
function advance(r: Room, now: number) {
  if (r.phase === "write") {
    buildOptions(r);
    if (
      Object.keys(r.round!.submissions).length < 2 ||
      r.round!.options.length < 2
    ) {
      r.round!.note =
        "Not enough distinct bluffs this time. Answer revealed; no points awarded. Ready for the next one?";
      reveal(r, now);
    } else phase(r, "vote", 25, now);
  } else if (r.phase === "predict") phase(r, "vote", 20, now);
  else if (r.phase === "vote") reveal(r, now);
  else if (r.phase === "reveal") phase(r, "leaderboard", 0, now);
  else if (r.phase === "leaderboard") {
    if (r.index + 1 >= r.deck.length) phase(r, "final", 0, now);
    else {
      r.index++;
      startRound(r, now);
    }
  }
}
export function tick(r: Room, now: number) {
  if (!r.paused && r.deadline !== null && now >= r.deadline) advance(r, now);
}
function validateSettings(s: Settings) {
  requireThat(
    s &&
      ["family", "friends"].includes(s.mode) &&
      typeof s.selfVote === "boolean" &&
      typeof s.predictions === "boolean" &&
      Array.isArray(s.prompts),
    "Invalid settings",
  );
  requireThat(
    s.prompts.length === 0 || s.prompts.length === 8,
    "Choose exactly 8 custom prompts, or leave the playlist empty for a random match.",
  );
  s.prompts.forEach((p) =>
    requireThat(
      p &&
        typeof p.text === "string" &&
        p.text.trim().length >= 8 &&
        p.text.length <= 220 &&
        ["family", "friends"].includes(p.mode),
      "Each prompt needs 8–220 characters.",
    ),
  );
  if (s.mode === "family")
    requireThat(
      s.prompts.every((p) => p.mode === "family"),
      "Remove Friends Unfiltered prompts or switch mode.",
    );
}
export function apply(
  r: Room,
  a: Action,
  now = Date.now(),
): { playerToken?: string } {
  const host = !!a.token && hash(a.token) === r.hostHash;
  const player = r.players.find(
    (p) => a.token && p.tokenHash === hash(a.token),
  );
  // expired actions are rejected after advancing; never count a late vote.
  const previousPhase = r.phase;
  tick(r, now);
  if (a.type === "sync") {
    requireThat(host || player, "Rejoin with your original device.");
    return {};
  }
  if (a.type === "join") {
    requireThat(
      typeof a.name === "string" &&
        a.name.trim().length >= 1 &&
        a.name.trim().length <= 20,
      "Use a nickname of 1–20 characters.",
    );
    if (player) return { playerToken: a.token };
    requireThat(
      r.phase === "lobby",
      "The match has started. New players can join in the lobby.",
    );
    requireThat(
      r.players.length < 8,
      "Party full! All eight seats are taken. Reconnect using your original device.",
    );
    requireThat(
      !r.players.some((p) => normalize(p.name) === normalize(a.name!)),
      "That nickname is taken. Try another.",
    );
    const t = token();
    r.players.push({
      id: id(),
      name: a.name.trim(),
      avatar: r.players.length,
      tokenHash: hash(t),
      joined: now,
      scores: { bluff: 0, likely: 0 },
    });
    return { playerToken: t };
  }
  if (
    [
      "settings",
      "start",
      "next",
      "pause",
      "resume",
      "lobby",
      "restart",
      "finish",
    ].includes(a.type)
  ) {
    requireThat(host, "Only the host can do that.");
    requireThat(
      a.version === r.version,
      "The room changed. Your screen is refreshing; try again.",
    );
    if (a.type === "settings") {
      requireThat(r.phase === "lobby", "Change settings in the lobby.");
      validateSettings(a.settings!);
      r.settings = structuredClone(a.settings!);
    }
    if (a.type === "start" || a.type === "restart") {
      requireThat(
        a.type === "restart" || r.phase === "lobby" || r.phase === "final",
        "Return to the lobby first.",
      );
      const game = a.type === "restart" ? r.game : a.game;
      requireThat(game === "bluff" || game === "likely", "Choose a game.");
      requireThat(
        r.players.length >= 2,
        "Bring at least two players to the party.",
      );
      r.game = game;
      r.index = 0;
      r.paused = false;
      const used = game === "bluff" ? r.usedTrivia : r.usedPrompts;
      let pool =
        game === "bluff"
          ? trivia.map((_, i) => i)
          : prompts
              .map((_, i) => i)
              .filter(
                (i) =>
                  r.settings.mode === "friends" || prompts[i].mode === "family",
              );
      const count = game === "bluff" ? 5 : 8;
      if (pool.filter((i) => !used.includes(i)).length >= count)
        pool = pool.filter((i) => !used.includes(i));
      r.deck =
        game === "likely" && r.settings.prompts.length
          ? r.settings.prompts.map((_, i) => i)
          : shuffle(pool).slice(0, count);
      if (game === "bluff") r.usedTrivia.push(...r.deck);
      else if (!r.settings.prompts.length) r.usedPrompts.push(...r.deck);
      startRound(r, now);
    }
    if (a.type === "next" && r.phase !== previousPhase) return {};
    if (a.type === "next") {
      requireThat(!r.paused, "Resume first.");
      requireThat(
        !["lobby", "final"].includes(r.phase),
        "Start a match first.",
      );
      advance(r, now);
    }
    if (a.type === "pause") {
      requireThat(
        !r.paused && !["lobby", "final"].includes(r.phase),
        "Nothing to pause.",
      );
      r.remaining = Math.max(0, (r.deadline ?? now) - now);
      r.paused = true;
      r.deadline = null;
    }
    if (a.type === "resume") {
      requireThat(r.paused, "The game is already live.");
      r.paused = false;
      r.deadline = ["write", "predict", "vote"].includes(r.phase)
        ? now + r.remaining
        : null;
    }
    if (a.type === "lobby") {
      r.phase = "lobby";
      r.deadline = null;
      r.paused = false;
      r.round = null;
    }
    if (a.type === "finish") {
      r.phase = "final";
      r.deadline = null;
      r.paused = false;
    }
    return {};
  }
  requireThat(player, "Join the room first.");
  requireThat(!r.paused, "The host paused the game.");
  const rd = r.round;
  requireThat(rd && a.roundId === rd.id, "That round has ended.");
  requireThat(rd.eligible.includes(player.id), "You are watching this round.");
  requireThat(typeof a.value === "string", "Choose an answer.");
  if (a.type === "submit") {
    requireThat(r.phase === "write", "Submissions are closed.");
    requireThat(
      a.value.trim().length >= 1 && a.value.trim().length <= 100,
      "Write 1–100 characters.",
    );
    requireThat(normalize(a.value).length > 0, "Use letters or numbers.");
    if (rd.submissions[player.id]) return {};
    rd.submissions[player.id] = a.value.trim();
    if (rd.eligible.every((pid) => rd.submissions[pid])) advance(r, now);
  } else if (a.type === "predict") {
    requireThat(r.phase === "predict", "Predictions are closed.");
    requireThat(
      a.value === "skip" || rd.eligible.includes(a.value),
      "Choose a player.",
    );
    if (rd.predictions[player.id]) return {};
    rd.predictions[player.id] = a.value;
    if (rd.eligible.every((pid) => rd.predictions[pid])) advance(r, now);
  } else if (a.type === "vote") {
    requireThat(r.phase === "vote", "Voting is closed.");
    if (r.game === "bluff") {
      const option = rd.options.find((o) => o.id === a.value);
      requireThat(
        option && !option.owners.includes(player.id),
        "Choose somebody else’s answer.",
      );
    } else {
      requireThat(rd.eligible.includes(a.value), "Choose a player.");
      requireThat(
        r.settings.selfVote || a.value !== player.id,
        "Choose a friend, superstar.",
      );
    }
    if (rd.votes[player.id]) return {};
    rd.votes[player.id] = a.value;
    if (rd.eligible.every((pid) => rd.votes[pid])) advance(r, now);
  } else throw new Error("Unknown action.");
  return {};
}
export function view(r: Room, t: string, now = Date.now()): View {
  const host = hash(t) === r.hostHash;
  const me = r.players.find((p) => p.tokenHash === hash(t));
  requireThat(host || me, "Invalid room credentials.");
  const rd = r.round;
  const revealed = ["reveal", "leaderboard", "final"].includes(r.phase);
  const current =
    r.phase === "write"
      ? rd?.submissions
      : r.phase === "predict"
        ? rd?.predictions
        : rd?.votes;
  const counts: Record<string, number> = {};
  if (revealed && r.game === "likely")
    Object.values(rd?.votes ?? {}).forEach(
      (pid) => (counts[pid] = (counts[pid] ?? 0) + 1),
    );
  return {
    pin: r.pin,
    topic: r.topic,
    version: r.version,
    now,
    selfVote: r.settings.selfVote,
    players: r.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      scores: p.scores,
      total: p.scores.bluff + p.scores.likely,
    })),
    phase: r.phase,
    game: r.game,
    index: r.index,
    count: r.deck.length,
    deadline: r.deadline,
    paused: r.paused,
    me: me?.id ?? null,
    isHost: host,
    settings: host ? r.settings : undefined,
    question: rd?.question,
    roundId: rd?.id,
    options:
      rd &&
      r.game === "bluff" &&
      ["vote", "reveal", "leaderboard", "final"].includes(r.phase)
        ? rd.options.map((o) => ({
            id: o.id,
            text: o.text,
            own: !!me && o.owners.includes(me.id),
          }))
        : undefined,
    submitted: !!me && !!rd?.submissions[me.id],
    voted: !!me && !!rd?.votes[me.id],
    predicted: !!me && !!rd?.predictions[me.id],
    eligible: !!me && !!rd?.eligible.includes(me.id),
    progress: Object.keys(current ?? {}).length,
    result:
      revealed && rd
        ? {
            answer: rd.answer,
            source: rd.source,
            explanation: rd.explanation,
            options: rd.options,
            votes: r.game === "bluff" ? rd.votes : undefined,
            counts: r.game === "likely" ? counts : undefined,
            predictions: r.game === "likely" ? rd.predictions : undefined,
            deltas: rd.deltas,
            note: rd.note,
          }
        : undefined,
  };
}
