/** One Discover Hungary place: the story, fun facts, words and a three-question passport check. */
import { useEffect, useMemo, useState } from "react";
import { placeById, places } from "../content";
import type { DiscoverPlace } from "../content/schema";
import { SaveWord, TapText, Trans, placeGlossary } from "../components/CultureBits";
import { MascotSays } from "../components/Mascot";
import { Icon, PageHead, SpeakButton } from "../components/ui";
import { shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { CATS, stampPlace, visitPlace } from "../lib/discover";
import { href } from "../lib/router";
import { sfx } from "../lib/sound";
import { canSpeak, speak } from "../lib/speech";
import { bump, useProgress } from "../lib/store";

export function PlacePage({ id }: { id?: string }) {
  const pl = id ? placeById[id] : undefined;
  useEffect(() => {
    if (pl) {
      visitPlace(pl.id);
      window.scrollTo(0, 0);
    }
  }, [pl]);
  if (!pl) return <PageHead title="Place not found" back={href("kultura/map")} />;
  return <PlaceView key={pl.id} pl={pl} />;
}

function PlaceView({ pl }: { pl: DiscoverPlace }) {
  const p = useProgress();
  const c = CATS[pl.category];
  const [trans, setTrans] = useState(true);
  const glossary = useMemo(() => placeGlossary(pl), [pl, p.settings.showRo]); // eslint-disable-line react-hooks/exhaustive-deps
  const i = places.findIndex((x) => x.id === pl.id);
  const prev = places[(i - 1 + places.length) % places.length];
  const next = places[(i + 1) % places.length];
  const stamped = p.stamps?.[pl.id];

  return (
    <div className={`stack-lg place tone-${c.tone}`}>
      <PageHead title={pl.name} sub={`${c.hu} · ${c.en}`} back={href("kultura/map")} />

      <header className="place-hero">
        <span className="ph-icon">
          <Icon name={c.icon} size={30} />
        </span>
        <div>
          <h2 lang="hu">{pl.title}</h2>
          <p className="muted">
            {pl.titleEn}
            {p.settings.showRo && (
              <span lang="ro" className="ro">
                {" "}
                · {pl.titleRo}
              </span>
            )}
          </p>
        </div>
        {stamped && (
          <span className="ph-stamp" title={`Stamped ${new Date(stamped).toLocaleDateString("en-GB")}`}>
            <span>{pl.name}</span>
            <Icon name="check" size={14} />
          </span>
        )}
      </header>

      <section className="panel stack">
        <div className="row between wrap gap">
          <h3 className="section-title">Történet · Story</h3>
          <div className="row gap wrap">
            {canSpeak() && (
              <button className="btn small" onClick={() => speak(pl.story.map((s) => s.hu).join(" "), 0.85)}>
                <Icon name="play" size={14} /> Listen
              </button>
            )}
            <label className="toggle">
              <input id="pl-trans" type="checkbox" checked={trans} onChange={(e) => setTrans(e.target.checked)} />
              <span>Translations</span>
            </label>
          </div>
        </div>
        <p className="muted small-print">Tap any Hungarian word to see what it means.</p>
        <ol className="story-lines">
          {pl.story.map((s, k) => (
            <li key={k}>
              <div className="sl-hu">
                <TapText text={s.hu} glossary={glossary} from={pl.name} />
                <SpeakButton text={s.hu} small />
              </div>
              <Trans en={s.en} ro={s.ro} show={trans} />
            </li>
          ))}
        </ol>
      </section>

      {pl.facts.length > 0 && (
        <section className="stack">
          <h3 className="section-title">Tudtad? · Did you know?</h3>
          <ul className="fact-list">
            {pl.facts.map((f, k) => (
              <li key={k} className="fact">
                <Icon name="bulb" size={18} />
                <div>
                  <span className="fact-en">{f.en}</span>
                  {p.settings.showRo && (
                    <span className="fact-ro" lang="ro">
                      {f.ro}
                    </span>
                  )}
                  <span className="fact-hu" lang="hu">
                    <SpeakButton text={f.hu} small /> {f.hu}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pl.words.length > 0 && (
        <section className="stack">
          <div className="row between">
            <h3 className="section-title">Szavak · Words</h3>
          </div>
          <ul className="word-rows">
            {pl.words.map((w) => (
              <li key={w.hu}>
                <span className="wr-hu" lang="hu">
                  {w.hu}
                </span>
                <span className="wr-mean">
                  {w.en}
                  {p.settings.showRo && <span className="ro"> · {w.ro}</span>}
                </span>
                <span className="row gap-s">
                  <SpeakButton text={w.hu} small />
                  <SaveWord hu={w.hu} en={w.en} ro={w.ro} from={pl.name} small />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pl.questions.length > 0 && <PassportCheck pl={pl} />}

      <nav className="row between gap place-nav">
        <a className="btn" href={href(`discover/${prev.id}`)}>
          <Icon name="back" size={16} /> {prev.name}
        </a>
        <a className="btn" href={href(`discover/${next.id}`)}>
          {next.name} <Icon name="next" size={16} />
        </a>
      </nav>
    </div>
  );
}

function PassportCheck({ pl }: { pl: DiscoverPlace }) {
  const p = useProgress();
  const qs = useMemo(() => pl.questions.map((q) => ({ ...q, options: shuffle(q.options) })), [pl]);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [round, setRound] = useState(0);
  const answered = Object.keys(ans).length;
  const right = qs.filter((q, k) => ans[k] === q.answer).length;
  const finished = answered === qs.length;
  const passed = finished && right >= Math.ceil(qs.length * 0.66);

  useEffect(() => {
    if (!finished) return;
    if (passed && stampPlace(pl.id)) {
      confetti();
      sfx("win");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  return (
    <section className="panel stack passport" key={round}>
      <h3 className="section-title">
        <Icon name="stamp" size={18} /> Útlevél · Passport check
      </h3>
      <p className="muted small-print">Get {Math.ceil(qs.length * 0.66)} of {qs.length} right for the stamp (+15 XP).</p>
      {qs.map((q, k) => (
        <div key={k} className="pq">
          <strong lang="hu">{q.q}</strong>
          {q.qEn && <span className="muted small-print">{q.qEn}</span>}
          <div className="options compact">
            {q.options.map((o) => {
              const picked = ans[k];
              const cls = picked ? (o === q.answer ? " right" : o === picked ? " wrong" : "") : "";
              return (
                <button
                  key={o}
                  className={"option" + cls}
                  disabled={!!picked}
                  lang="hu"
                  onClick={() => {
                    setAns((a) => ({ ...a, [k]: o }));
                    const ok = o === q.answer;
                    sfx(ok ? "good" : "bad");
                    if (ok) bump("correct");
                  }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {finished &&
        (passed ? (
          <MascotSays mood="party">
            <strong>Pecsét! Stamp collected.</strong>
            <span>
              {right}/{qs.length} right. {Object.keys(p.stamps ?? {}).length}/{places.length} places in your passport.
            </span>
          </MascotSays>
        ) : (
          <div className="stack">
            <MascotSays mood="sad">
              <strong>
                {right}/{qs.length}. Majdnem! Almost.
              </strong>
              <span>Read the story once more and try again.</span>
            </MascotSays>
            <button
              className="btn primary"
              onClick={() => {
                setAns({});
                setRound((r) => r + 1);
              }}
            >
              Try again
            </button>
          </div>
        ))}
    </section>
  );
}
