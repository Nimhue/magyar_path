/**
 * More mini-games for grammar and conversation:
 * Hol van Cirmi? (place endings), Van-gép (to be / nincs), Gyors válasz (replies), Ékezetvadász (accents), Te vagy Ön? (formal/informal).
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Buddy, MascotSays, mascotName } from "../components/Mascot";
import { ComboBadge, PageHead, SpeakButton } from "../components/ui";
import { shuffle } from "../lib/answer";
import { confetti } from "../lib/celebrate";
import { href } from "../lib/router";
import { sfx } from "../lib/sound";
import { canSpeak, speak } from "../lib/speech";
import { addXp, bump, update, useProgress } from "../lib/store";
import { useCombo } from "./Quiz";

export const MORE_GAMES = [
  { id: "hol", title: "Hol van Cirmi?", titleEn: "Where's the buddy?", desc: "Your buddy hides around town. Pick the right -ban/-ben/-n ending.", tone: "green" },
  { id: "vangep", title: "Van-gép", titleEn: "To-be slot machine", desc: "Spin a sentence, then choose vagyok, vagy, van… or nothing, nem and nincs.", tone: "yellow" },
  { id: "valasz", title: "Gyors válasz", titleEn: "Quick reply", desc: "Someone talks to you. Pick the right answer before the timer runs out.", tone: "blue" },
  { id: "ekezet", title: "Ékezetvadász", titleEn: "Accent hunter", desc: "agy or ágy? hal or hall? Catch the right spelling for the meaning.", tone: "red" },
  { id: "tegez", title: "Te vagy Ön?", titleEn: "Informal or formal?", desc: "Is it said to a friend (te) or politely (Ön)? Sort fast.", tone: "purple" },
] as const;

function record(id: string, score: number, xp: number) {
  bump("game");
  update((d) => {
    const g = d.games[id] ?? { plays: 0, best: 0 };
    d.games[id] = { plays: g.plays + 1, best: Math.max(g.best, score) };
  });
  addXp(xp);
}

interface Round {
  prompt: ReactNode;
  options: string[];
  answer: string;
  /** shown after a wrong answer */
  explain?: string;
  /** read aloud after answering */
  say?: string;
  /** shown on the option buttons instead of the raw option */
  label?: (o: string) => ReactNode;
}

