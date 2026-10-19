/** Small pieces shared by the Kultúra pages: tap-to-translate text, the save-word button, the Discover map. */
import { useMemo, useState } from "react";
import { lookupWord, normalizeWord, places } from "../content";
import type { DiscoverCategory, DiscoverPlace } from "../content/schema";
import { addMyWord, CATS, hasMyWord, removeMyWord } from "../lib/discover";
import { DANUBE, OUTLINE, TISZA, projection, spread } from "../lib/hungary";
import { sfx } from "../lib/sound";
import { getState, useProgress } from "../lib/store";
import { Icon, IconGlyph, toast } from "./ui";

export function SaveWord({ hu, en, ro, from, small }: { hu: string; en: string; ro?: string; from: string; small?: boolean }) {
  const p = useProgress();
  const saved = hasMyWord(p, hu);
  return (
    <button
      type="button"
      className={"save-word" + (saved ? " saved" : "") + (small ? " small" : "")}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${hu} from my words` : `Add ${hu} to my flashcards`}
      title={saved ? "In your flashcards (tap to remove)" : "Add to my flashcards"}
      onClick={(e) => {
        e.stopPropagation();
        if (saved) removeMyWord(hu);
        else {
          addMyWord(hu, en, ro, from);
          sfx("tap");
          toast("Added to My words", `${hu}: find it under Vocab → My words.`, "info");
        }
      }}
    >
      <Icon name={saved ? "check" : "plus"} size={small ? 14 : 16} />
      {!small && <span>{saved ? "In my words" : "My words"}</span>}
    </button>
  );
}

/** Hungarian text where every word can be tapped for its meaning. */
export function TapText({ text, glossary, from }: { text: string; glossary: Record<string, string>; from: string }) {
  const [word, setWord] = useState<{ w: string; m: string | null } | null>(null);
  return (
    <>
      <span lang="hu" className="tap-text">
        {text.split(/(\s+)/).map((tok, i) =>
          /^\s+$/.test(tok) || !tok ? (
            tok
          ) : (
            <button
              key={i}
              type="button"
              className="w"
              onClick={() => setWord({ w: normalizeWord(tok), m: lookupWord(tok, glossary, getState().settings.showRo) })}
            >
              {tok}
            </button>
          )
        )}
      </span>
      {word && (
        <span className="word-pop inline" role="status">
          <span>
            <strong lang="hu">{word.w}</strong>
            <span>{word.m ?? "Not in your word list yet."}</span>
          </span>
          {word.m && <SaveWord hu={word.w} en={word.m.split(" · RO: ")[0]} ro={word.m.split(" · RO: ")[1]} from={from} small />}
          <button type="button" className="icon-btn" onClick={() => setWord(null)} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </span>
      )}
    </>
  );
}

/** Romanian + English lines under a Hungarian one. */
export function Trans({ en, ro, show = true }: { en: string; ro?: string; show?: boolean }) {
  const p = useProgress();
  if (!show) return null;
  return (
    <span className="trans">
      <span className="tr-en">{en}</span>
      {p.settings.showRo && ro && (
        <span className="tr-ro" lang="ro">
          <abbr title="Romanian">RO</abbr> {ro}
        </span>
      )}
    </span>
  );
}

const PR = projection(400, 10);

export function DiscoverMap({
  filter,
  selected,
  onSelect,
}: {
  filter: Set<DiscoverCategory>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const p = useProgress();
  const shown = places.filter((pl) => filter.has(pl.category));
  const layout = useMemo(() => {
    const raw = shown.map((pl) => ({ x: PR.x(pl.lon), y: PR.y(pl.lat) }));
    return spread(raw, 23, PR.W, PR.H).map((pos, i) => ({ pl: shown[i], raw: raw[i], pos }));
  }, [shown.map((s) => s.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dmap">
      <svg viewBox={`0 0 ${PR.W} ${PR.H}`} role="img" aria-label="Map of Hungary with places to discover">
        <polygon points={PR.pts(OUTLINE)} className="hu-land" />
        <polyline points={PR.pts(DANUBE)} className="hu-river" />
        <polyline points={PR.pts(TISZA)} className="hu-river" />
        <ellipse cx={PR.x(17.72)} cy={PR.y(46.87)} rx={PR.x(18.17) - PR.x(17.72)} ry="5" transform={`rotate(-22 ${PR.x(17.72)} ${PR.y(46.87)})`} className="hu-lake" />
        <text x={PR.x(20.55)} y={PR.y(46.8)} className="map-region">Alföld</text>
        <text x={PR.x(17.0)} y={PR.y(46.35)} className="map-region">Dunántúl</text>
        {layout.map(({ pl, raw, pos }) => {
          const moved = Math.hypot(pos.x - raw.x, pos.y - raw.y) > 3;
          return moved ? <line key={pl.id + "l"} x1={raw.x} y1={raw.y} x2={pos.x} y2={pos.y} className="leader" /> : null;
        })}
        {layout.map(({ pl, raw }) => (
          <circle key={pl.id + "d"} cx={raw.x} cy={raw.y} r="2" className="true-dot" />
        ))}
        {layout.map(({ pl, pos }) => {
          const c = CATS[pl.category];
          const sel = selected === pl.id;
          const stamped = !!p.stamps?.[pl.id];
          return (
            <g
              key={pl.id}
              className={`dpin tone-${c.tone}${sel ? " sel" : ""}${stamped ? " stamped" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${pl.name}: ${pl.titleEn}`}
              onClick={() => {
                sfx("tap");
                onSelect(pl.id);
              }}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(pl.id)}
            >
              <circle cx={pos.x} cy={pos.y} r={sel ? 13 : 10.5} className="dpin-c" />
              <IconGlyph name={c.icon} x={pos.x} y={pos.y} size={sel ? 14 : 12} />
              {stamped && <circle cx={pos.x + 8} cy={pos.y - 8} r="3.6" className="dpin-stamp" />}
              {sel && (
                <text x={pos.x} y={pos.y - 18} textAnchor="middle" className="dpin-label">
                  {pl.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function CatChip({ cat, on, onClick, count }: { cat: DiscoverCategory; on: boolean; onClick: () => void; count?: number }) {
  const c = CATS[cat];
  return (
    <button type="button" className={`cat-chip tone-${c.tone}${on ? " on" : ""}`} aria-pressed={on} onClick={onClick}>
      <Icon name={c.icon} size={15} />
      <span>{c.hu}</span>
      {count !== undefined && <span className="cat-count">{count}</span>}
    </button>
  );
}

export function placeGlossary(pl: DiscoverPlace) {
  return Object.fromEntries(pl.words.map((w) => [w.hu.split(",")[0].trim(), getState().settings.showRo ? `${w.en} · RO: ${w.ro}` : w.en]));
}
