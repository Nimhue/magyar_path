/**
 * Accounts, automatic sync and one-time transfer codes.
 * Talks to the Netlify Function in netlify/functions (same site, /api/*).
 */
import { useSyncExternalStore } from "react";
import { mergeProgress } from "./merge";
import { getImage, listFolders, listNotes, mergeNotes, onNotesChange, putImage, tombstones } from "./notesDb";
import { getState, onLocalChange, replaceState, type Progress } from "./store";

const SESSION = "magyar-path:session";
const UPLOADED = "magyar-path:uploaded-photos";

export interface Session {
  token: string;
  username: string;
}

interface CloudStatus {
  session: Session | null;
  state: "idle" | "syncing" | "error" | "offline";
  last: number;
  message: string;
}

let status: CloudStatus = { session: readSession(), state: "idle", last: 0, message: "" };
const listeners = new Set<() => void>();
const set = (s: Partial<CloudStatus>) => {
  status = { ...status, ...s };
  listeners.forEach((l) => l());
};

export function useCloud() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status
  );
}

function readSession(): Session | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION) ?? "null");
  } catch {
    return null;
  }
}
function writeSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION, JSON.stringify(s));
    else localStorage.removeItem(SESSION);
  } catch {
    /* ignore */
  }
  set({ session: s });
}

/** Sync and transfer need the online site; the double-click offline file has no server. */
export const cloudAvailable = () => location.protocol.startsWith("http");

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

async function api(path: string, init: RequestInit = {}, auth = true) {
  const headers = new Headers(init.headers);
  if (auth && status.session) headers.set("authorization", `Bearer ${status.session.token}`);
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, { ...init, headers });
  } catch {
    throw new ApiError("You seem to be offline. Your progress is saved here and will sync later.", 0);
  }
  if (!res.ok) {
    let msg = `Server error (${res.status}).`;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      if (res.status === 404) msg = "Sync isn't available on this copy of the site.";
    }
    if (res.status === 401 && auth) writeSession(null);
    throw new ApiError(msg, res.status);
  }
  return res;
}

/* ---------- account ---------- */

export async function signUp(username: string, password: string) {
  const res = await api("signup", { method: "POST", body: JSON.stringify({ username, password }) }, false);
  writeSession(await res.json());
  await syncNow();
}

export async function signIn(username: string, password: string) {
  const res = await api("login", { method: "POST", body: JSON.stringify({ username, password }) }, false);
  writeSession(await res.json());
  await syncNow();
}

export async function signOut() {
  try {
    await api("logout", { method: "POST" });
  } catch {
    /* sign out locally anyway */
  }
  writeSession(null);
  set({ state: "idle", message: "" });
}

export async function deleteAccount(password: string) {
  await api("account", { method: "DELETE", body: JSON.stringify({ password }) });
  writeSession(null);
}

/* ---------- sync ---------- */

function uploadedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(UPLOADED) ?? "[]"));
  } catch {
    return new Set();
  }
}
function saveUploaded(s: Set<string>) {
  try {
    localStorage.setItem(UPLOADED, JSON.stringify([...s]));
  } catch {
    /* ignore */
  }
}

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (!status.session || !cloudAvailable()) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    set({ state: "syncing", message: "" });
    try {
      const remote = await (await api("sync")).json();
      const rd = remote?.data ?? null;
      // progress
      const merged = mergeProgress(getState(), rd?.progress as Progress | undefined);
      replaceState(merged);
      // notes (text) — merged locally, then pushed back
      const notes = await mergeNotes({ folders: rd?.folders ?? [], notes: rd?.notes ?? [], deleted: rd?.deleted ?? {} });
      // photos: upload ours that the server lacks, download ones we lack
      const uploaded = uploadedSet();
      const serverPhotos = new Set<string>(rd?.photos ?? []);
      for (const id of serverPhotos) uploaded.add(id);
      for (const n of notes.notes)
        for (const id of n.images) {
          const local = await getImage(id);
          if (local && !uploaded.has(id)) {
            await api(`photo?id=${id}`, { method: "PUT", body: local });
            uploaded.add(id);
          } else if (!local && serverPhotos.has(id)) {
            const blob = await (await api(`photo?id=${id}`)).blob();
            await putImage(id, blob);
          }
        }
      saveUploaded(uploaded);
      const photos = notes.notes.flatMap((n) => n.images).filter((id) => uploaded.has(id));
      await api("sync", {
        method: "PUT",
        body: JSON.stringify({ data: { progress: getState(), folders: notes.folders, notes: notes.notes, deleted: notes.deleted, photos } }),
      });
      set({ state: "idle", last: Date.now(), message: "" });
    } catch (e) {
      const err = e as ApiError;
      set({ state: err.status === 0 ? "offline" : "error", message: err.message });
    } finally {
      running = null;
      if (again) {
        again = false;
        void syncNow();
      }
    }
  })();
  return running;
}