/** A timed multiple-choice game: either a total clock, or a clock per question for a fixed number of rounds. */
function TimedGame({
  id,
  title,
  sub,
  intro,
  make,
  seconds = 45,
  perQuestion,
  rounds = 10,
  columns,
}: {
  id: string;
  title: string;
  sub: string;
  intro: ReactNode;
  make: () => Round;
  seconds?: number;
  /** seconds per question (then the game has `rounds` questions) */
  perQuestion?: number;
  rounds?: number;
  columns?: number;
}) {
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<"ready" | "play" | "end">("ready");
  const [left, setLeft] = useState(perQuestion ?? seconds);
  const [round, setRound] = useState<Round>(() => make());
  const [n, setN] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const { combo, hit } = useCombo();
  const scoreRef = useRef(0);
  const total = perQuestion ? perQuestion : seconds;

  useEffect(() => {
    if (phase !== "play" || (perQuestion && picked)) return;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [phase, picked, perQuestion]);

  const end = () => {
    setPhase("end");
    const s = scoreRef.current;
    record(id, s, 5 + s * 2);
    if (s >= (perQuestion ? rounds * 0.8 : 15)) {
      confetti();
      sfx("win");
    }
  };

  const next = () => {
    if (perQuestion && n + 1 >= rounds) return end();
    setPicked(null);
    setRound(make());
    setN((x) => x + 1);
    if (perQuestion) setLeft(perQuestion);
  };

  useEffect(() => {
    if (phase !== "play" || left > 0) return;
    if (!perQuestion) end();
    else if (!picked) choose("__timeout__");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left]);

  const choose = (o: string) => {
    if (picked) return;
    const ok = o === round.answer;
    setPicked(o);
    hit(ok, 1);
    sfx(ok ? "good" : "bad");
    if (ok) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
    }
    if (round.say) speak(round.say);
    setTimeout(next, ok ? 450 : 1500);
  };

  if (phase === "ready")
    return (
      <div className="stack-lg">
        <PageHead title={title} sub={sub} back={href("practice")} />
        <MascotSays mood="happy">{intro}</MascotSays>
        <button
          className="btn primary block big"
          onClick={() => {
            scoreRef.current = 0;
            setScore(0);
            setN(0);
            setLeft(perQuestion ?? seconds);
            setRound(make());
            setPhase("play");
          }}
        >
          Start
        </button>
      </div>
    );

  if (phase === "end") {
    const s = scoreRef.current;
    const good = perQuestion ? s >= rounds * 0.8 : s >= 15;
    return (
      <div className="stack-lg" key={run}>
        <PageHead title={title} back={href("practice")} />
        <div className="score-card">
          <div className="score-big ok">{perQuestion ? `${s}/${rounds}` : s}</div>
        </div>
        <MascotSays mood={good ? "party" : s >= (perQuestion ? rounds / 2 : 8) ? "happy" : "neutral"}>
          <strong>{good ? "Fantasztikus!" : "Ügyes!"}</strong>
          <span>{perQuestion ? `${s} of ${rounds} right.` : `${s} right in ${seconds} seconds.`}</span>
        </MascotSays>
        <div className="row gap wrap">
          <button
            className="btn primary"
            onClick={() => {
              setRun((r) => r + 1);
              setPhase("ready");
            }}
          >
            Play again
          </button>
          <a className="btn" href={href("practice")}>
            Done
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="stack session">
      <div className="session-top">
        <span className={"timer" + (left <= (perQuestion ? 3 : 10) ? " low" : "")}>{left}s</span>
        <div className="bar">
          <i style={{ width: `${(left / total) * 100}%` }} />
        </div>
        <span className="tabnum strong">{perQuestion ? `${n + 1}/${rounds}` : score}</span>
      </div>
      <ComboBadge combo={combo} />
      <div className="g2-prompt" key={n}>
        {round.prompt}
      </div>
      <div className="g2-options" style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}>
        {round.options.map((o) => (
          <button
            key={o}
            lang="hu"
            className={"option g2-option" + (picked ? (o === round.answer ? " right" : o === picked ? " wrong" : " dim") : "")}
            onClick={() => choose(o)}
            disabled={!!picked}
          >
            {round.label ? round.label(o) : o}
          </button>
        ))}
      </div>
      {picked && picked !== round.answer && round.explain && <p className="g2-explain">{round.explain}</p>}
      {picked === "__timeout__" && <p className="g2-explain">Time's up! It was: {round.answer}</p>}
    </div>
  );
}

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/* ---------------- Hol van Cirmi? ---------------- */

const PLACES: { w: string; f: string; e: string; town?: boolean; why?: string }[] = [
  { w: "bolt", f: "boltban", e: "🏪" },
  { w: "kórház", f: "kórházban", e: "🏥" },
  { w: "rendelő", f: "rendelőben", e: "🩺" },
  { w: "iroda", f: "irodában", e: "🏢", why: "iroda → irodá-: a final a becomes á." },
  { w: "iskola", f: "iskolában", e: "🏫", why: "iskola → iskolá-: a final a becomes á." },
  { w: "kert", f: "kertben", e: "🌳" },
  { w: "pékség", f: "pékségben", e: "🥐" },
  { w: "étterem", f: "étteremben", e: "🍽️" },
  { w: "szoba", f: "szobában", e: "🚪", why: "szoba → szobá-: a final a becomes á." },
  { w: "virágbolt", f: "virágboltban", e: "💐", why: "Compound: look at bolt → -ban." },
  { w: "mosdó", f: "mosdóban", e: "🚻" },
  { w: "gimnázium", f: "gimnáziumban", e: "🎓" },
  { w: "könyvtár", f: "könyvtárban", e: "📚", why: "Compound: look at tár → -ban." },
  { w: "számítógép", f: "számítógépben", e: "💻", why: "Compound: look at gép → -ben." },
  { w: "autó", f: "autóban", e: "🚗" },
  { w: "épület", f: "épületben", e: "🏢" },
  { w: "templom", f: "templomban", e: "⛪" },
  { w: "gyógyszertár", f: "gyógyszertárban", e: "💊", why: "Compound: look at tár → -ban." },
  { w: "könyv", f: "könyvben", e: "📖" },
  { w: "ház", f: "házban", e: "🏠" },
  { w: "konyha", f: "konyhában", e: "🍳" },
  { w: "fürdőszoba", f: "fürdőszobában", e: "🛁", why: "Compound: look at szoba → szobá-ban." },
  { w: "konyhaszekrény", f: "konyhaszekrényben", e: "🗄️", why: "Compound: ignore konyha, szekrény is front → -ben." },
  { w: "hotel", f: "hotelben", e: "🏨", why: "Loan word: the last syllable -tel is front → -ben." },
  { w: "kávézó", f: "kávézóban", e: "☕" },
  { w: "mozi", f: "moziban", e: "🎬", why: "Mixed word with i: back ending -ban." },
  { w: "posta", f: "postán", e: "📮", why: "The post office takes -n: a postán." },
  { w: "piac", f: "piacon", e: "🧺", why: "The market takes -on: a piacon." },
  { w: "egyetem", f: "egyetemen", e: "🎓", why: "University takes -en: az egyetemen." },
  { w: "Budapest", f: "Budapesten", e: "🇭🇺", town: true, why: "Most Hungarian towns take -n: Budapesten." },
  { w: "Magyarország", f: "Magyarországon", e: "🇭🇺", town: true, why: "Hungary takes -on." },
  { w: "Szeged", f: "Szegeden", e: "🌶️", town: true },
  { w: "Debrecen", f: "Debrecenben", e: "⛪", town: true, why: "Debrecen is an exception: Debrecenben." },
  { w: "Bécs", f: "Bécsben", e: "🇦🇹", town: true, why: "Foreign towns take -ban/-ben." },
  { w: "Prága", f: "Prágában", e: "🇨🇿", town: true, why: "Prága → Prágá-ban." },
  { w: "Bukarest", f: "Bukarestben", e: "🇷🇴", town: true },
  { w: "Románia", f: "Romániában", e: "🇷🇴", town: true },
  { w: "Kolozsvár", f: "Kolozsváron", e: "🏰", town: true, why: "Kolozsvár has a Hungarian name and takes -on." },
];

function lengthen(w: string) {
  return w.replace(/a$/, "á").replace(/e$/, "é");
}
function placeOptions(p: (typeof PLACES)[number]) {
  const stem = p.w;
  const long = lengthen(stem);
  const forms = [long + "ban", long + "ben", stem + "ban", stem + "ben", /[áé]$/.test(long) ? long + "n" : stem + "on", stem + "en"];
  const wrong = shuffle([...new Set(forms)].filter((f) => f !== p.f));
  // prefer the classic mistakes first: wrong harmony and a forgotten á/é
  wrong.sort((x, y) => Number(!x.startsWith(long)) - Number(!y.startsWith(long)));
  return shuffle([p.f, ...wrong.slice(0, 2)]);
}

export function HolGame() {
  const p = useProgress();
  const name = mascotName(p.settings.mascot);
  return (
    <TimedGame
      id="hol"
      title="Hol van Cirmi?"
      sub="Place endings · 45 seconds"
      intro={
        <>
          <strong>{name} is hiding!</strong>
          <span>
            See where, then pick the right ending: -ban/-ben (in), or -n/-on/-en (Hungarian towns, the post office, the market…). Remember: iskola →
            iskolában.
          </span>
        </>
      }
      make={() => {
        const pl = pick(PLACES);
        return {
          prompt: (
            <div className="hol-scene">
              <span className="hol-place" aria-hidden="true">
                {pl.e}
              </span>
              <span className="hol-buddy" aria-hidden="true">
                <Buddy mood="happy" size={58} />
              </span>
              <span className="hol-q" lang="hu">
                Hol van {name}? <strong>{pl.w}</strong>
              </span>
              <span className="muted small-print" lang="hu">
                {name} {pl.town ? "" : pl.w === "egyetem" ? "az " : "a "}… van.
              </span>
            </div>
          ),
          options: placeOptions(pl),
          answer: pl.f,
          explain: pl.why ?? `It's ${pl.f}.`,
          say: `${name} ${pl.town ? "" : pl.w === "egyetem" ? "az " : "a "}${pl.f} van.`,
        };
      }}
    />
  );
}

/* ---------------- Van-gép ---------------- */

const SUBJECTS = [
  { s: "Én", p: 1, pl: false },
  { s: "Te", p: 2, pl: false },
  { s: "Péter", p: 3, pl: false },
  { s: "Ön", p: 3, pl: false },
  { s: "Anna", p: 3, pl: false },
  { s: "Mi", p: 1, pl: true },
  { s: "Ti", p: 2, pl: true },
  { s: "Ők", p: 3, pl: true },
  { s: "A diákok", p: 3, pl: true },
] as const;
const WHAT_SG = ["tanár", "diák", "magyar", "román", "mérnök", "fáradt", "budapesti", "orvos"];
const WHAT_PL = ["tanárok", "diákok", "magyarok", "románok", "mérnökök", "fáradtak", "budapestiek", "orvosok"];
const WHERE = ["otthon", "itt", "a kertben", "Budapesten", "az irodában", "a boltban"];
const POS = { 1: ["vagyok", "vagyunk"], 2: ["vagy", "vagytok"] } as const;

export function VanGame() {
  return (
    <TimedGame
      id="vangep"
      title="Van-gép"
      sub="The to-be slot machine · 60 seconds"
      seconds={60}
      columns={2}
      intro={
        <>
          <strong>Pörgesd meg! Spin it!</strong>
          <span>
            Who or what someone is: <b>Péter tanár.</b> (no van!). Where someone is: <b>Péter otthon van.</b> Not: <b>Péter nem tanár</b> but{" "}
            <b>Péter nincs otthon</b>.
          </span>
        </>
      }
      make={() => {
        const sub = pick(SUBJECTS);
        const where = Math.random() < 0.45;
        const neg = Math.random() < 0.4;
        let comp = where ? pick(WHERE) : pick(sub.pl ? WHAT_PL : WHAT_SG);
        while (comp === "diákok" && sub.s === "A diákok") comp = pick(WHAT_PL);
        let answer: string;
        if (sub.p === 3) answer = neg ? (where ? (sub.pl ? "nincsenek" : "nincs") : "nem") : where ? (sub.pl ? "vannak" : "van") : "—";
        else answer = (neg ? "nem " : "") + POS[sub.p][sub.pl ? 1 : 0];
        const pool = neg
          ? ["nem vagyok", "nem vagy", "nem", "nincs", "nem vagyunk", "nem vagytok", "nincsenek", "nem van"]
          : ["vagyok", "vagy", "van", "—", "vagyunk", "vagytok", "vannak"];
        const options = shuffle([answer, ...shuffle(pool.filter((o) => o !== answer)).slice(0, 3)]);
        const gap = <span className="slot-gap">?</span>;
        const sentence = neg ? (
          <>
            <span className="reel">{sub.s}</span> {gap} <span className="reel">{comp}</span>.
          </>
        ) : (
          <>
            <span className="reel">{sub.s}</span> <span className="reel">{comp}</span> {gap}.
          </>
        );
        const full = (neg ? `${sub.s} ${answer === "—" ? "" : answer} ${comp}` : `${sub.s} ${comp} ${answer === "—" ? "" : answer}`).replace(/\s+/g, " ").trim() + ".";
        return {
          prompt: (
            <div className="slot-machine" lang="hu">
              <span className="slot-lights" aria-hidden="true">
                {neg ? "NEM" : "VAN"}
              </span>
              <div className="slot-window">{sentence}</div>
            </div>
          ),
          options,
          answer,
          label: (o) => (o === "—" ? "— (nothing)" : o),
          explain:
            sub.p === 3 && !where
              ? neg
                ? `Who/what someone is → just nem: ${full}`
                : `Who/what someone is: no van in the 3rd person. ${full}`
              : sub.p === 3
                ? `Where someone is → ${neg ? "nincs / nincsenek" : "van / vannak"}. ${full}`
                : full,
          say: full,
        };
      }}
    />
  );
}

/* ---------------- Gyors válasz ---------------- */

const CHAT: { q: string; en: string; a: string; wrong: [string, string]; why?: string }[] = [
  { q: "Szia! Hogy vagy?", en: "Hi! How are you?", a: "Jól, köszi. És te?", wrong: ["Köszönöm, jól vagyok. És Ön?", "Nagyon örülök!"], why: "They used te (Szia, vagy), so answer with te." },
  { q: "Jó napot! Hogy van?", en: "Good day! How are you? (formal)", a: "Köszönöm, jól vagyok. És Ön?", wrong: ["Jól, köszi. És te?", "Szia!"], why: "Hogy van? is formal, so answer with Ön." },
  { q: "Mi a neved?", en: "What's your name?", a: "Adina vagyok.", wrong: ["Budapesti vagyok.", "Huszonöt éves vagyok."] },
  { q: "Mi a neve?", en: "What's your name? (formal)", a: "Kovács Anna vagyok.", wrong: ["Igen, az vagyok.", "Magyarul beszélek."] },
  { q: "Hány éves vagy?", en: "How old are you?", a: "Huszonöt éves vagyok.", wrong: ["Román vagyok.", "Budapesten élek."] },
  { q: "Milyen nemzetiségű vagy?", en: "What's your nationality?", a: "Román vagyok.", wrong: ["Romániában.", "Románul."] },
  { q: "Hol élsz?", en: "Where do you live?", a: "Budapesten élek.", wrong: ["Budapestben élek.", "Budapesti élek."], why: "Budapest takes -en: Budapesten." },
  { q: "Milyen nyelven beszélsz?", en: "Which languages do you speak?", a: "Románul és angolul beszélek.", wrong: ["Román és angol beszélek.", "Romániában beszélek."], why: "Languages take -ul/-ül with beszél." },
  { q: "Beszélsz angolul?", en: "Do you speak English?", a: "Igen, beszélek.", wrong: ["Igen, angol vagyok.", "Nem, köszönöm."] },
  { q: "Mi vagy?", en: "What do you do? / What are you?", a: "Mérnök vagyok.", wrong: ["Jól vagyok.", "Itt vagyok."] },
  { q: "Köszönöm!", en: "Thank you!", a: "Szívesen!", wrong: ["Egészségedre!", "Jobbulást!"] },
  { q: "Bocsánat!", en: "Sorry!", a: "Semmi baj.", wrong: ["Szívesen!", "Én is!"] },
  { q: "Hapci!", en: "Achoo!", a: "Egészségedre!", wrong: ["Jobbulást!", "Nagyon örülök!"] },
  { q: "Megfáztam.", en: "I've caught a cold.", a: "Sajnálom. Jobbulást!", wrong: ["Egészségedre!", "Szuper!"] },
  { q: "Nagyon örülök!", en: "Nice to meet you!", a: "Én is!", wrong: ["Szívesen!", "Nem tudom."] },
  { q: "Kérdezhetek valamit?", en: "May I ask something?", a: "Persze!", wrong: ["Nem értem a kérdést.", "Viszontlátásra!"] },
  { q: "Világos minden?", en: "Is everything clear?", a: "Igen, minden világos.", wrong: ["Jó étvágyat!", "Szia!"] },
  { q: "Hogy mondják magyarul azt, hogy chair?", en: "How do you say chair in Hungarian?", a: "Szék.", wrong: ["Asztal.", "Chair."] },
  { q: "Mit jelent az, hogy „bocsánat”?", en: "What does bocsánat mean?", a: "Azt jelenti, hogy sorry.", wrong: ["Bocsánat!", "Nem beszélek."] },
  { q: "Hány óra van?", en: "What time is it?", a: "Három óra van.", wrong: ["Három éves vagyok.", "Három forint."] },
  { q: "Jó éjszakát!", en: "Good night!", a: "Jó éjszakát!", wrong: ["Jó reggelt!", "Jó étvágyat!"] },
  { q: "Viszontlátásra!", en: "Goodbye! (formal)", a: "Viszontlátásra!", wrong: ["Jó napot kívánok!", "Hogy van?"] },
  { q: "Jobban vagy?", en: "Are you feeling better?", a: "Igen, köszönöm, jobban vagyok.", wrong: ["Igen, jobb vagyok, mint ő.", "Megfáztam, köszönöm."] },
  { q: "Lassabban, legyen szíves!", en: "More slowly, please!", a: "Persze, bocsánat!", wrong: ["Gyorsabban!", "Egészségére!"] },
];

export function ValaszGame() {
  const order = useRef<number[]>([]);
  return (
    <TimedGame
      id="valasz"
      title="Gyors válasz"
      sub="Quick reply · 10 messages, 8 seconds each"
      perQuestion={8}
      rounds={10}
      intro={
        <>
          <strong>Csevegjünk! Let's chat!</strong>
          <span>Someone talks to you. Tap the reply that fits. Watch for te (informal) and Ön (formal)!</span>
        </>
      }
      make={() => {
        if (!order.current.length) order.current = shuffle(CHAT.map((_, i) => i));
        const c = CHAT[order.current.pop()!];
        return {
          prompt: (
            <div className="chat-prompt">
              <span className="chat-speaker">Barát</span>
              <div className="chat-bubble big" lang="hu">
                {c.q} {canSpeak() && <SpeakButton text={c.q} small />}
              </div>
              <span className="muted small-print">{c.en}</span>
            </div>
          ),
          options: shuffle([c.a, ...c.wrong]),
          answer: c.a,
          explain: c.why ?? `Best reply: ${c.a}`,
          say: c.a,
        };
      }}
    />
  );
}

/* ---------------- Ékezetvadász ---------------- */

const PAIRS: { a: string; ae: string; b: string; be: string }[] = [
  { a: "agy", ae: "🧠 brain", b: "ágy", be: "🛏️ bed" },
  { a: "örült", ae: "😊 was happy", b: "őrült", be: "🤪 crazy" },
  { a: "Eger", ae: "🏰 the town of Eger", b: "egér", be: "🐭 mouse" },
  { a: "hat", ae: "6️⃣ six", b: "hát", be: "🧍 back; well…" },
  { a: "tör", ae: "💥 breaks", b: "tőr", be: "🗡️ dagger" },
  { a: "fel", ae: "⬆️ up", b: "fél", be: "½ half; is afraid" },
  { a: "kar", ae: "💪 arm", b: "kár", be: "😔 pity, damage" },
  { a: "szel", ae: "🔪 slices", b: "szél", be: "🌬️ wind" },
  { a: "kerek", ae: "⚪ round", b: "kerék", be: "🛞 wheel" },
  { a: "irt", ae: "🧹 wipes out", b: "írt", be: "✍️ wrote" },
  { a: "ver", ae: "🥁 beats", b: "vér", be: "🩸 blood" },
  { a: "megy", ae: "🚶 goes", b: "meggy", be: "🍒 sour cherry" },
  { a: "hal", ae: "🐟 fish", b: "hall", be: "👂 hears" },
  { a: "tol", ae: "🛒 pushes", b: "toll", be: "🖊️ pen; feather" },
  { a: "sor", ae: "🧍🧍 row, queue", b: "sör", be: "🍺 beer" },
];

export function EkezetGame() {
  return (
    <TimedGame
      id="ekezet"
      title="Ékezetvadász"
      sub="Accent hunter · 45 seconds"
      columns={2}
      intro={
        <>
          <strong>Ékezet = accent mark</strong>
          <span>One little line changes the word! agy is a brain, ágy is a bed. Some pairs differ by a double letter: hal (fish), hall (hears).</span>
        </>
      }
      make={() => {
        const pr = pick(PAIRS);
        const first = Math.random() < 0.5;
        const word = first ? pr.a : pr.b;
        return {
          prompt: (
            <div className="accent-prompt">
              <span className="accent-meaning">{first ? pr.ae : pr.be}</span>
              <span className="muted small-print">Which word means this?</span>
            </div>
          ),
          options: shuffle([pr.a, pr.b]),
          answer: word,
          explain: `${pr.a} = ${pr.ae.replace(/^\S+\s/, "")} · ${pr.b} = ${pr.be.replace(/^\S+\s/, "")}`,
          say: word,
        };
      }}
    />
  );
}

/* ---------------- Te vagy Ön? ---------------- */

const TEGEZ: { s: string; t: "te" | "Ön"; en: string }[] = [
  { s: "Hogy vagy?", t: "te", en: "How are you?" },
  { s: "Hogy van?", t: "Ön", en: "How are you?" },
  { s: "Mi a neved?", t: "te", en: "What's your name?" },
  { s: "Mi a neve?", t: "Ön", en: "What's your name?" },
  { s: "És te?", t: "te", en: "And you?" },
  { s: "És Ön?", t: "Ön", en: "And you?" },
  { s: "Beszélsz angolul?", t: "te", en: "Do you speak English?" },
  { s: "Beszél angolul?", t: "Ön", en: "Do you speak English?" },
  { s: "Hol élsz?", t: "te", en: "Where do you live?" },
  { s: "Hol él?", t: "Ön", en: "Where do you live?" },
  { s: "Hány éves vagy?", t: "te", en: "How old are you?" },
  { s: "Hány éves Ön?", t: "Ön", en: "How old are you?" },
  { s: "Szia!", t: "te", en: "Hi! / Bye!" },
  { s: "Jó napot kívánok!", t: "Ön", en: "Good day!" },
  { s: "Köszi!", t: "te", en: "Thanks!" },
  { s: "Legyen szíves!", t: "Ön", en: "Please! (polite)" },
  { s: "Egészségedre!", t: "te", en: "Bless you! / Cheers!" },
  { s: "Egészségére!", t: "Ön", en: "Bless you! / Cheers!" },
  { s: "Mit mondasz?", t: "te", en: "What are you saying?" },
  { s: "Mit mond?", t: "Ön", en: "What are you saying?" },
  { s: "Tanár vagy?", t: "te", en: "Are you a teacher?" },
  { s: "Ön tanár?", t: "Ön", en: "Are you a teacher?" },
  { s: "Mit tanulsz?", t: "te", en: "What are you studying?" },
  { s: "Mit tanul?", t: "Ön", en: "What are you studying?" },
];

export function TegezGame() {
  return (
    <TimedGame
      id="tegez"
      title="Te vagy Ön?"
      sub="Informal or formal · 45 seconds"
      columns={2}
      intro={
        <>
          <strong>Tegezés vagy magázás?</strong>
          <span>
            With friends and kids you use <b>te</b> (vagy, beszélsz, -d). With strangers, older people or at the office: <b>Ön</b>, which works like
            “he/she” (van, beszél, -a/-e).
          </span>
        </>
      }
      make={() => {
        const x = pick(TEGEZ);
        return {
          prompt: (
            <div className="accent-prompt">
              <span className="accent-meaning" lang="hu">
                {x.s}
              </span>
              <span className="muted small-print">{x.en}</span>
            </div>
          ),
          options: ["te", "Ön"],
          answer: x.t,
          label: (o) => (o === "te" ? "🧑‍🤝‍🧑 te · informal" : "🎩 Ön · formal"),
          explain: x.t === "te" ? "Informal: the verb has the te form." : "Formal: Ön takes the he/she form of the verb.",
          say: x.s,
        };
      }}
    />
  );
}
