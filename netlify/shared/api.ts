/**
 * Magyar Path backend: simple accounts (username + password, no email),
 * progress sync, photo storage and one-time transfer codes.
 * Storage is passed in so the same code runs on Netlify Blobs and in tests.
 */

export interface StoreLike {
  get(key: string, opts: { type: "json" }): Promise<any>;
  get(key: string, opts: { type: "arrayBuffer" }): Promise<ArrayBuffer | null>;
  get(key: string, opts: { type: "text" }): Promise<string | null>;
  setJSON(key: string, data: unknown): Promise<unknown>;
  set(key: string, data: string | ArrayBuffer | Blob): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  list(opts?: { prefix?: string }): Promise<{ blobs: { key: string }[] }>;
}

export type GetStore = (name: "users" | "sessions" | "data" | "photos" | "transfers") => StoreLike;

interface UserRecord {
  username: string;
  salt: string;
  hash: string;
  created: number;
  tokens: string[];
  fails: number;
  lockUntil: number;
}

const MAX_SYNC_BYTES = 4_500_000;
const MAX_PHOTO_BYTES = 5_500_000;
const MAX_TRANSFER_PARTS = 25;
const TRANSFER_TTL = 30 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));

async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 120_000 }, key, 256);
  return hex(bits);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (status: number, message: string) => json({ error: message }, status);

const normUser = (u: unknown) => (typeof u === "string" ? u.trim().toLowerCase() : "");
const validUser = (u: string) => /^[a-z0-9._-]{3,24}$/.test(u);

async function newSession(stores: GetStore, user: UserRecord) {
  const token = hex(rand(32));
  await stores("sessions").setJSON(token, { username: user.username, created: Date.now() });
  user.tokens = [...user.tokens.slice(-9), token];
  await stores("users").setJSON(user.username, user);
  return token;
}

async function authed(req: Request, stores: GetStore): Promise<string | null> {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const s = await stores("sessions").get(token, { type: "json" });
  return s?.username ?? null;
}

function makeCode() {
  const b = rand(8);
  const c = [...b].map((x) => CODE_ALPHABET[x % CODE_ALPHABET.length]).join("");
  return `${c.slice(0, 4)}-${c.slice(4)}`;
}
const validCode = (c: string) => /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(c);

async function pruneTransfers(store: StoreLike) {
  try {
    const { blobs } = await store.list({ prefix: "meta/" });
    for (const b of blobs.slice(0, 50)) {
      const m = await store.get(b.key, { type: "json" });
      if (!m || Date.now() - m.created > TRANSFER_TTL) await deleteTransfer(store, b.key.slice(5), m?.total ?? MAX_TRANSFER_PARTS);
    }
  } catch {
    /* pruning is best effort */
  }
}

async function deleteTransfer(store: StoreLike, code: string, total: number) {
  await store.delete(`meta/${code}`);
  for (let i = 0; i < total; i++) await store.delete(`part/${code}/${i}`);
}