let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync(delay = 4000) {
  if (!status.session) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}

/** Call once at startup: syncs on open, after changes, and when you come back to the tab. */
export function startAutoSync() {
  if (!cloudAvailable()) return;
  onLocalChange(() => scheduleSync());
  onNotesChange(() => scheduleSync());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleSync(300);
    else if (timer) {
      clearTimeout(timer);
      void syncNow();
    }
  });
  window.addEventListener("online", () => scheduleSync(300));
  scheduleSync(500);
}

/* ---------- one-time transfer codes ---------- */

const CHUNK = 3_000_000;

async function gzipBase64(text: string): Promise<string> {
  if (!("CompressionStream" in window)) return "raw:" + text;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return "gz:" + btoa(bin);
}
async function gunzipBase64(s: string): Promise<string> {
  if (s.startsWith("raw:")) return s.slice(4);
  const bin = atob(s.slice(3));
  const buf = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

const toDataUrl = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(b);
  });

/** Packs progress + notes (+ photos) and uploads them. Returns the 8-character code. */
export async function sendTransfer(withPhotos: boolean, onProgress?: (f: number) => void): Promise<string> {
  const [folders, notes] = await Promise.all([listFolders(), listNotes()]);
  const images: Record<string, string> = {};
  if (withPhotos)
    for (const n of notes)
      for (const id of n.images) {
        const b = await getImage(id);
        if (b) images[id] = await toDataUrl(b);
      }
  const payload = await gzipBase64(
    JSON.stringify({ kind: "magyar-path-transfer", v: 1, progress: getState(), folders, notes, deleted: tombstones(), images })
  );
  const parts = Math.max(1, Math.ceil(payload.length / CHUNK));
  if (parts > 25) throw new ApiError("That's too much to send at once. Try without photos.", 413);
  let code = "";
  for (let i = 0; i < parts; i++) {
    const res = await api(`transfer?part=${i}&total=${parts}${code ? `&code=${code}` : ""}`, {
      method: "POST",
      body: payload.slice(i * CHUNK, (i + 1) * CHUNK),
    }, false);
    code = (await res.json()).code;
    onProgress?.((i + 1) / parts);
  }
  return code;
}

/** Downloads a transfer and merges it into this device. */
export async function receiveTransfer(rawCode: string, onProgress?: (f: number) => void) {
  const code = rawCode.trim();
  const meta = await (await api(`transfer?code=${encodeURIComponent(code)}`, {}, false)).json();
  let payload = "";
  for (let i = 0; i < meta.total; i++) {
    payload += await (await api(`transfer?code=${encodeURIComponent(code)}&part=${i}`, {}, false)).text();
    onProgress?.((i + 1) / meta.total);
  }
  const data = JSON.parse(await gunzipBase64(payload));
  if (data?.kind !== "magyar-path-transfer") throw new ApiError("This code doesn't contain Magyar Path data.", 400);
  for (const [id, url] of Object.entries(data.images as Record<string, string>)) {
    const blob = await (await fetch(url)).blob();
    await putImage(id, blob);
  }
  await mergeNotes({ folders: data.folders, notes: data.notes, deleted: data.deleted ?? {} });
  replaceState(mergeProgress(getState(), data.progress));
  try {
    await api(`transfer?code=${encodeURIComponent(code)}`, { method: "DELETE" }, false);
  } catch {
    /* it expires anyway */
  }
  scheduleSync(500);
}
