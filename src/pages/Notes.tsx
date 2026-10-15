import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Empty, Fmt, Icon, PageHead } from "../components/ui";
import {
  addImage,
  deleteFolder,
  deleteNote,
  exportNotes,
  getImage,
  importNotes,
  listFolders,
  listNotes,
  removeImage,
  saveFolder,
  saveNote,
  uid,
  type Folder,
  type Note,
} from "../lib/notesDb";

const COLORS = ["#D93A3A", "#EE7A2B", "#E0A92A", "#2F8F5B", "#3B7DD8", "#8257C7", "#6B7280"];
type Sel = "all" | "unfiled" | string;

export function NotesPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [folderForm, setFolderForm] = useState<null | { id?: string; name: string; color: string; parentId: string | null }>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [f, n] = await Promise.all([listFolders(), listNotes()]);
      setFolders(f.sort((a, b) => a.name.localeCompare(b.name, "hu")));
      setNotes(n);
      setReady(true);
    } catch {
      setError("Notes need browser storage, which is blocked here (private window?). Try a normal window.");
      setReady(true);
    }
  }, []);
  useEffect(() => {
    reload();
  }, [reload]);

  const children = (pid: string | null) => folders.filter((f) => f.parentId === pid);
  const descendants = (id: string): string[] => [id, ...children(id).flatMap((c) => descendants(c.id))];
  const pathName = (f: Folder): string => {
    const parent = folders.find((x) => x.id === f.parentId);
    return parent ? `${pathName(parent)} / ${f.name}` : f.name;
  };

  const visible = useMemo(() => {
    let list = notes;
    if (sel === "unfiled") list = list.filter((n) => !n.folderId);
    else if (sel !== "all") {
      const ids = new Set(descendants(sel));
      list = list.filter((n) => n.folderId && ids.has(n.folderId));
    }
    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((n) => (n.title + " " + n.body).toLowerCase().includes(t));
    }
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated - a.updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, sel, q, folders]);

  const newNote = async () => {
    const n: Note = {
      id: uid(),
      folderId: sel === "all" || sel === "unfiled" ? null : sel,
      title: "",
      body: "",
      images: [],
      pinned: false,
      created: Date.now(),
      updated: Date.now(),
    };
    await saveNote(n);
    await reload();
    setOpenId(n.id);
  };

  const submitFolder = async () => {
    if (!folderForm || !folderForm.name.trim()) return;
    const existing = folders.find((f) => f.id === folderForm.id);
    const f: Folder = existing
      ? { ...existing, name: folderForm.name.trim(), color: folderForm.color }
      : { id: uid(), name: folderForm.name.trim(), color: folderForm.color, parentId: folderForm.parentId, created: Date.now() };
    await saveFolder(f);
    setFolderForm(null);
    await reload();
    setSel(f.id);
  };

  const selFolder = folders.find((f) => f.id === sel);
  const open = notes.find((n) => n.id === openId);

  if (open)
    return (
      <Editor
        key={open.id}
        note={open}
        folders={folders}
        pathName={pathName}
        onClose={async () => {
          setOpenId(null);
          await reload();
        }}
      />
    );

  const countIn = (id: string) => {
    const ids = new Set(descendants(id));
    return notes.filter((n) => n.folderId && ids.has(n.folderId)).length;
  };

  const FolderTree = ({ pid, depth }: { pid: string | null; depth: number }) => (
    <>
      {children(pid).map((f) => (
        <li key={f.id}>
          <button className={"folder-btn" + (sel === f.id ? " sel" : "")} style={{ paddingLeft: 12 + depth * 16 }} onClick={() => setSel(f.id)}>
            <span className="dot" style={{ background: f.color }} />
            <span className="fname">{f.name}</span>
            <span className="count">{countIn(f.id)}</span>
          </button>
          <ul>
            <FolderTree pid={f.id} depth={depth + 1} />
          </ul>
        </li>
      ))}
    </>
  );

  return (
    <div className="stack-lg">
      <PageHead title="Jegyzetek" sub="Notes · folders, photos and search, saved on this device" />
      {error && <aside className="tip warn">{error}</aside>}
      <div className="notes-bar">
        <label className="search">
          <Icon name="search" size={18} />
          <input id="notes-search" type="search" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn primary" onClick={newNote}>
          <Icon name="plus" size={18} /> Note
        </button>
      </div>

      <div className="notes-layout">
        <aside className="folders panel">
          <div className="row between">
            <strong>Folders</strong>
            <div className="row gap">
              <button
                className="linkish"
                onClick={() => setFolderForm({ name: "", color: COLORS[folders.length % COLORS.length], parentId: null })}
              >
                <Icon name="plus" size={16} /> Folder
              </button>
              {selFolder && (
                <button
                  className="linkish"
                  onClick={() => setFolderForm({ name: "", color: COLORS[folders.length % COLORS.length], parentId: selFolder.id })}
                >
                  <Icon name="plus" size={16} /> Inside
                </button>
              )}
            </div>
          </div>
          {folderForm && (
            <form
              className="folder-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitFolder();
              }}
            >
              <input
                id="folder-name"
                autoFocus
                placeholder={folderForm.id ? "Folder name" : folderForm.parentId ? `New folder inside “${selFolder?.name}”` : "New folder name"}
                value={folderForm.name}
                onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
              />
              <div className="swatches" role="radiogroup" aria-label="Folder colour">
                {COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    role="radio"
                    aria-checked={folderForm.color === c}
                    aria-label={`Colour ${c}`}
                    className={"swatch" + (folderForm.color === c ? " sel" : "")}
                    style={{ background: c }}
                    onClick={() => setFolderForm({ ...folderForm, color: c })}
                  />
                ))}
              </div>
              <div className="row gap">
                <button className="btn primary small" disabled={!folderForm.name.trim()}>
                  {folderForm.id ? "Save" : "Create"}
                </button>
                <button type="button" className="btn small" onClick={() => setFolderForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          <ul className="folder-tree">
            <li>
              <button className={"folder-btn" + (sel === "all" ? " sel" : "")} onClick={() => setSel("all")}>
                <Icon name="notes" size={16} />
                <span className="fname">All notes</span>
                <span className="count">{notes.length}</span>
              </button>
            </li>
            <li>
              <button className={"folder-btn" + (sel === "unfiled" ? " sel" : "")} onClick={() => setSel("unfiled")}>
                <Icon name="folder" size={16} />
                <span className="fname">Not in a folder</span>
                <span className="count">{notes.filter((n) => !n.folderId).length}</span>
              </button>
            </li>
            <FolderTree pid={null} depth={0} />
          </ul>
          {selFolder && !folderForm && (
            <div className="folder-actions">
              {!confirmDel ? (
                <>
                  <button
                    className="linkish"
                    onClick={() => setFolderForm({ id: selFolder.id, name: selFolder.name, color: selFolder.color, parentId: selFolder.parentId })}
                  >
                    <Icon name="edit" size={15} /> Rename
                  </button>
                  <button className="linkish danger" onClick={() => setConfirmDel(true)}>
                    <Icon name="trash" size={15} /> Delete
                  </button>
                </>
              ) : (
                <div className="confirm">
                  <span>
                    Delete “{selFolder.name}”, its subfolders and {countIn(selFolder.id)} note{countIn(selFolder.id) === 1 ? "" : "s"}?
                  </span>
                  <div className="row gap">
                    <button
                      className="btn danger small"
                      onClick={async () => {
                        await deleteFolder(selFolder.id);
                        setConfirmDel(false);
                        setSel("all");
                        await reload();
                      }}
                    >
                      Delete
                    </button>
                    <button className="btn small" onClick={() => setConfirmDel(false)}>
                      Keep
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        <section className="note-list">
          {ready && !visible.length && (
            <Empty>
              {q ? (
                <>No notes match “{q}”.</>
              ) : (
                <>
                  <strong>No notes here yet.</strong>
                  <span>Tap “Note” to write one: words from class, a photo of the board, questions for next time.</span>
                </>
              )}
            </Empty>
          )}
          {visible.map((n) => {
            const f = folders.find((x) => x.id === n.folderId);
            return (
              <button key={n.id} className="note-card" onClick={() => setOpenId(n.id)}>
                <div className="nc-top">
                  {n.pinned && <Icon name="pin" size={14} />}
                  <strong>{n.title || "Untitled note"}</strong>
                </div>
                <span className="nc-body">{n.body.slice(0, 140) || "Empty note"}</span>
                <span className="nc-meta">
                  {f && (
                    <span className="nc-folder">
                      <span className="dot" style={{ background: f.color }} /> {f.name}
                    </span>
                  )}
                  {n.images.length > 0 && (
                    <span>
                      <Icon name="image" size={14} /> {n.images.length}
                    </span>
                  )}
                  <span>{new Date(n.updated).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                </span>
              </button>
            );
          })}
        </section>
      </div>

      <section className="panel backup">
        <strong>Backup</strong>
        <span className="muted">Notes live only in this browser. Download a backup now and then, and restore it on another device.</span>
        <div className="row gap wrap">
          <button
            className="btn small"
            onClick={async () => {
              const data = await exportNotes();
              download(`magyar-notes-${new Date().toISOString().slice(0, 10)}.json`, data);
            }}
          >
            <Icon name="download" size={16} /> Download backup
          </button>
          <label className="btn small">
            <Icon name="upload" size={16} /> Restore backup
            <input
              type="file"
              accept="application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await importNotes(await file.text());
                  await reload();
                  setMsg("Backup restored.");
                } catch (err) {
                  setMsg((err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {msg && <span className="muted">{msg}</span>}
      </section>
    </div>
  );
}

export function download(name: string, data: string) {
  const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Thumb({ id, onOpen, onRemove }: { id: string; onOpen: (url: string) => void; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    getImage(id).then((b) => {
      if (b) {
        u = URL.createObjectURL(b);
        setUrl(u);
      }
    });
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [id]);
  return (
    <div className="thumb">
      {url ? (
        <button className="thumb-img" onClick={() => onOpen(url)} aria-label="Open photo">
          <img src={url} alt="" />
        </button>
      ) : (
        <div className="thumb-img loading" />
      )}
      <button className="thumb-x" onClick={onRemove} aria-label="Remove photo">
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}

function NoteBody({ text }: { text: string }) {
  return (
    <div className="note-render">
      {text.split("\n").map((line, i) =>
        line.startsWith("# ") ? (
          <h3 key={i}>
            <Fmt text={line.slice(2)} />
          </h3>
        ) : line.startsWith("- ") ? (
          <p key={i} className="bullet">
            <Fmt text={line.slice(2)} />
          </p>
        ) : line.trim() ? (
          <p key={i}>
            <Fmt text={line} />
          </p>
        ) : (
          <br key={i} />
        )
      )}
    </div>
  );
}

function Editor({
  note,
  folders,
  pathName,
  onClose,
}: {
  note: Note;
  folders: Folder[];
  pathName: (f: Folder) => string;
  onClose: () => void;
}) {
  const [n, setN] = useState(note);
  const [preview, setPreview] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [saved, setSaved] = useState(true);
  const first = useRef(true);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved(false);
    const t = setTimeout(async () => {
      await saveNote({ ...n, updated: Date.now() });
      setSaved(true);
    }, 400);
    return () => clearTimeout(t);
  }, [n]);

  useEffect(() => {
    const el = ta.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + 4 + "px";
    }
  }, [n.body, preview]);

  const close = async () => {
    await saveNote({ ...n, updated: saved ? n.updated : Date.now() });
    if (!n.title.trim() && !n.body.trim() && !n.images.length) await deleteNote(n);
    onClose();
  };

  return (
    <div className="stack editor">
      <div className="editor-top">
        <button className="icon-btn" onClick={close} aria-label="Back to notes">
          <Icon name="back" />
        </button>
        <span className="muted small-print">{saved ? "Saved" : "Saving…"}</span>
        <div className="row gap">
          <button className={"icon-btn" + (n.pinned ? " on" : "")} onClick={() => setN({ ...n, pinned: !n.pinned })} aria-label={n.pinned ? "Unpin" : "Pin to top"} aria-pressed={n.pinned}>
            <Icon name="pin" />
          </button>
          <button className="icon-btn" onClick={() => setPreview(!preview)} aria-pressed={preview} aria-label={preview ? "Edit" : "Preview"}>
            <Icon name={preview ? "edit" : "read"} />
          </button>
          <button className="icon-btn danger" onClick={() => setConfirm(true)} aria-label="Delete note">
            <Icon name="trash" />
          </button>
        </div>
      </div>
      {confirm && (
        <div className="confirm panel">
          <span>Delete this note and its photos?</span>
          <div className="row gap">
            <button
              className="btn danger small"
              onClick={async () => {
                await deleteNote(n);
                onClose();
              }}
            >
              Delete
            </button>
            <button className="btn small" onClick={() => setConfirm(false)}>
              Keep
            </button>
          </div>
        </div>
      )}
      <input
        id="note-title"
        className="note-title"
        placeholder="Title"
        value={n.title}
        onChange={(e) => setN({ ...n, title: e.target.value })}
        autoFocus={!note.title}
      />
      <label className="folder-select">
        <Icon name="folder" size={16} />
        <select id="note-folder" value={n.folderId ?? ""} onChange={(e) => setN({ ...n, folderId: e.target.value || null })}>
          <option value="">Not in a folder</option>
          {[...folders]
            .sort((a, b) => pathName(a).localeCompare(pathName(b), "hu"))
            .map((f) => (
              <option key={f.id} value={f.id}>
                {pathName(f)}
              </option>
            ))}
        </select>
      </label>
      {preview ? (
        <NoteBody text={n.body || "Nothing written yet."} />
      ) : (
        <textarea
          ref={ta}
          id="note-body"
          className="note-body"
          placeholder={"Write anything…\n\n# Heading\n- bullet point\n**bold**"}
          value={n.body}
          onChange={(e) => setN({ ...n, body: e.target.value })}
          lang="hu"
        />
      )}
      <div className="thumbs">
        {n.images.map((id) => (
          <Thumb
            key={id}
            id={id}
            onOpen={setLightbox}
            onRemove={async () => {
              await removeImage(id);
              setN({ ...n, images: n.images.filter((x) => x !== id) });
            }}
          />
        ))}
        <label className="thumb add">
          <Icon name="image" size={22} />
          <span>Add photo</span>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={async (e) => {
              const files = [...(e.target.files ?? [])];
              const ids: string[] = [];
              for (const f of files) ids.push(await addImage(f));
              setN((cur) => ({ ...cur, images: [...cur.images, ...ids] }));
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {lightbox && (
        <button className="lightbox" onClick={() => setLightbox(null)} aria-label="Close photo">
          <img src={lightbox} alt="" />
        </button>
      )}
    </div>
  );
}