export async function handle(req: Request, stores: GetStore): Promise<Response> {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const method = req.method.toUpperCase();

  try {
    /* ---------- accounts ---------- */
    if (route === "signup" && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const username = normUser(body.username);
      const password = typeof body.password === "string" ? body.password : "";
      if (!validUser(username)) return fail(400, "Usernames are 3–24 characters: letters, numbers, dots, dashes or underscores.");
      if (password.length < 6) return fail(400, "Use a password of at least 6 characters.");
      const users = stores("users");
      if (await users.get(username, { type: "json" })) return fail(409, "That username is taken. Try another one.");
      const salt = hex(rand(16));
      const user: UserRecord = { username, salt, hash: await hashPassword(password, salt), created: Date.now(), tokens: [], fails: 0, lockUntil: 0 };
      const token = await newSession(stores, user);
      return json({ token, username }, 201);
    }

    if (route === "login" && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const username = normUser(body.username);
      const password = typeof body.password === "string" ? body.password : "";
      const users = stores("users");
      const user: UserRecord | null = validUser(username) ? await users.get(username, { type: "json" }) : null;
      if (!user) return fail(401, "Wrong username or password.");
      if (user.lockUntil > Date.now()) return fail(429, "Too many tries. Wait a few minutes and try again.");
      if (!safeEqual(await hashPassword(password, user.salt), user.hash)) {
        user.fails += 1;
        if (user.fails >= 8) {
          user.fails = 0;
          user.lockUntil = Date.now() + 5 * 60 * 1000;
        }
        await users.setJSON(username, user);
        return fail(401, "Wrong username or password.");
      }
      user.fails = 0;
      const token = await newSession(stores, user);
      return json({ token, username });
    }

    if (route === "logout" && method === "POST") {
      const h = req.headers.get("authorization") ?? "";
      const token = h.slice(7).trim();
      if (/^[a-f0-9]{64}$/.test(token)) await stores("sessions").delete(token);
      return new Response(null, { status: 204 });
    }

    if (route === "account" && method === "DELETE") {
      const username = await authed(req, stores);
      if (!username) return fail(401, "Please sign in again.");
      const body = await req.json().catch(() => ({}));
      const users = stores("users");
      const user: UserRecord | null = await users.get(username, { type: "json" });
      if (!user || !safeEqual(await hashPassword(String(body.password ?? ""), user.salt), user.hash))
        return fail(401, "That password isn't right.");
      for (const t of user.tokens) await stores("sessions").delete(t);
      const photos = stores("photos");
      const { blobs } = await photos.list({ prefix: `${username}/` });
      for (const b of blobs) await photos.delete(b.key);
      await stores("data").delete(username);
      await users.delete(username);
      return new Response(null, { status: 204 });
    }

    /* ---------- progress + notes sync ---------- */
    if (route === "sync") {
      const username = await authed(req, stores);
      if (!username) return fail(401, "Please sign in again.");
      const data = stores("data");
      if (method === "GET") {
        const rec = await data.get(username, { type: "json" });
        return json(rec ?? { data: null, updatedAt: 0 });
      }
      if (method === "PUT") {
        const text = await req.text();
        if (text.length > MAX_SYNC_BYTES) return fail(413, "Your data is too big to sync. Remove some notes.");
        const body = JSON.parse(text);
        const rec = { data: body.data, updatedAt: Date.now() };
        await data.setJSON(username, rec);
        return json({ ok: true, updatedAt: rec.updatedAt });
      }
    }

    if (route === "photo") {
      const username = await authed(req, stores);
      if (!username) return fail(401, "Please sign in again.");
      const id = url.searchParams.get("id") ?? "";
      if (!/^[a-z0-9]{6,40}$/.test(id)) return fail(400, "Bad photo id.");
      const photos = stores("photos");
      const key = `${username}/${id}`;
      if (method === "PUT") {
        const buf = await req.arrayBuffer();
        if (buf.byteLength > MAX_PHOTO_BYTES) return fail(413, "Photo too large.");
        await photos.set(key, buf);
        return new Response(null, { status: 204 });
      }
      if (method === "GET") {
        const buf = await photos.get(key, { type: "arrayBuffer" });
        if (!buf) return fail(404, "Photo not found.");
        return new Response(buf, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=31536000" } });
      }
    }

    /* ---------- one-time transfer codes ---------- */
    if (route === "transfer") {
      const store = stores("transfers");
      if (method === "POST") {
        const part = Number(url.searchParams.get("part") ?? "0");
        const total = Number(url.searchParams.get("total") ?? "1");
        let code = url.searchParams.get("code") ?? "";
        if (!Number.isInteger(part) || !Number.isInteger(total) || total < 1 || total > MAX_TRANSFER_PARTS || part < 0 || part >= total)
          return fail(400, "Bad transfer part.");
        const text = await req.text();
        if (text.length > MAX_SYNC_BYTES) return fail(413, "Transfer part too large.");
        if (part === 0) {
          await pruneTransfers(store);
          code = makeCode();
          await store.setJSON(`meta/${code}`, { total, created: Date.now(), parts: 0 });
        } else if (!validCode(code)) return fail(400, "Bad transfer code.");
        const meta = await store.get(`meta/${code}`, { type: "json" });
        if (!meta || meta.total !== total) return fail(404, "Transfer not found.");
        await store.set(`part/${code}/${part}`, text);
        return json({ code });
      }
      const code = (url.searchParams.get("code") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^(.{4})(.{4})$/, "$1-$2");
      if (!validCode(code)) return fail(400, "That code doesn't look right. It has 8 characters, like ABCD-2345.");
      const meta = await store.get(`meta/${code}`, { type: "json" });
      if (!meta || Date.now() - meta.created > TRANSFER_TTL) {
        if (meta) await deleteTransfer(store, code, meta.total);
        return fail(404, "Code not found or expired. Codes work for 30 minutes.");
      }
      if (method === "GET") {
        const p = url.searchParams.get("part");
        if (p === null) return json({ total: meta.total, created: meta.created });
        const text = await store.get(`part/${code}/${Number(p)}`, { type: "text" });
        if (text === null) return fail(404, "Part missing. Ask the other device to send again.");
        return new Response(text, { headers: { "content-type": "text/plain", "cache-control": "no-store" } });
      }
      if (method === "DELETE") {
        await deleteTransfer(store, code, meta.total);
        return new Response(null, { status: 204 });
      }
    }

    if (route === "health") return json({ ok: true });
    return fail(404, "Not found.");
  } catch (e) {
    return fail(500, "Something went wrong on the server. Please try again.");
  }
}
