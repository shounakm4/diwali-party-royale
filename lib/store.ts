import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Room } from "./types";
import { mkdirSync } from "node:fs";
import path from "node:path";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const cloud = !!(
  url &&
  service &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
function supabase() {
  return createClient(url!, service!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
async function sqlite() {
  if (process.env.VERCEL)
    throw new Error(
      "Configure all three Supabase environment variables before running on Vercel.",
    );
  const { DatabaseSync } = await import("node:sqlite");
  const dir = path.join(process.cwd(), ".local");
  mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "party.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS rooms (pin TEXT PRIMARY KEY, version INTEGER NOT NULL, state TEXT NOT NULL)",
  );
  return db;
}
export async function readRoom(pin: string): Promise<Room | null> {
  if (cloud) {
    const { data, error } = await supabase()
      .from("party_rooms")
      .select("state")
      .eq("pin", pin)
      .maybeSingle();
    if (error) throw error;
    return data?.state ?? null;
  }
  const db = await sqlite();
  try {
    const row = db.prepare("SELECT state FROM rooms WHERE pin=?").get(pin) as
      { state: string } | undefined;
    return row ? JSON.parse(row.state) : null;
  } finally {
    db.close();
  }
}
export async function insertRoom(r: Room) {
  if (cloud) {
    const { error } = await supabase()
      .from("party_rooms")
      .insert({ pin: r.pin, version: r.version, state: r });
    if (error) {
      if (error.code === "23505") return false;
      throw error;
    }
    return true;
  }
  const db = await sqlite();
  try {
    return (
      db
        .prepare("INSERT OR IGNORE INTO rooms VALUES(?,?,?)")
        .run(r.pin, r.version, JSON.stringify(r)).changes === 1
    );
  } finally {
    db.close();
  }
}
export async function saveRoom(r: Room, version: number) {
  if (cloud) {
    const { data, error } = await supabase().rpc("party_compare_swap", {
      p_pin: r.pin,
      p_version: version,
      p_state: r,
    });
    if (error) throw error;
    return data === true;
  }
  const db = await sqlite();
  try {
    return (
      db
        .prepare(
          "UPDATE rooms SET version=?, state=? WHERE pin=? AND version=?",
        )
        .run(r.version, JSON.stringify(r), r.pin, version).changes === 1
    );
  } finally {
    db.close();
  }
}
