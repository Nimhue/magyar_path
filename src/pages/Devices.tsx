import { useEffect, useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import { Icon, PageHead, toast } from "../components/ui";
import { cloudAvailable, deleteAccount, receiveTransfer, sendTransfer, signIn, signOut, signUp, syncNow, useCloud } from "../lib/cloud";
import { go, href } from "../lib/router";
import { sfx } from "../lib/sound";

function QR({ text }: { text: string }) {
  const cells = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const rects: string[] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) rects.push(`M${c} ${r}h1v1h-1z`);
    return { n, d: rects.join("") };
  }, [text]);
  return (
    <svg className="qr" viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`} role="img" aria-label="QR code with the transfer link">
      <rect x="-2" y="-2" width={cells.n + 4} height={cells.n + 4} fill="#fff" />
      <path d={cells.d} fill="#111" />
    </svg>
  );
}

function ago(t: number) {
  if (!t) return "never";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s} seconds ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function AccountPanel() {
  const cloud = useCloud();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [delPass, setDelPass] = useState("");
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (!cloudAvailable())
    return (
      <section className="panel stack">
        <h2 className="section-title">Account and sync</h2>
        <p className="muted">Sync needs the online site. Open Magyar Path from its Netlify address to sign in.</p>
      </section>
    );

  if (cloud.session)
    return (
      <section className="panel stack">
        <h2 className="section-title">Account and sync</h2>
        <div className="account-row">
          <span className="avatar" aria-hidden="true">
            {cloud.session.username[0].toUpperCase()}
          </span>
          <div>
            <strong>{cloud.session.username}</strong>
            <span className={"sync-state " + cloud.state}>
              {cloud.state === "syncing"
                ? "Syncing…"
                : cloud.state === "offline"
                  ? "Offline. Changes will sync when you're back online."
                  : cloud.state === "error"
                    ? cloud.message
                    : `Synced ${ago(cloud.last)}`}
            </span>
          </div>
          <button className="btn small" onClick={() => void syncNow()} disabled={cloud.state === "syncing"}>
            <Icon name="repeat" size={16} /> Sync now
          </button>
        </div>
        <p className="muted small-print">
          Sign in with the same username on your phone, laptop or tablet. Progress, notes and photos stay in step automatically.
        </p>
        <div className="row gap wrap">
          <button className="btn small" onClick={() => void signOut()}>
            Sign out on this device
          </button>
          {!del && (
            <button className="linkish danger" onClick={() => setDel(true)}>
              Delete account…
            </button>
          )}
        </div>
        {del && (
          <form
            className="confirm"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await deleteAccount(delPass);
                toast("Account deleted", "Your progress is still saved on this device.");
                setDel(false);
              } catch (x) {
                setErr((x as Error).message);
              }
            }}
          >
            <span>This deletes your online copy, notes and photos. Progress on this device stays. Enter your password to confirm.</span>
            <input id="del-pass" type="password" value={delPass} onChange={(e) => setDelPass(e.target.value)} autoComplete="current-password" />
            {err && <span className="warn-text">{err}</span>}
            <div className="row gap">
              <button className="btn danger small" disabled={!delPass}>
                Delete for good
              </button>
              <button type="button" className="btn small" onClick={() => setDel(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    );

  return (
    <section className="panel stack">
      <h2 className="section-title">Account and sync</h2>
      <p className="muted">
        Create a free account to keep your streak, words and notes safe and use them on every device. Just a username and password:
        no email needed.
      </p>
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")}>
          New account
        </button>
        <button role="tab" aria-selected={mode === "signin"} onClick={() => setMode("signin")}>
          Sign in
        </button>
      </div>
      <form
        className="stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr(null);
          try {
            if (mode === "signup") await signUp(user, pass);
            else await signIn(user, pass);
            sfx("win");
            toast(mode === "signup" ? "Account created" : "Signed in", "Your progress now syncs across your devices.");
          } catch (x) {
            setErr((x as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          <span>Username</span>
          <input
            id="acc-user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="e.g. adina.tanul"
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            id="acc-pass"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </label>
        {mode === "signup" && (
          <p className="muted small-print">
            There's no email, so a forgotten password can't be reset. Let your browser or password manager remember it. We store only your
            username, a scrambled (hashed) password, your progress and your notes, on this site's own storage. You can delete it all at any
            time.
          </p>
        )}
        {err && <p className="warn-text">{err}</p>}
        <button className="btn primary" disabled={busy || user.trim().length < 3 || pass.length < 6}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
    </section>
  );
}

export function TransferPanel({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [photos, setPhotos] = useState(true);
  const [busy, setBusy] = useState<"send" | "receive" | null>(null);
  const [prog, setProg] = useState(0);
  const [input, setInput] = useState(initialCode ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [expires, setExpires] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!code) return;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [code]);

  if (!cloudAvailable())
    return (
      <section className="panel stack">
        <h2 className="section-title">Move to another device</h2>
        <p className="muted">Transfer codes need the online site. Here you can still use Download progress below.</p>
      </section>
    );

  const link = code ? `${location.origin}${location.pathname}#/transfer/${code}` : "";
  const left = Math.max(0, Math.round((expires - Date.now()) / 1000));

  const receive = async (c: string) => {
    setBusy("receive");
    setMsg(null);
    setProg(0);
    try {
      await receiveTransfer(c, setProg);
      sfx("win");
      setMsg({ ok: true, text: "Done! Your progress and notes are merged into this device." });
      toast("Transfer complete", "Everything from your other device is here now.");
    } catch (x) {
      setMsg({ ok: false, text: (x as Error).message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="panel stack">
      <h2 className="section-title">Move to another device</h2>
      <p className="muted">No account needed. Make a code here, then type it on the other device, or scan the QR code with its camera.</p>

      <div className="transfer-grid">
        <div className="transfer-box">
          <strong>Send from this device</strong>
          {code ? (
            <>
              <div className="code-big tabnum" aria-live="polite">
                {code}
              </div>
              <QR text={link} />
              <span className="muted small-print">
                Works once, for {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} more.
              </span>
              <div className="row gap wrap">
                <button
                  className="btn small"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(link);
                      toast("Link copied", "Send it to yourself and open it on the other device.");
                    } catch {
                      toast("Copy didn't work", link);
                    }
                  }}
                >
                  Copy link
                </button>
                <button className="btn small" onClick={() => setCode(null)}>
                  Done
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="toggle">
                <input id="tr-photos" type="checkbox" checked={photos} onChange={(e) => setPhotos(e.target.checked)} />
                <span>Include note photos</span>
              </label>
              <button
                className="btn primary"
                disabled={busy !== null}
                onClick={async () => {
                  setBusy("send");
                  setMsg(null);
                  setProg(0);
                  try {
                    const c = await sendTransfer(photos, setProg);
                    setCode(c);
                    setExpires(Date.now() + 30 * 60 * 1000);
                  } catch (x) {
                    setMsg({ ok: false, text: (x as Error).message });
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === "send" ? `Packing… ${Math.round(prog * 100)}%` : "Make a transfer code"}
              </button>
            </>
          )}
        </div>

        <form
          className="transfer-box"
          onSubmit={(e) => {
            e.preventDefault();
            void receive(input);
          }}
        >
          <strong>Receive on this device</strong>
          <input
            id="tr-code"
            className="code-input"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="ABCD-2345"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={9}
            aria-label="Transfer code"
          />
          <span className="muted small-print">Nothing is lost: progress from both devices is combined.</span>
          <button className="btn primary" disabled={busy !== null || input.replace(/[^A-Z0-9]/gi, "").length !== 8}>
            {busy === "receive" ? `Receiving… ${Math.round(prog * 100)}%` : "Receive"}
          </button>
        </form>
      </div>
      {msg && <p className={msg.ok ? "ok-text" : "warn-text"}>{msg.text}</p>}
    </section>
  );
}

export function DevicesPage({ code }: { code?: string }) {
  useEffect(() => {
    if (code) window.scrollTo(0, 0);
  }, [code]);
  return (
    <div className="stack-lg">
      <PageHead title="Eszközök" sub="Your account, sync and moving between devices" back={href("settings")} />
      {code && (
        <aside className="tip">
          You opened a transfer link. Tap <strong>Receive</strong> to bring that device's progress here.
        </aside>
      )}
      {code ? (
        <>
          <TransferPanel initialCode={code} />
          <AccountPanel />
        </>
      ) : (
        <>
          <AccountPanel />
          <TransferPanel />
        </>
      )}
      <button className="linkish" onClick={() => go("settings")}>
        <Icon name="gear" size={16} /> Back to settings
      </button>
    </div>
  );
}
