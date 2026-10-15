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
export const saveFolder = (f: Folder) => tx("folders", "readwrite", (s) => s.put(f));
export const saveNote = (n: Note) => tx("notes", "readwrite", (s) => s.put(n));
export const getImage = (id: string) => tx<Blob | undefined>("images", "readonly", (s) => s.get(id));

export async function deleteNote(n: Note) {
  await tx("notes", "readwrite", (s) => s.delete(n.id));
  for (const img of n.images) await tx("images", "readwrite", (s) => s.delete(img));
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
  return JSON.stringify({ kind: "magyar-path-notes", version: 1, folders, notes, images });
}

export async function importNotes(json: string) {
  const data = JSON.parse(json);
  if (data?.kind !== "magyar-path-notes") throw new Error("This file is not a Magyar Path notes backup.");
  for (const f of data.folders as Folder[]) await saveFolder(f);
  for (const [id, url] of Object.entries(data.images as Record<string, string>)) {
    const blob = await (await fetch(url)).blob();
    await tx("images", "readwrite", (s) => s.put(blob, id));
  }
  for (const n of data.notes as Note[]) await saveNote(n);
}
