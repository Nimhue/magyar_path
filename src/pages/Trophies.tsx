import { MASCOTS, Puli } from "../components/Mascot";
import { Icon, PageHead } from "../components/ui";
import { OUTFITS, TROPHIES, currentOutfit } from "../lib/game";
import { href } from "../lib/router";
import { levelFor, liveStreak, update, useProgress, weekXp } from "../lib/store";

export function WeekChart() {
  const p = useProgress();
  const week = weekXp(p);
  const max = Math.max(50, ...week.map((d) => d.xp));
  const total = week.reduce((a, d) => a + d.xp, 0);
  return (
    <figure className="week">
      <figcaption>
        <strong>This week</strong>
        <span className="muted tabnum">{total} XP</span>
      </figcaption>
      <div className="week-bars" role="img" aria-label={`XP over the last 7 days: ${week.map((d) => `${d.label} ${d.xp}`).join(", ")}`}>
        {week.map((d, i) => (
          <div key={d.day} className={"wb" + (i === 6 ? " today" : "")}>
            <span className="wb-val tabnum">{d.xp || ""}</span>
            <span className="wb-bar" style={{ height: `${Math.max(3, (d.xp / max) * 100)}%` }} />
            <span className="wb-label">{d.label}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function TrophiesPage() {
  const p = useProgress();
  const lvl = levelFor(p.xp);
  const got = TROPHIES.filter((t) => p.trophies[t.id]).length;
  const outfit = currentOutfit(p);
  return (
    <div className="stack-lg">
      <PageHead title="Eredmények" sub="Your progress, trophies, study buddy and wardrobe" back={href("")} />
      <section className="panel me-head">
        <Puli mood="happy" size={96} />
        <div className="me-stats">
          <div>
            <span className="muted small-print">Level</span>
            <b>{lvl.level}</b>
          </div>
          <div>
            <span className="muted small-print">XP</span>
            <b className="tabnum">{p.xp}</b>
          </div>
          <div>
            <span className="muted small-print">Streak</span>
            <b>{liveStreak(p)}</b>
          </div>
          <div>
            <span className="muted small-print">Best combo</span>
            <b>{p.bestCombo}</b>
          </div>
          <div className="me-level">
            <div className="bar">
              <i style={{ width: `${(lvl.into / lvl.span) * 100}%` }} />
            </div>
            <span className="muted small-print tabnum">
              {lvl.span - lvl.into} XP to level {lvl.level + 1}
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <WeekChart />
      </section>

      <section>
        <h2 className="section-title">
          Trófeák · Trophies{" "}
          <span className="muted tabnum small-print">
            {got}/{TROPHIES.length}
          </span>
        </h2>
        <ul className="trophy-grid">
          {TROPHIES.map((t) => {
            const on = !!p.trophies[t.id];
            return (
              <li key={t.id} className={"trophy" + (on ? " on" : "")}>
                <span className="trophy-icon">
                  <Icon name={on ? "trophy" : "lock"} size={22} />
                </span>
                <strong lang="hu">{t.titleHu}</strong>
                <span className="small-print">{t.title}</span>
                <span className="muted small-print">{t.desc}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="section-title">Tanulótárs · Your study buddy</h2>
        <div className="wardrobe buddies" role="radiogroup" aria-label="Study buddy">
          {MASCOTS.map((m) => (
            <button
              key={m.id}
              role="radio"
              aria-checked={p.settings.mascot === m.id}
              className={"outfit" + (p.settings.mascot === m.id ? " sel" : "")}
              onClick={() => update((d) => void (d.settings.mascot = m.id))}
            >
              <Puli mood="happy" size={72} kind={m.id} />
              <strong>{m.name}</strong>
              <span className="muted small-print">
                {m.what} · <span lang="hu">{m.hu}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Ruhatár · Wardrobe</h2>
        <div className="wardrobe">
          <button
            className={"outfit" + (p.settings.outfit === "auto" ? " sel" : "")}
            onClick={() => update((d) => void (d.settings.outfit = "auto"))}
          >
            <Puli mood="happy" size={64} />
            <strong>Automatic</strong>
            <span className="muted small-print">Best unlocked</span>
          </button>
          {OUTFITS.map((o) => {
            const ok = o.available(p);
            return (
              <button
                key={o.id}
                className={"outfit" + (p.settings.outfit === o.id ? " sel" : "") + (ok ? "" : " locked")}
                disabled={!ok}
                onClick={() => update((d) => void (d.settings.outfit = o.id))}
                aria-pressed={outfit === o.id}
              >
                <Puli mood="happy" size={64} outfit={ok ? o.id : "none"} />
                <strong>{o.name}</strong>
                <span className="muted small-print">{ok ? "Unlocked" : o.unlock}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
