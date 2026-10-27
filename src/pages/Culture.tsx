/** Kultúra: Discover Hungary map, proverbs and idioms, tongue twisters, songs and recipes. */
import { useMemo, useState } from "react";
import { places, proverbs, recipes, songs, twisters } from "../content";
import type { DiscoverCategory, Proverb, Song } from "../content/schema";
import { CatChip, DiscoverMap, SaveWord, Trans } from "../components/CultureBits";
import { MascotSays } from "../components/Mascot";
import { Icon, PageHead, SpeakButton } from "../components/ui";
import { shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { CAT_ORDER, CATS } from "../lib/discover";
import { go, href } from "../lib/router";
import { sfx } from "../lib/sound";
import { canSpeak, speak } from "../lib/speech";
import { addXp, bump, update, useProgress } from "../lib/store";
import { MyScenesTab, TalesTab } from "./Tales";

const TABS = [
  { id: "map", hu: "Térkép", en: "Map", icon: "map" },
  { id: "mesek", hu: "Mesék", en: "Cartoons", icon: "play" },
  { id: "jelenetek", hu: "Jelenetek", en: "My scenes", icon: "clock" },
  { id: "proverbs", hu: "Mondások", en: "Sayings", icon: "chat" },
  { id: "twisters", hu: "Nyelvtörők", en: "Tongue twisters", icon: "sparkle" },
  { id: "songs", hu: "Dalok", en: "Songs", icon: "note" },
  { id: "recipes", hu: "Receptek", en: "Recipes", icon: "bowl" },
];

export function CulturePage({ args }: { args: string[] }) {
  const [tab = "map", sub] = args;
  if (tab === "songs" && sub) return <SongView id={sub} />;
  if (tab === "recipes" && sub) return <RecipeView id={sub} />;
  return (
    <div className="stack-lg">
      <PageHead title="Kultúra" sub="Discover Hungary · stories, sayings, songs and food" />
      <div className="tabs-scroll" role="tablist" aria-label="Culture sections">
        {TABS.map((t) => (
          <a key={t.id} role="tab" aria-selected={tab === t.id} href={href(`kultura/${t.id}`)} className={"tab-pill" + (tab === t.id ? " on" : "")}>
            <Icon name={t.icon} size={16} />
            <span>{t.hu}</span>
          </a>
        ))}
      </div>
      {tab === "map" && <MapTab />}
      {tab === "mesek" && <TalesTab />}
      {tab === "jelenetek" && <MyScenesTab />}
      {tab === "proverbs" && <ProverbsTab />}
      {tab === "twisters" && <TwistersTab />}
      {tab === "songs" && <SongsTab />}
      {tab === "recipes" && <RecipesTab />}
    </div>
  );
}

/* ---------------- map ---------------- */

function MapTab() {
  const p = useProgress();
  const [filter, setFilter] = useState<Set<DiscoverCategory>>(() => new Set(CAT_ORDER));
  const [sel, setSel] = useState<string | null>(null);
  const all = filter.size === CAT_ORDER.length;
  const stamps = places.filter((pl) => p.stamps?.[pl.id]).length;
  const shown = places.filter((pl) => filter.has(pl.category));
  const pick = places.find((pl) => pl.id === sel && filter.has(pl.category));

  const toggle = (c: DiscoverCategory) =>
    setFilter((f) => {
      if (f.size === CAT_ORDER.length) return new Set([c]);
      const n = new Set(f);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n.size ? n : new Set(CAT_ORDER);
    });

  return (
    <>
      <section className="panel stack discover">
        <div className="row between wrap gap">
          <h2 className="section-title">Fedezd fel Magyarországot!</h2>
          <span className="chip passport-chip">
            <Icon name="stamp" size={14} /> {stamps}/{places.length} stamps
          </span>
        </div>
        <p className="muted small-print">
          Tap a pin for a legend, a folk tale or a fun fact, told in easy Hungarian with English{p.settings.showRo ? " and Romanian" : ""}. Answer three
          questions to stamp your passport.
        </p>
        <div className="cat-chips" role="group" aria-label="Filter the map">
          <button type="button" className={"cat-chip all" + (all ? " on" : "")} aria-pressed={all} onClick={() => setFilter(new Set(CAT_ORDER))}>
            <Icon name="globe" size={15} />
            <span>Mind</span>
          </button>
          {CAT_ORDER.map((c) => (
            <CatChip key={c} cat={c} on={!all && filter.has(c)} onClick={() => toggle(c)} count={places.filter((pl) => pl.category === c).length} />
          ))}
        </div>
        <DiscoverMap filter={filter} selected={pick?.id ?? null} onSelect={setSel} />
        {pick ? (
          <a className={`place-peek tone-${CATS[pick.category].tone}`} href={href(`discover/${pick.id}`)}>
            <span className="peek-icon">
              <Icon name={CATS[pick.category].icon} size={22} />
            </span>
            <span className="peek-body">
              <span className="peek-kicker">
                {pick.name} · {CATS[pick.category].hu}
              </span>
              <strong>{pick.title}</strong>
              <span className="muted">
                {pick.titleEn}
                {p.settings.showRo ? ` · ${pick.titleRo}` : ""}
              </span>
            </span>
            <span className="btn primary small">
              {p.stamps?.[pick.id] ? "Read again" : "Read"} <Icon name="next" size={16} />
            </span>
          </a>
        ) : (
          <p className="map-hint muted small-print">
            <Icon name="pin" size={14} /> Tap a pin on the map, or pick a place below.
          </p>
        )}
      </section>

      <section>
        <h2 className="section-title">
          {all ? "Minden hely · All places" : [...filter].map((c) => CATS[c].en).join(", ")} <span className="muted">({shown.length})</span>
        </h2>
        <div className="place-grid">
          {shown.map((pl) => {
            const c = CATS[pl.category];
            const stamped = !!p.stamps?.[pl.id];
            return (
              <a key={pl.id} href={href(`discover/${pl.id}`)} className={`dplace tone-${c.tone}` + (stamped ? " stamped" : "")}>
                <span className="pc-icon">
                  <Icon name={c.icon} size={20} />
                </span>
                <span className="pc-body">
                  <span className="pc-kicker">{pl.name}</span>
                  <strong>{pl.title}</strong>
                  <span className="muted small-print">{pl.titleEn}</span>
                </span>
                {stamped && (
                  <span className="pc-stamp" title="Stamped">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </a>
            );
          })}
        </div>
      </section>
    </>
  );
}

/* ---------------- proverbs ---------------- */

function ProverbsTab() {
  const [kind, setKind] = useState<"proverb" | "idiom">("proverb");
  const [quiz, setQuiz] = useState(0);
  const list = proverbs.filter((x) => x.kind === kind);
  if (quiz) return <ProverbQuiz key={quiz} onExit={() => setQuiz(0)} />;
  return (
    <section className="stack">
      <div className="row between wrap gap">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={kind === "proverb"} onClick={() => setKind("proverb")}>
            Közmondások · Proverbs
          </button>
          <button role="tab" aria-selected={kind === "idiom"} onClick={() => setKind("idiom")}>
            Szólások · Idioms
          </button>
        </div>
        <button className="btn primary small" onClick={() => setQuiz(Date.now())}>
          <Icon name="quiz" size={16} /> Guess the meaning
        </button>
      </div>
      <p className="muted small-print">
        Many have a Romanian twin. Word-for-word translations show how Hungarians picture things; the meaning tells you how they're used.
      </p>
      <ul className="saying-list">
        {list.map((x) => (
          <SayingCard key={x.hu} x={x} />
        ))}
      </ul>
    </section>
  );
}

function SayingCard({ x }: { x: Proverb }) {
  const p = useProgress();
  return (
    <li className="saying">
      <div className="row between gap">
        <strong lang="hu" className="saying-hu">
          {x.hu}
        </strong>
        <span className="row gap-s">
          <SpeakButton text={x.hu} small />
          <SaveWord hu={x.hu} en={x.meaning} ro={x.ro} from="Mondások" small />
        </span>
      </div>
      <dl className="saying-dl">
        <dt>Word for word</dt>
        <dd>{x.literal}</dd>
        <dt>Meaning</dt>
        <dd>{x.meaning}</dd>
        {p.settings.showRo && (
          <>
            <dt>
              <abbr title="Romanian">RO</abbr>
            </dt>
            <dd lang="ro">{x.ro}</dd>
          </>
        )}
      </dl>
    </li>
  );
}

function ProverbQuiz({ onExit }: { onExit: () => void }) {
  const qs = useMemo(
    () =>
      shuffle(proverbs)
        .slice(0, 6)
        .map((x) => ({ x, options: shuffle([x.meaning, ...shuffle(proverbs.filter((o) => o.hu !== x.hu)).slice(0, 3).map((o) => o.meaning)]) })),
    []
  );
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const done = i >= qs.length;
  if (done)
    return (
      <section className="stack">
        <MascotSays mood={score >= 5 ? "party" : "happy"}>
          <strong>
            {score}/{qs.length} right
          </strong>
          <span>{score >= 5 ? "Igazi magyar! You think like a local." : "Every proverb you learn makes Hungarians smile."}</span>
        </MascotSays>
        <div className="row gap">
          <button className="btn primary" onClick={onExit}>
            Back to the list
          </button>
        </div>
      </section>
    );
  const q = qs[i];
  return (
    <section className="panel stack">
      <span className="muted small-print tabnum">
        Question {i + 1} of {qs.length}
      </span>
      <div className="row gap">
        <strong lang="hu" className="saying-hu big">
          {q.x.hu}
        </strong>
        <SpeakButton text={q.x.hu} small />
      </div>
      <span className="muted">What does it mean?</span>
      <div className="options">
        {q.options.map((o) => (
          <button
            key={o}
            className={"option" + (picked ? (o === q.x.meaning ? " right" : o === picked ? " wrong" : "") : "")}
            disabled={!!picked}
            onClick={() => {
              setPicked(o);
              const ok = o === q.x.meaning;
              sfx(ok ? "good" : "bad");
              if (ok) {
                setScore((s) => s + 1);
                bump("correct");
                addXp(2);
              }
            }}
          >
            {o}
          </button>
        ))}
      </div>
      {picked && (
        <div className="stack">
          <p className="small-print">
            <strong>Word for word:</strong> {q.x.literal} <span className="ro">· RO: {q.x.ro}</span>
          </p>
          <button
            className="btn primary"
            onClick={() => {
              if (i + 1 >= qs.length) {
                bump("game");
                update((d) => {
                  const g = (d.games["proverbs"] ??= { plays: 0, best: 0 });
                  g.plays++;
                  g.best = Math.max(g.best, score);
                });
                if (score >= 5) confetti();
              }
              setPicked(null);
              setI(i + 1);
            }}
          >
            {i + 1 >= qs.length ? "See my score" : "Next"}
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------------- tongue twisters ---------------- */

function TwistersTab() {
  const [count, setCount] = useState<Record<string, number>>({});
  return (
    <section className="stack">
      <p className="muted">
        Listen slowly, then normal, then fast. Say each one three times in a row and tap the counter. Great for the sounds that don't exist in English or
        Romanian.
      </p>
      {!canSpeak() && <p className="warn-text small-print">This browser can't play audio, so read them aloud yourself.</p>}
      <ul className="twister-list">
        {twisters.map((t) => {
          const n = count[t.hu] ?? 0;
          return (
            <li key={t.hu} className={"twister lvl-" + t.level}>
              <div className="row between gap">
                <span className="tw-level" aria-label={`Difficulty ${t.level} of 3`}>
                  {"●".repeat(t.level)}
                  <span className="dim">{"●".repeat(3 - t.level)}</span>
                  <span className="muted small-print">{t.kind === "classic" ? " Classic" : " Practice line"}</span>
                </span>
                <button
                  className={"tw-count" + (n >= 3 ? " done" : "")}
                  onClick={() => {
                    const next = n + 1;
                    setCount((c) => ({ ...c, [t.hu]: next }));
                    sfx(next === 3 ? "win" : "tap");
                    if (next === 3) {
                      addXp(3);
                      confetti();
                    }
                  }}
                  aria-label={`I said it: ${n} of 3`}
                >
                  {n >= 3 ? <Icon name="check" size={14} /> : `${n}/3`}
                </button>
              </div>
              <p lang="hu" className="tw-hu">
                {t.hu}
              </p>
              <Trans en={t.en} ro={t.ro} />
              {t.tip && (
                <p className="tw-tip">
                  <Icon name="star" size={13} /> {t.tip}
                </p>
              )}
              {canSpeak() && (
                <div className="row gap wrap">
                  <button className="btn small" onClick={() => speak(t.hu, 0.55)}>
                    Slow
                  </button>
                  <button className="btn small" onClick={() => speak(t.hu, 0.9)}>
                    Normal
                  </button>
                  <button className="btn small" onClick={() => speak(t.hu, 1.3)}>
                    <Icon name="bolt" size={14} /> Fast
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------------- songs ---------------- */

const SONG_KIND: Record<Song["kind"], string> = { folk: "Népdal · Folk song", rhyme: "Mondóka · Nursery rhyme", game: "Körjáték · Circle game", christmas: "Karácsony · Christmas" };

function SongsTab() {
  return (
    <section className="stack">
      <p className="muted">Traditional songs and rhymes every Hungarian child knows. Read along, listen line by line, and save the words you like.</p>
      <div className="place-grid">
        {songs.map((s, i) => (
          <a key={s.id} href={href(`kultura/songs/${s.id}`)} className={`dplace tone-${["teal", "pink", "yellow", "purple", "green"][i % 5]}`}>
            <span className="pc-icon">
              <Icon name="note" size={20} />
            </span>
            <span className="pc-body">
              <span className="pc-kicker">{SONG_KIND[s.kind]}</span>
              <strong lang="hu">{s.title}</strong>
              <span className="muted small-print">{s.titleEn}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function SongView({ id }: { id: string }) {
  const s = songs.find((x) => x.id === id);
  const [trans, setTrans] = useState(true);
  if (!s) return <PageHead title="Song not found" back={href("kultura/songs")} />;
  return (
    <div className="stack-lg">
      <PageHead title={s.title} sub={`${s.titleEn} · ${SONG_KIND[s.kind]}`} back={href("kultura/songs")} />
      <p className="intro-line">{s.about}</p>
      <div className="row gap wrap">
        {canSpeak() && (
          <button className="btn primary" onClick={() => speak(s.lines.map((l) => l.hu).join(", "), 0.8)}>
            <Icon name="play" size={16} /> Read it all aloud
          </button>
        )}
        <label className="toggle">
          <input id="song-trans" type="checkbox" checked={trans} onChange={(e) => setTrans(e.target.checked)} />
          <span>Show translations</span>
        </label>
      </div>
      <ol className="lyric">
        {s.lines.map((l, i) => (
          <li key={i}>
            <div className="row gap">
              <span lang="hu" className="lyric-hu">
                {l.hu}
              </span>
              <SpeakButton text={l.hu} small />
            </div>
            <Trans en={l.en} ro={l.ro} show={trans} />
          </li>
        ))}
      </ol>
      <p className="muted small-print">Audio is your device's reading voice, not singing. Search the title on YouTube to hear the melody.</p>
    </div>
  );
}

/* ---------------- recipes ---------------- */

function RecipesTab() {
  const p = useProgress();
  return (
    <section className="stack">
      <p className="muted">Simple Hungarian classics, written the way Hungarian recipes are: in the "we" form (összekeverjük = we mix it).</p>
      <div className="place-grid">
        {recipes.map((r) => (
          <a key={r.id} href={href(`kultura/recipes/${r.id}`)} className="dplace tone-paprika">
            <span className="pc-icon">
              <Icon name="bowl" size={20} />
            </span>
            <span className="pc-body">
              <span className="pc-kicker">
                {r.minutes} min · serves {r.serves}
              </span>
              <strong lang="hu">{r.title}</strong>
              <span className="muted small-print">
                {r.titleEn}
                {p.settings.showRo ? ` · ${r.titleRo}` : ""}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function RecipeView({ id }: { id: string }) {
  const r = recipes.find((x) => x.id === id);
  const [have, setHave] = useState<Set<number>>(new Set());
  const [trans, setTrans] = useState(true);
  if (!r) return <PageHead title="Recipe not found" back={href("kultura/recipes")} />;
  return (
    <div className="stack-lg">
      <PageHead title={r.title} sub={`${r.titleEn} · ${r.minutes} min · serves ${r.serves}`} back={href("kultura/recipes")} />
      <p className="intro-line">{r.about}</p>
      <section className="panel stack">
        <div className="row between">
          <h2 className="section-title">Hozzávalók · Ingredients</h2>
          <button
            className="linkish small-print"
            onClick={() => {
              for (const ing of r.ingredients) if (!ing.hu.includes(",")) addMyWordQuiet(ing.hu, ing.en, ing.ro, r.title);
              sfx("tap");
            }}
          >
            <Icon name="plus" size={14} /> Add all to my words
          </button>
        </div>
        <ul className="ingredients">
          {r.ingredients.map((ing, i) => (
            <li key={i} className={have.has(i) ? "have" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={have.has(i)}
                  onChange={() =>
                    setHave((h) => {
                      const n = new Set(h);
                      if (n.has(i)) n.delete(i);
                      else n.add(i);
                      return n;
                    })
                  }
                />
                <span className="ing-amount tabnum">{ing.amount}</span>
                <span className="ing-name">
                  <strong lang="hu">{ing.hu}</strong>
                  <Trans en={ing.en} ro={ing.ro} />
                </span>
              </label>
              <span className="row gap-s">
                <SpeakButton text={ing.hu} small />
                <SaveWord hu={ing.hu} en={ing.en} ro={ing.ro} from={r.title} small />
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="stack">
        <div className="row between">
          <h2 className="section-title">Elkészítés · Method</h2>
          <label className="toggle">
            <input id="rec-trans" type="checkbox" checked={trans} onChange={(e) => setTrans(e.target.checked)} />
            <span>Translations</span>
          </label>
        </div>
        <ol className="steps">
          {r.steps.map((s, i) => (
            <li key={i}>
              <span className="step-n">{i + 1}</span>
              <div>
                <div className="row gap">
                  <span lang="hu">{s.hu}</span>
                  <SpeakButton text={s.hu} small />
                </div>
                <Trans en={s.en} ro={s.ro} show={trans} />
              </div>
            </li>
          ))}
        </ol>
      </section>
      {r.tip && (
        <aside className="tip">
          <strong>Tipp:</strong> {r.tip}
        </aside>
      )}
      <button className="btn" onClick={() => go("kultura/recipes")}>
        More recipes
      </button>
    </div>
  );
}

function addMyWordQuiet(hu: string, en: string, ro: string, from: string) {
  update((d) => {
    d.myWords ??= {};
    if (!d.myWords[hu] || d.myWords[hu].removed) d.myWords[hu] = { en, ro, from, at: Date.now() };
  });
}
