import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { networkInterfaces } from "node:os";
import { apply, hash, makeRoom, token, view } from "@/lib/engine";
import { cloud, insertRoom, readRoom, saveRoom } from "@/lib/store";
import type { Action } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function joinOrigin(req: NextRequest) {
  if (cloud) return undefined;
  const address = Object.values(networkInterfaces())
    .flat()
    .find((a) => a?.family === "IPv4" && !a.internal)?.address;
  return address ? `http://${address}:${req.nextUrl.port || 3000}` : undefined;
}
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    if (
      origin &&
      origin !== req.nextUrl.origin &&
      new URL(origin).host !== req.headers.get("host")
    )
      return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
    const raw = await req.text();
    if (raw.length > 16000)
      return NextResponse.json(
        { error: "Request too large." },
        { status: 413 },
      );
    const body = JSON.parse(raw);
    const a: Action = body.action;
    if (!a || typeof a.type !== "string") throw new Error("Missing action.");
    const auth = req.headers.get("authorization")?.replace(/^Bearer /, "");
    a.token = auth;
    if (a.type === "create") {
      const t = token();
      for (let i = 0; i < 10; i++) {
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const pin = Array.from(
          { length: 6 },
          () => alphabet[randomInt(alphabet.length)],
        ).join("");
        const r = makeRoom(pin, t);
        if (await insertRoom(r))
          return NextResponse.json({
            token: t,
            state: {
              ...view(r, t),
              backend: cloud ? "supabase" : "local",
              joinOrigin: joinOrigin(req),
            },
          });
      }
      throw new Error("Could not create a unique PIN. Try again.");
    }
    const pin = String(body.pin ?? "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(pin))
      throw new Error("Enter your six-character room PIN.");
    for (let attempt = 0; attempt < 16; attempt++) {
      const r = await readRoom(pin);
      if (!r) throw new Error("Party not found. Check your PIN.");
      if (Date.now() - r.created > 48 * 60 * 60 * 1000)
        throw new Error("This party expired. Create a new room.");
      if (
        a.type !== "join" &&
        (!auth ||
          !(
            r.hostHash === hash(auth) ||
            r.players.some((p) => p.tokenHash === hash(auth))
          ))
      )
        return NextResponse.json(
          {
            error:
              "Room credentials expired. Rejoin from your original device.",
          },
          { status: 401 },
        );
      const previous = r.version;
      const old = JSON.stringify(r);
      const result = apply(r, a);
      if (old !== JSON.stringify(r)) {
        r.version++;
        if (!(await saveRoom(r, previous))) continue;
      }
      const t = result.playerToken ?? auth!;
      return NextResponse.json(
        {
          token: result.playerToken,
          state: {
            ...view(r, t),
            backend: cloud ? "supabase" : "local",
            joinOrigin: joinOrigin(req),
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "The room is busy. Please retry." },
      { status: 409 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    const safe = /fetch|database|relation|schema|JWT|key|column|sqlite/i.test(
      message,
    )
      ? "Backend configuration error. Check your server terminal and Supabase migration."
      : message;
    console.error("Party request:", message);
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
