"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Trash2,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Home,
  Crown,
  RefreshCw,
  Check,
  Copy,
  Settings2,
} from "lucide-react";
import type { Action, Game, Settings, View } from "@/lib/types";
import { prompts } from "@/data/prompts";
import { Decor, Diya } from "./Decor";
const avatars = ["😎", "🦊", "👽", "🐯", "🦄", "🐸", "🐼", "🤖"];
const labels = {
  lobby: "THE GANG’S ALL HERE",
  write: "MAKE SOMETHING UP",
  predict: "CALL IT BEFORE THE CHAOS",
  vote: "LOCK IN YOUR PICK",
  reveal: "THE MOMENT OF TRUTH",
  leaderboard: "THE SCOREBOARD",
  final: "A LEGEND HAS BEEN CROWNED",
};
type Credential = { pin: string; token: string };
function total(p: View["players"][number]) {
  return p.total;
}
export default function Party({ host }: { host: boolean }) {
  const [credential, setCredential] = useState<Credential | null>(null);
  const [state, setState] = useState<View | null>(null);
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(true);
  const [connected, setConnected] = useState(false);
  const [origin, setOrigin] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const [game, setGame] = useState<Game>("bluff");
  const [confirm, setConfirm] = useState("");
  const [copied, setCopied] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const stateRef = useRef<View | null>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  const key = host ? "dpr-host" : "dpr-player";
  useEffect(() => {
    setOrigin(process.env.NEXT_PUBLIC_JOIN_ORIGIN || window.location.origin);
    const q = new URLSearchParams(location.search);
    setPin(q.get("pin") ?? "");
    if (q.get("game") === "likely") setGame("likely");
    try {
      const saved = localStorage.getItem(key);
      if (saved) setCredential(JSON.parse(saved));
    } catch {
      setStorageWarning(true);
    }
  }, [key]);
  const accept = useCallback((s: View, started: number) => {
    if (
      stateRef.current &&
      s.pin === stateRef.current.pin &&
      s.version < stateRef.current.version
    )
      return;
    stateRef.current = s;
    setState(s);
    setClock(Date.now());
    setOffset(s.now - (started + Date.now()) / 2);
    setConnected(true);
  }, []);
  const send = useCallback(
    async (action: Action, cred = credential, quiet = false) => {
      const started = Date.now();
      const requestGeneration = generation.current;
      const response = await fetch("/api/party", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cred ? { Authorization: `Bearer ${cred.token}` } : {}),
        },
        body: JSON.stringify({ pin: cred?.pin ?? pin, action }),
      });
      const result = await response.json();
      if (requestGeneration !== generation.current) return result;
      if (!response.ok) throw new Error(result.error || "Could not connect.");
      if (result.token) {
        const c = { pin: result.state.pin, token: result.token };
        try {
          localStorage.setItem(key, JSON.stringify(c));
        } catch {
          setStorageWarning(true);
        }
        setCredential(c);
      }
      accept(result.state, started);
      if (!quiet) setError("");
      return result;
    },
    [credential, pin, key, accept],
  );
  useEffect(() => {
    if (!credential) return;
    let gone = false;
    let active = false;
    async function sync() {
      if (active || gone) return;
      active = true;
      try {
        await send({ type: "sync" }, credential, true);
      } catch (e) {
        if (!gone) {
          setConnected(false);
          setError((e as Error).message);
        }
      } finally {
        active = false;
      }
    }
    void sync();
    const timer = setInterval(sync, 1200);
    const focus = () => void sync();
    window.addEventListener("online", focus);
    window.addEventListener("focus", focus);
    let client: ReturnType<typeof createClient> | undefined;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const topic = stateRef.current?.topic;
    if (url && anon && topic) {
      client = createClient(url, anon, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      client
        .channel(`signals:${topic}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "party_signals",
            filter: `topic=eq.${topic}`,
          },
          focus,
        )
        .subscribe();
    }
    return () => {
      gone = true;
      clearInterval(timer);
      window.removeEventListener("online", focus);
      window.removeEventListener("focus", focus);
      if (client) void client.removeAllChannels();
    };
  }, [credential, send, state?.topic]);
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 150);
    return () => clearInterval(t);
  }, []);
  const seconds = state?.deadline
    ? Math.max(0, Math.ceil((state.deadline - clock - offset) / 1000))
    : 0;
  const beep = useCallback(
    (frequency: number, duration = 0.12) => {
      if (muted) return;
      try {
        const ctx = audio.current ?? new AudioContext();
        audio.current = ctx;
        void ctx.resume();
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.value = frequency;
        g.gain.setValueAtTime(0.07, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        o.start();
        o.stop(ctx.currentTime + duration);
      } catch {}
    },
    [muted],
  );
  useEffect(() => {
    if (seconds > 0 && seconds <= 5 && !state?.paused) beep(480 + seconds * 65);
  }, [seconds, state?.paused, beep]);
  useEffect(() => {
    setText("");
    if (state?.phase === "reveal" || state?.phase === "final") beep(880, 0.65);
  }, [state?.phase, state?.roundId, beep]);
  async function act(action: Action) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await send({
        ...action,
        roundId: stateRef.current?.roundId,
        version: stateRef.current?.version,
      });
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  function leave() {
    generation.current++;
    try {
      localStorage.removeItem(key);
    } catch {}
    setState(null);
    stateRef.current = null;
    setCredential(null);
    setConfirm("");
    setError("");
  }
  const joinUrl = state
    ? `${process.env.NEXT_PUBLIC_JOIN_ORIGIN || state.joinOrigin || origin}/join?pin=${state.pin}`
    : "";
  const player = (pid: string) => state?.players.find((p) => p.id === pid);
  const sorted = state
    ? [...state.players].sort(
        (a, b) => total(b) - total(a) || a.avatar - b.avatar,
      )
    : [];
  const rank = (p: View["players"][number]) =>
    1 + sorted.filter((q) => q.total > p.total).length;
  const myself = state?.players.find((p) => p.id === state.me);
  return (
    <main className={`party-shell ${host ? "host-shell" : "phone-shell"}`}>
      <Decor />
      <header className="party-header">
        <Link href="/" className="brand">
          <span className="brand-mark">✳</span> PARTY ROYALE
        </Link>
        <div className="header-tools">
          {state && (
            <span className={`connection ${connected ? "" : "offline"}`}>
              <i />
              {connected ? "LIVE" : "RECONNECTING"}
            </span>
          )}
          <button
            className="icon-button"
            aria-label={muted ? "Turn sound on" : "Mute sound"}
            onClick={() => {
              setMuted(!muted);
              if (muted) {
                try {
                  audio.current ??= new AudioContext();
                  void audio.current.resume();
                } catch {}
              }
            }}
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          {state && (
            <button className="text-button" onClick={() => setConfirm("leave")}>
              Leave
            </button>
          )}
        </div>
      </header>
      {storageWarning && (
        <p className="notice">
          Browser storage is unavailable. Keep this tab open to preserve your
          seat.
        </p>
      )}
      {!state ? (
        <section className="entry-panel">
          <Diya className="entry-diya" />
          <span className="kicker">
            {host ? "YOUR LIVING ROOM IS THE STAGE" : "THE PARTY IS WAITING"}
          </span>
          <h1>
            {host ? (
              <>
                Let’s make
                <br />
                <em>some memories.</em>
              </>
            ) : (
              <>
                You’re on
                <br />
                <em>the guest list.</em>
              </>
            )}
          </h1>
          <p>
            {host
              ? "One screen. Eight phones. A lot of friendly chaos."
              : "Grab your nickname. Bring your best poker face."}
          </p>
          {host ? (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => void act({ type: "create" })}
            >
              {busy ? "Lighting the diyas…" : "Create Party"}
              <ArrowRight size={20} />
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act({ type: "join", name });
              }}
            >
              <label>
                ROOM PIN
                <input
                  aria-label="Room PIN"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder="ABC234"
                  autoCapitalize="characters"
                  required
                />
              </label>
              <label>
                YOUR NICKNAME
                <input
                  aria-label="Nickname"
                  maxLength={20}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="The main character"
                  required
                />
              </label>
              <button className="button primary" disabled={busy}>
                {busy ? "Finding your seat…" : "I’m in!"}
                <ArrowRight size={20} />
              </button>
            </form>
          )}
          <span className="entry-foot">
            {host
              ? "The host can join from their phone, too."
              : "No account. Just good company."}
          </span>
          {credential && (
            <button className="text-button" onClick={leave}>
              Forget saved room
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="room-strip">
            <span>
              {host
                ? "PROJECTOR / HOST"
                : `${avatars[myself?.avatar ?? 0]} ${myself?.name ?? "PLAYER"}`}
            </span>
            <span>
              ROOM <b>{state.pin}</b>
            </span>
            <span>
              {state.phase === "lobby"
                ? `${state.players.length}/8 FRIENDS`
                : `${state.game === "bluff" ? "BLUFF MASTERS" : "WHO’S MOST LIKELY TO?"} · ${state.index + 1}/${state.count}`}
            </span>
          </div>
          {state.backend === "local" && (
            <p className="local-label">
              LOCAL PARTY · Same Wi-Fi required · Keep this laptop running
            </p>
          )}
          {state.paused && (
            <div className="pause-banner">
              <Pause size={18} /> Snack break. The host has paused the party.
            </div>
          )}
          {state.phase === "lobby" ? (
            <section className="lobby">
              <div className="lobby-main">
                <span className="kicker">THE MORE, THE MERRIER</span>
                <h1>
                  {host ? (
                    <>
                      The gang’s
                      <br />
                      <em>getting together.</em>
                    </>
                  ) : (
                    <>
                      You’re in,
                      <br />
                      <em>{myself?.name}!</em>
                    </>
                  )}
                </h1>
                <p>
                  {host
                    ? "Scan. Join. Let the friendly rivalry begin."
                    : "Make yourself comfortable. The host will start the fun."}
                </p>
                <div className="player-grid">
                  {state.players.map((p) => (
                    <div
                      className={`player-tile avatar-${p.avatar}`}
                      key={p.id}
                    >
                      <span>{avatars[p.avatar]}</span>
                      <strong>{p.name}</strong>
                      {p.total > 0 && (
                        <small>{p.total.toLocaleString()} pts</small>
                      )}
                    </div>
                  ))}
                  {Array.from(
                    { length: Math.max(0, 8 - state.players.length) },
                    (_, i) => (
                      <div className="empty-seat" key={i}>
                        <span>+</span>
                        <small>Open seat</small>
                      </div>
                    ),
                  )}
                </div>
                {host && (
                  <>
                    <div className="game-selector">
                      <button
                        onClick={() => setGame("bluff")}
                        className={game === "bluff" ? "selected" : ""}
                      >
                        <span>🎭</span>
                        <strong>Bluff Masters</strong>
                        <small>5 rounds · Outwit your friends</small>
                      </button>
                      <button
                        onClick={() => setGame("likely")}
                        className={game === "likely" ? "selected" : ""}
                      >
                        <span>👀</span>
                        <strong>Who’s Most Likely To?</strong>
                        <small>8 rounds · The group has opinions</small>
                      </button>
                    </div>
                    <button
                      className="button primary"
                      disabled={busy || state.players.length < 2}
                      onClick={() => void act({ type: "start", game })}
                    >
                      Let’s play{" "}
                      {game === "bluff"
                        ? "Bluff Masters"
                        : "Who’s Most Likely To?"}
                      <ArrowRight size={19} />
                    </button>
                    {state.players.length < 2 && (
                      <small className="subtle">
                        Join with at least two phones to start.
                      </small>
                    )}
                  </>
                )}
              </div>
              {host && (
                <aside className="join-panel">
                  <span className="kicker">YOUR PHONE = YOUR CONTROLLER</span>
                  <div className="qr">
                    <QRCodeSVG value={joinUrl} size={212} marginSize={2} />
                  </div>
                  <span className="subtle">
                    or open{" "}
                    {(
                      process.env.NEXT_PUBLIC_JOIN_ORIGIN ||
                      state.joinOrigin ||
                      origin
                    ).replace(/^https?:\/\//, "")}
                    /join
                  </span>
                  <div className="pin-code">{state.pin}</div>
                  <button
                    className="text-button copy-button"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(joinUrl)
                        .then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        })
                        .catch(() => setError(`Join link: ${joinUrl}`));
                    }}
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
                    {copied ? "Copied!" : "Copy join link"}
                  </button>
                  <p>
                    Hosting and playing?
                    <br />
                    Scan with your own phone.
                  </p>
                  <span className="tiny-tag">8 FRIENDS · NO DOWNLOADS</span>
                </aside>
              )}
              {host && game === "likely" && state.settings && (
                <PromptEditor
                  settings={state.settings}
                  busy={busy}
                  save={(settings) => act({ type: "settings", settings })}
                />
              )}
            </section>
          ) : (
            <section className="game-stage">
              <div className="stage-heading">
                <span className="kicker">{labels[state.phase]}</span>
                {state.deadline && (
                  <div
                    className={`timer ${seconds <= 5 ? "urgent" : ""}`}
                    role="timer"
                    aria-label={`${seconds} seconds left`}
                  >
                    {seconds}
                    <small>SEC</small>
                  </div>
                )}
              </div>
              {!["leaderboard", "final"].includes(state.phase) && (
                <h1 className="question">{state.question}</h1>
              )}
              {state.phase === "write" && (
                <>
                  <p className="stage-subtitle">
                    {host
                      ? "Sell a beautiful lie. Make it sound like a fact."
                      : "Make up a convincing fake answer. Keep it short. Keep it believable."}
                  </p>
                  {!host &&
                    (state.submitted ? (
                      <Locked text="Bluff locked in. Your poker face looks great." />
                    ) : (
                      <form
                        className="answer-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void act({ type: "submit", value: text });
                        }}
                      >
                        <input
                          aria-label="Your bluff"
                          autoComplete="off"
                          maxLength={100}
                          placeholder="The completely believable answer is…"
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          disabled={state.paused}
                          required
                        />
                        <small>{text.length}/100 characters</small>
                        <button
                          className="button primary"
                          disabled={busy || state.paused}
                        >
                          Submit my bluff <ArrowRight size={18} />
                        </button>
                      </form>
                    ))}
                  <Progress
                    value={state.progress}
                    max={state.players.length}
                    label="bluffs locked in"
                  />
                </>
              )}
              {state.phase === "predict" && (
                <>
                  <p className="stage-subtitle">
                    Who will get the most votes? Call it correctly for +300.
                    This is your secret prediction.
                  </p>
                  {!host &&
                    (state.predicted ? (
                      <Locked text="Prediction sealed. No peeking." />
                    ) : (
                      <>
                        <div className="choice-grid">
                          {state.players.map((p) => (
                            <button
                              className={`choice avatar-${p.avatar}`}
                              key={p.id}
                              disabled={busy || state.paused}
                              onClick={() =>
                                void act({ type: "predict", value: p.id })
                              }
                            >
                              <span>{avatars[p.avatar]}</span>
                              {p.name}
                            </button>
                          ))}
                        </div>
                        <button
                          className="text-button"
                          disabled={busy || state.paused}
                          onClick={() =>
                            void act({ type: "predict", value: "skip" })
                          }
                        >
                          Skip prediction
                        </button>
                      </>
                    ))}
                  <Progress
                    value={state.progress}
                    max={state.players.length}
                    label="predictions sealed"
                  />
                </>
              )}
              {state.phase === "vote" && (
                <>
                  <p className="stage-subtitle">
                    {state.game === "bluff"
                      ? "One truth is hiding among these beautiful lies. Find it."
                      : "Anonymous votes. Unanimous chaos. Pick your person."}
                  </p>
                  {!host && state.voted ? (
                    <Locked text="Vote locked. Let the drama unfold." />
                  ) : (
                    <div className="choice-grid">
                      {state.game === "bluff"
                        ? state.options?.map((o, i) => (
                            <button
                              className={`choice answer-choice color-${i % 6}`}
                              key={o.id}
                              disabled={host || busy || state.paused || o.own}
                              onClick={() =>
                                void act({ type: "vote", value: o.id })
                              }
                            >
                              <span className="answer-letter">
                                {String.fromCharCode(65 + i)}
                              </span>
                              {o.text}
                              {o.own && <small>Your bluff</small>}
                            </button>
                          ))
                        : state.players.map((p) => (
                            <button
                              key={p.id}
                              className={`choice avatar-${p.avatar}`}
                              disabled={
                                host ||
                                busy ||
                                state.paused ||
                                (p.id === state.me && !state.selfVote)
                              }
                              onClick={() =>
                                void act({ type: "vote", value: p.id })
                              }
                            >
                              <span>{avatars[p.avatar]}</span>
                              {p.name}
                            </button>
                          ))}
                    </div>
                  )}
                  <Progress
                    value={state.progress}
                    max={state.players.length}
                    label="votes locked in"
                  />
                </>
              )}
              {state.phase === "reveal" && state.result && (
                <div className="reveal">
                  <span className="reveal-burst">✦</span>
                  {state.game === "bluff" ? (
                    <>
                      <span className="kicker">
                        THE ACTUAL, UNBELIEVABLE TRUTH
                      </span>
                      <h2>{state.result.answer}</h2>
                      <p>{state.result.explanation}</p>
                      {state.result.source && (
                        <a
                          className="source-link"
                          href={state.result.source}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Check the fact ↗
                        </a>
                      )}
                      {state.result.note && (
                        <p className="notice">{state.result.note}</p>
                      )}
                      <div className="bluff-results">
                        {state.result.options.map((o) => (
                          <div
                            className={`bluff-result ${o.correct ? "truth" : ""}`}
                            key={o.id}
                          >
                            <strong>{o.text}</strong>
                            <span>
                              {o.correct
                                ? "✓ The truth"
                                : `Bluff by ${o.owners.map((pid) => player(pid)?.name).join(" & ")}`}
                            </span>
                            <small>
                              {Object.entries(state.result!.votes ?? {})
                                .filter(([, oid]) => oid === o.id)
                                .map(([pid]) => player(pid)?.name)
                                .join(", ") || "No votes"}{" "}
                              {Object.values(
                                state.result!.votes ?? {},
                              ).includes(o.id)
                                ? "picked this"
                                : ""}
                            </small>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2>
                        {Object.values(state.result.counts ?? {}).length
                          ? "The group has spoken."
                          : "A beautifully mysterious round."}
                      </h2>
                      <p>
                        {Object.values(state.result.counts ?? {}).length
                          ? "Consider this your honorary title. Wear it with pride."
                          : "No votes this time. Your secrets are safe."}
                      </p>
                      <div className="vote-bars">
                        {[...state.players]
                          .sort(
                            (a, b) =>
                              (state.result?.counts?.[b.id] ?? 0) -
                                (state.result?.counts?.[a.id] ?? 0) ||
                              a.avatar - b.avatar,
                          )
                          .map((p) => (
                            <div className="vote-bar" key={p.id}>
                              <span>
                                {avatars[p.avatar]} {p.name}
                              </span>
                              <div>
                                <i
                                  className={`avatar-${p.avatar}`}
                                  style={{
                                    width: `${((state.result?.counts?.[p.id] ?? 0) / Math.max(1, ...Object.values(state.result?.counts ?? {}))) * 100}%`,
                                  }}
                                />
                              </div>
                              <b>{state.result?.counts?.[p.id] ?? 0}</b>
                            </div>
                          ))}
                      </div>
                      <p className="subtle">
                        Individual votes stay anonymous. Tied leaders all count
                        for predictions.
                      </p>
                    </>
                  )}
                  {!host && (
                    <div className="points-award">
                      +{state.result.deltas[state.me!] ?? 0}
                      <small>POINTS THIS ROUND</small>
                    </div>
                  )}
                </div>
              )}
              {["leaderboard", "final"].includes(state.phase) && (
                <>
                  <h1 className="score-title">
                    {state.phase === "final" ? (
                      <>
                        All hail the
                        <br />
                        <em>party royalty.</em>
                      </>
                    ) : (
                      <>
                        A little friendly
                        <br />
                        <em>competition.</em>
                      </>
                    )}
                  </h1>
                  {state.phase === "final" && (
                    <>
                      <div className="confetti" aria-hidden="true">
                        {Array.from({ length: 38 }, (_, i) => (
                          <i
                            key={i}
                            style={{
                              left: `${(i * 37) % 100}%`,
                              animationDelay: `${i * 0.07}s`,
                              background: [
                                "#ffc864",
                                "#f78bc8",
                                "#a7e4c6",
                                "#b6a0ff",
                              ][i % 4],
                            }}
                          />
                        ))}
                      </div>
                      <div className="podium">
                        {[1, 0, 2].map(
                          (i) =>
                            sorted[i] && (
                              <div
                                key={sorted[i].id}
                                className={`podium-place place-${i}`}
                              >
                                <span>
                                  {i === 0 ? (
                                    <Crown size={30} />
                                  ) : (
                                    rank(sorted[i])
                                  )}
                                </span>
                                <div
                                  className={`podium-avatar avatar-${sorted[i].avatar}`}
                                >
                                  {avatars[sorted[i].avatar]}
                                </div>
                                <strong>{sorted[i].name}</strong>
                                <b>{sorted[i].total.toLocaleString()}</b>
                                <small>
                                  #{rank(sorted[i])} ·{" "}
                                  {i === 0
                                    ? "PARTY ROYALTY"
                                    : "CERTIFIED LEGEND"}
                                </small>
                              </div>
                            ),
                        )}
                      </div>
                      <p className="subtle">
                        Ties share a rank. Podium order within a tie follows
                        joining order.
                      </p>
                    </>
                  )}
                  <div className="leaderboard">
                    <div className="leaderboard-label">
                      <span>PLAYER</span>
                      <span>BLUFF</span>
                      <span>MOST LIKELY</span>
                      <span>TOTAL</span>
                    </div>
                    {sorted.map((p) => (
                      <div
                        className={`score-row ${p.id === state.me ? "my-score" : ""}`}
                        key={p.id}
                      >
                        <span>
                          <small>{rank(p)}</small>
                          <i className={`avatar-${p.avatar}`}>
                            {avatars[p.avatar]}
                          </i>
                          <strong>{p.name}</strong>
                        </span>
                        <span>{p.scores.bluff.toLocaleString()}</span>
                        <span>{p.scores.likely.toLocaleString()}</span>
                        <b>{p.total.toLocaleString()}</b>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {host && (
                <div className="host-controls">
                  {state.phase !== "final" && (
                    <>
                      <button
                        className="button primary"
                        disabled={busy || state.paused}
                        onClick={() => void act({ type: "next" })}
                      >
                        {state.phase === "reveal"
                          ? "See the scores"
                          : state.phase === "leaderboard"
                            ? state.index + 1 >= state.count
                              ? "Crown the winners"
                              : "Next round"
                            : "Close phase early"}
                        <ArrowRight size={18} />
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          void act({ type: state.paused ? "resume" : "pause" })
                        }
                      >
                        {state.paused ? (
                          <Play size={16} />
                        ) : (
                          <Pause size={16} />
                        )}{" "}
                        {state.paused ? "Resume" : "Pause"}
                      </button>
                    </>
                  )}
                  <button
                    className="icon-button"
                    title="Return to lobby"
                    aria-label="Return to lobby"
                    onClick={() => setConfirm("lobby")}
                  >
                    <Home size={20} />
                  </button>
                  <button
                    className="icon-button"
                    title="Restart match (keep scores)"
                    aria-label="Restart match"
                    onClick={() => setConfirm("restart")}
                  >
                    <RefreshCw size={20} />
                  </button>
                  {state.phase !== "final" && (
                    <button
                      className="text-button"
                      onClick={() => setConfirm("finish")}
                    >
                      Final podium
                    </button>
                  )}
                </div>
              )}
              {!host &&
                ["reveal", "leaderboard", "final"].includes(state.phase) && (
                  <p className="subtle">
                    Eyes on the big screen. Your host is in charge of the next
                    chapter.
                  </p>
                )}
            </section>
          )}
          <details className="rules">
            <summary>How the points work</summary>
            <p>
              <strong>Bluff Masters:</strong> +1,000 for the truth. +500 per
              opponent fooled by your bluff. Near-identical bluffs share a card;
              each author gets +500 per opponent fooled. Correct-answer
              submissions merge into the truth with no bluff credit.
            </p>
            <p>
              <strong>Most Likely To:</strong> +300 for predicting any tied
              top-voted player. Receiving votes earns no points. Predictions are
              optional. Scores carry between matches and both games. Restart
              keeps points; create a new party to reset.
            </p>
          </details>
        </>
      )}
      {error && (
        <div className="error-toast" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {confirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>
              {confirm === "leave"
                ? "Leave this screen?"
                : confirm === "restart"
                  ? "Remix this match?"
                  : confirm === "finish"
                    ? "Crown the party royalty?"
                    : "Back to the lobby?"}
            </h2>
            <p>
              {confirm === "leave"
                ? "This forgets your saved seat on this browser. A player seat cannot be reclaimed without its saved token."
                : confirm === "restart"
                  ? "Start a fresh set of rounds. Earned points stay."
                  : "The current round will close. Earned points stay."}
            </p>
            <div>
              <button
                className="button secondary"
                onClick={() => setConfirm("")}
              >
                Keep playing
              </button>
              <button
                className="button primary"
                onClick={() => {
                  if (confirm === "leave") leave();
                  else void act({ type: confirm });
                  setConfirm("");
                }}
              >
                Let’s do it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function Locked({ text }: { text: string }) {
  return (
    <div className="locked">
      <span>
        <Check size={30} />
      </span>
      <h2>{text}</h2>
      <p>Look up. Enjoy the suspense.</p>
    </div>
  );
}
function Progress({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  return (
    <div className="progress-wrap">
      <div className="progress-track">
        <i style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span>
        {value}/{max} {label}
      </span>
    </div>
  );
}
function PromptEditor({
  settings,
  busy,
  save,
}: {
  settings: Settings;
  busy: boolean;
  save: (s: Settings) => Promise<boolean | undefined>;
}) {
  const [draft, setDraft] = useState(settings);
  const [custom, setCustom] = useState("");
  const [changed, setChanged] = useState(false);
  function edit(s: Settings) {
    setDraft(s);
    setChanged(true);
  }
  return (
    <details className="prompt-editor">
      <summary>
        <Settings2 size={18} /> Set the vibe & customize prompts{" "}
        {changed && <b>· unsaved</b>}
      </summary>
      <div className="settings-row">
        <label>
          Party vibe
          <select
            value={draft.mode}
            onChange={(e) =>
              edit({ ...draft, mode: e.target.value as Settings["mode"] })
            }
          >
            <option value="family">Family Friendly</option>
            <option value="friends">Friends Unfiltered</option>
          </select>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={draft.predictions}
            onChange={(e) => edit({ ...draft, predictions: e.target.checked })}
          />{" "}
          Secret predictions
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={draft.selfVote}
            onChange={(e) => edit({ ...draft, selfVote: e.target.checked })}
          />{" "}
          Allow self-votes
        </label>
      </div>
      <p className="subtle">
        Use a random eight-prompt match, or build a playlist of exactly eight.
        Custom prompts use the currently selected mode.
      </p>
      <div className="editor-actions">
        <button
          className="button secondary"
          onClick={() =>
            edit({
              ...draft,
              prompts: prompts
                .filter((p) => draft.mode === "friends" || p.mode === "family")
                .slice(0, 8),
            })
          }
        >
          Load starter playlist
        </button>
        <button
          className="text-button"
          onClick={() => edit({ ...draft, prompts: [] })}
        >
          Use random prompts
        </button>
      </div>
      {draft.prompts.map((p, i) => (
        <div className="prompt-row" key={i}>
          <span>{i + 1}</span>
          <input
            aria-label={`Prompt ${i + 1}`}
            maxLength={220}
            value={p.text}
            onChange={(e) =>
              edit({
                ...draft,
                prompts: draft.prompts.map((q, j) =>
                  j === i ? { ...q, text: e.target.value } : q,
                ),
              })
            }
          />
          <button
            className="icon-button"
            aria-label={`Move prompt ${i + 1} up`}
            disabled={i === 0}
            onClick={() => {
              const a = [...draft.prompts];
              [a[i - 1], a[i]] = [a[i], a[i - 1]];
              edit({ ...draft, prompts: a });
            }}
          >
            <ArrowUp size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Move prompt ${i + 1} down`}
            disabled={i === draft.prompts.length - 1}
            onClick={() => {
              const a = [...draft.prompts];
              [a[i + 1], a[i]] = [a[i], a[i + 1]];
              edit({ ...draft, prompts: a });
            }}
          >
            <ArrowDown size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`Remove prompt ${i + 1}`}
            onClick={() =>
              edit({
                ...draft,
                prompts: draft.prompts.filter((_, j) => i !== j),
              })
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {draft.prompts.length < 8 && (
        <div className="add-prompt">
          <input
            aria-label="New prompt"
            maxLength={220}
            placeholder="Who is most likely to…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button
            className="button secondary"
            disabled={custom.trim().length < 8}
            onClick={() => {
              edit({
                ...draft,
                prompts: [
                  ...draft.prompts,
                  { text: custom.trim(), mode: draft.mode },
                ],
              });
              setCustom("");
            }}
          >
            Add prompt
          </button>
        </div>
      )}
      <button
        className="button primary"
        disabled={busy || !changed || ![0, 8].includes(draft.prompts.length)}
        onClick={async () => {
          if (await save(draft)) setChanged(false);
        }}
      >
        Save game settings <Check size={17} />
      </button>
    </details>
  );
}
