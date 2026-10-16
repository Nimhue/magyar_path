/**
 * Notes, folders and photos, stored in IndexedDB on this device.
 * Photos are shrunk to max 1600px before saving to keep storage small.
 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  created: number;
  updated?: number;
}
export interface Note {
  id: string;
  folderId: string | null;
  title: string;
  body: string;
  images: string[];
  pinned: boolean;
  updated: number;
  created: number;
}

const DB = "magyar-path-notes";
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (!dbp)
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        d.createObjectStore("folders", { keyPath: "id" });
        d.createObjectStore("notes", { keyPath: "id" });
        d.createObjectStore("images");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  return dbp;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const t = d.transaction(store, mode);
        const s = t.objectStore(store);
        const r = fn(s);
        t.oncomplete = () => resolve(r ? (r.result as T) : (undefined as T));
        t.onerror = () => reject(t.error);
      })
  );
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const listFolders = () => tx<Folder[]>("folders", "readonly", (s) => s.getAll());
export const listNotes = () => tx<Note[]>("notes", "readonly", (s) => s.getAll());
const putFolder = (f: Folder) => tx("folders", "readwrite", (s) => s.put(f));
const putNote = (n: Note) => tx("notes", "readwrite", (s) => s.put(n));
export const saveFolder = (f: Folder) => putFolder({ ...f, updated: Date.now() }).then(changed);
export const saveNote = (n: Note) => putNote(n).then(changed);

/* ---------- change tracking for sync ---------- */
const TOMB = "magyar-path:notes-deleted";
const listeners = new Set<() => void>();
export const onNotesChange = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
function changed() {
  listeners.forEach((l) => l());
}
export function tombstones(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(TOMB) ?? "{}");
  } catch {
    return {};
  }
}
function bury(ids: string[]) {
  const t = tombstones();
  for (const id of ids) t[id] = Date.now();
  try {
    localStorage.setItem(TOMB, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}
export const getImage = (id: string) => tx<Blob | undefined>("images", "readonly", (s) => s.get(id));

export async function deleteNote(n: Note) {
  await tx("notes", "readwrite", (s) => s.delete(n.id));
  for (const img of n.images) await tx("images", "readwrite", (s) => s.delete(img));
  bury([n.id]);
  changed();
}

/** Deletes a folder, its subfolders and every note inside them. */
export async function deleteFolder(id: string) {
  const folders = await listFolders();
  const notes = await listNotes();
  const doomed = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders)
      if (f.parentId && doomed.has(f.parentId) && !doomed.has(f.id)) {
        doomed.add(f.id);
        grew = true;
      }
  }
  for (const n of notes) if (n.folderId && doomed.has(n.folderId)) await deleteNote(n);
  for (const f of doomed) await tx("folders", "readwrite", (s) => s.delete(f));
  bury([...doomed]);
  changed();
}

export const putImage = (id: string, blob: Blob) => tx("images", "readwrite", (s) => s.put(blob, id));

/**
 * Merge notes and folders from another device: newest edit wins,
 * and anything deleted on either device stays deleted.
 */
export async function mergeNotes(remote: { folders: Folder[]; notes: Note[]; deleted: Record<string, number> }) {
  const tomb = { ...remote.deleted };
  for (const [id, t] of Object.entries(tombstones())) tomb[id] = Math.max(t, tomb[id] ?? 0);
  try {
    localStorage.setItem(TOMB, JSON.stringify(tomb));
  } catch {
    /* ignore */
  }
  const [lf, ln] = await Promise.all([listFolders(), listNotes()]);
  const folders = new Map(lf.map((f) => [f.id, f]));
  for (const f of remote.folders) {
    const mine = folders.get(f.id);
    if (!mine || (f.updated ?? f.created) > (mine.updated ?? mine.created)) folders.set(f.id, f);
  }
  const notes = new Map(ln.map((n) => [n.id, n]));
  for (const n of remote.notes) {
    const mine = notes.get(n.id);
    if (!mine || n.updated > mine.updated) notes.set(n.id, n);
  }
  for (const [id, f] of folders) {
    if (tomb[id] && tomb[id] >= (f.updated ?? f.created)) {
      folders.delete(id);
      await tx("folders", "readwrite", (s) => s.delete(id));
    } else await putFolder(f);
  }
  for (const [id, n] of notes) {
    if (tomb[id] && tomb[id] >= n.updated) {
      notes.delete(id);
      await tx("notes", "readwrite", (s) => s.delete(id));
    } else await putNote(n);
  }
  return { folders: [...folders.values()], notes: [...notes.values()], deleted: tomb };
}

export async function addImage(file: File): Promise<string> {
  const blob = await shrink(file);
  const id = uid();
  await tx("images", "readwrite", (s) => s.put(blob, id));
  return id;
}

export const removeImage = (id: string) => tx("images", "readwrite", (s) => s.delete(id));

async function shrink(file: File, max = 1600): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900_000) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

const toDataUrl = (b: Blob) =>
  new Promise<string>((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.readAsDataURL(b);
  });

/** Full backup, photos included, as one JSON file. */
export async function exportNotes(): Promise<string> {
  const folders = await listFolders();
  const notes = await listNotes();
  const images: Record<string, string> = {};
  for (const n of notes)
    for (const id of n.images) {
      const b = await getImage(id);
      if (b) images[id] = await toDataUrl(b);
    }
  return JSON.stringify({ kind: "magyar-path-notes", version: 1, folders, notes, images, deleted: tombstones() });
}

export async function importNotes(json: string) {
  const data = JSON.parse(json);
  if (data?.kind !== "magyar-path-notes") throw new Error("This file is not a Magyar Path notes backup.");
  for (const [id, url] of Object.entries(data.images as Record<string, string>)) {
    const blob = await (await fetch(url)).blob();
    await putImage(id, blob);
  }
  await mergeNotes({ folders: data.folders ?? [], notes: data.notes ?? [], deleted: data.deleted ?? {} });
  changed();
}
