# Magyar Path

A Hungarian study app built lesson by lesson: flashcards with spaced repetition (English + Romanian meanings), a themed dictionary, grammar reference with interactive tools, quizzes, drills, six mini-games, boss challenges, choose-your-path stories, short readings and notes with photos. Lessons unlock in order along a journey around Hungary; a teacher code unlocks everything.

## Deploy to Netlify

**Recommended (auto-deploys every time you add a lesson):**

1. Create a new GitHub repository and push this folder to it.
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo.
3. Netlify reads `netlify.toml` automatically (build: `npm run build`, publish: `dist`). Click **Deploy**.

From then on, every `git push` redeploys the site.

**Quick test without GitHub:** run `npm install && npm run build` and drag the `dist` folder onto <https://app.netlify.com/drop>.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # checks all content, then builds to dist/
npm run build:offline   # one self-contained HTML file in dist-offline/, opens by double-click
```

Opening `dist/index.html` straight from your disk shows a blank page: browsers block a built app's scripts on `file://`. Use the site on Netlify, `npm run preview`, or the offline single file.

## Adding a new lesson

All learning content lives in `/content` as JSON. You never need to touch the code in `/src`.

```
content/
  config.json        pass marks, cards per session, teacher code
  lessons/           one file per lesson (vocab, homework, map stop, links)
  grammar/           one file per grammar topic
  exercises/         drill sets (choice, typing, sorting, matching, listening, word order)
  readings/          short texts with comprehension questions
  stories/           choose-your-path conversations
  dictionary/        themed word collections (food, travel, holidays…), always open
  discover/          one file per place on the Discover Hungary map
  culture/           proverbs, tongue twisters, songs and recipes (one file each)
  tales/             Magyar népmesék episodes (YouTube embeds + easy retelling + quiz)
```

1. Copy an existing lesson file, e.g. `content/lessons/03-orana.json` → `05-something.json`.
2. Give it a new `id` and the next `order` number. Lessons unlock in `order`.
3. Fill in `vocab` groups. Each item is `{ "hu": "...", "en": "...", "ro": "...", "note": "optional" }`. `ro` (Romanian) is optional but shown to learners who turn it on.
   - Add `"kind": "phrase"` for sentences, `"kind": "rule"` for grammar facts (rules show as flashcards but are kept out of quizzes).
4. List the grammar topics, drill sets, readings and stories it uses by their ids. Add a `place` (`name`, `fact`, `lon`, `lat`) to put the lesson on the journey map.
5. Run `npm run validate`. It tells you exactly what's wrong if anything is (a missing id, an answer that isn't among the options, a duplicate word…).
6. Commit and push. Netlify rebuilds.

Quizzes are generated automatically from each lesson's vocabulary, so a new lesson gets its quiz for free.

### Lesson file shape

```json
{
  "id": "l05-szamok",
  "order": 5,
  "title": "A számok",
  "titleEn": "Numbers",
  "date": "2026-10-12",
  "level": "A1",
  "summary": "One sentence about the lesson.",
  "grammar": ["numbers"],
  "exercises": ["x05-numbers"],
  "readings": ["r05-piac"],
  "homework": ["Textbook p. 20, exercise 3"],
  "vocab": [
    { "name": "Számok · Numbers", "items": [{ "hu": "egy", "en": "one (1)" }] }
  ]
}
```

### Drill item types

| type     | fields                                               |
| -------- | ---------------------------------------------------- |
| `choice` | `prompt`, `options[]`, `answer`, `explain?`          |
| `type`   | `prompt`, `answer` (string or list of accepted), `hint?` |
| `listen` | `say` (spoken aloud), `options[]`, `answer`          |
| `sort`   | `prompt`, `buckets[]`, `items[{text, bucket}]`       |
| `match`  | `prompt`, `pairs[{left, right}]`                     |
| `order`  | `prompt` (meaning), `tiles[]`, `answer` (correct sentence) |

### Grammar section types

`heading`, `text`, `tip` (tone `info` or `warn`), `table`, `examples`, `pairs` (minimal pairs with audio) and `widget` (`harmony`, `article`, `van`, `conjugate`, `possessive`, `location`). In any text, `**bold**` and `*italic*` work.

### Stories

A story is a set of `nodes`, starting at `start`. Each node has the Hungarian `text`, its English `textEn`, an optional `speaker`, and `choices` (`text`, `to` the next node, optional `note` explaining a mistake). Final nodes have `"end": "great" | "ok" | "oops"`. The validator checks every `to` points somewhere.

### Dictionary categories

`content/dictionary/NN-name.json`: `id`, `order`, `title`, `titleEn`, `color` (red, paprika, yellow, green, teal, blue, purple, pink, gray), `mark` (1–3 letters for the tile) and `groups` of items, same shape as lesson vocab. Dictionary words never lock and get their own flashcards, quiz and memory game.

### Discover Hungary places

`content/discover/<id>.json` puts a pin on the Kultúra map:

```json
{
  "id": "tata", "name": "Tata", "lon": 18.32, "lat": 47.65,
  "category": "history",
  "title": "A vizek városa", "titleEn": "The city of waters", "titleRo": "Orașul apelor",
  "story":     [{ "hu": "…", "en": "…", "ro": "…" }],
  "facts":     [{ "hu": "…", "en": "…", "ro": "…" }],
  "words":     [{ "hu": "tó", "en": "lake", "ro": "lac" }],
  "questions": [{ "q": "…", "qEn": "…", "options": ["…"], "answer": "…" }]
}
```

`category` is one of `legend`, `tale`, `history`, `invention`, `food`, `nature`, `tradition`, `music`, `language` (these are the map filters). Keep story sentences short and in easy Hungarian. Answering two of three questions stamps the learner's passport.

### Culture files

`content/culture/proverbs.json`, `tongue-twisters.json`, `songs.json` and `recipes.json` each hold an `items` list; copy an existing item to add one. Only add songs that are traditional or out of copyright.

### Mesék (cartoon tales)

`content/tales/NN-id.json` adds an episode of *Magyar népmesék*:

```json
{
  "id": "so", "order": 1, "title": "A só", "titleEn": "The Salt Princess", "titleRo": "Sarea",
  "episode": "S01E01", "level": 1,
  "video": { "hu": "2N4BvZJjk2Q", "huTitle": "Magyar népmesék: A só", "en": "FVGT3Syc31Q", "enTitle": "The Salt Princess" },
  "place": "sosto",
  "summary": [{ "hu": "…", "en": "…", "ro": "…" }],
  "words": [{ "hu": "só", "en": "salt", "ro": "sare" }],
  "questions": [{ "q": "…", "qEn": "…", "options": ["…"], "answer": "…" }]
}
```

`hu` and `en` are YouTube video ids (the part after `watch?v=`) from the official channels: **Kecskemetfilm Kids** (Hungarian) and **Hungarian Folk Tales** (English dub). Only use official uploads. When a video loads, the app compares its real title and channel with `huTitle` / `enTitle` and shows a warning if a link now points somewhere else. `place` links the tale to a Discover pin.

**My scenes** (Kultúra → Jelenetek) are saved per learner: moments saved while watching a tale (they replay from that point) and lines written down from any show watched with Hungarian audio. Both can go straight into the My words flashcards.

### Survival pack

A story with `"pack": "survival"` and no `lesson` is always open and shows under Practice → Survival pack. Nodes and choices can carry `textRo` next to `textEn`.

### Journey trail

Each lesson's `place` is a stop on the trail. Add `"icon"` (`parliament`, `palace`, `castle`, `village`, `church`, `basilica`, `fortress`, `lake`) to choose its drawing; otherwise it's guessed from the name.

### Tidy formatting

`python3 scripts/format-content.py` rewrites lesson and dictionary files with one word per line. Pass a JSON file of `{"hu": "ro"}` pairs to fill in missing Romanian meanings in bulk.

## Games and rewards

- **Mini-games:** memory pairs, word rain, sentence builder, petals (hangman), vowel harmony sort, listening bingo, *Hol van Cirmi?* (place endings), *Van-gép* (to be, nem / nincs), *Gyors válasz* (quick replies), *Ékezetvadász* (accent pairs), *Te vagy Ön?* (informal vs formal).
- **Cseppek (Drops-style):** 2, 5 or 10-minute picture sessions per topic. Each word climbs 4 levels (meet, pick, hear, spell); learned words join the flashcard reviews.
- **Numbers to egybillió (10¹²):** listen, write, build from tiles, big-number facts, prices, years, time, and the 10-rung *Számlétra* ladder. They use words from unlocked lessons plus dictionary words you've learned.
- **Boss challenge** per lesson: 15 mixed questions, 3 hearts; winning puts a crown on the path.
- **Combos:** 5 in a row doubles XP, 10 in a row triples it.
- **Daily quests** (3 a day), **27 trophies**, **levels**, **streaks**, a weekly XP chart, and **Bodza's wardrobe**: outfits unlock with levels, streaks and seasons.
- **Themes:** Paprika, Balaton, Tokaj, Levendula, Matyó and Éjjel, each in light and dark (Settings).

## Kultúra (always open, never needed to finish a lesson)

- **Discover Hungary:** a map with 26 places and 9 filters. Each place has a short story in easy Hungarian with English and Romanian, fun facts, words you can add to *My words*, and a passport stamp.
- **Sayings** (proverbs and idioms with their Romanian twins), **tongue twisters**, **folk songs and nursery rhymes**, **recipes**.
- **Mesék:** 22 episodes of the classic *Magyar népmesék* cartoon, embedded from the official channels: read an easy retelling, watch in Hungarian (tick off the words you hear), check with the official English dub, take a 3-question quiz. **My scenes** keeps moments and show lines as flashcards.
- **Word and fact of the day** sit at the end of the Path page.
- Under Practice: the **numbers trainer** (listening, writing, prices, years, the time) and the **survival pack** (ticket office, pharmacy, doctor, restaurant, post office).

## How a lesson is completed

A lesson counts as done when the learner has **seen every flashcard**, scored **80%+ on the quiz** and passed **every drill set (70%+)**. That unlocks the next lesson. Readings, stories and the boss are bonuses. Grammar and Notes are always open. Change the pass marks in `content/config.json`.

## Teacher code

The default teacher code is **`tanarno`**. Change it before sharing the site:

```bash
npm run teacher-hash -- yournewcode
```

Paste the printed hash into `content/config.json` as `teacherCodeHash`. Teachers enter the code in **Settings → Teacher mode**.

The code is a convenience lock, not real security: anyone determined can read the site's code. That's fine for unlocking lessons.

## Accounts, sync and transfer codes

The site includes a small backend (`netlify/functions/api.mts`, logic in `netlify/shared/api.ts`) that runs on Netlify for free and stores data in **Netlify Blobs**. Nothing to set up: deploying from GitHub turns it on.

- **Accounts:** username + password (no email). Passwords are hashed with PBKDF2. After signing in, progress, notes and photos sync automatically between devices. Merging never loses work: newest flashcard review wins, best scores win, XP and streaks never go down, deleted notes stay deleted.
- **Transfer codes:** without an account, *Settings → Move to another device* makes an 8-character code (and a QR code / link) valid once for 30 minutes. Entering it on the other device merges everything in.
- Endpoints: `/api/signup`, `/api/login`, `/api/logout`, `/api/account` (DELETE), `/api/sync`, `/api/photo`, `/api/transfer`, `/api/health`.
- Sync and transfer need the online site. The double-click offline file still works, just without them.

**Why progress can "disappear":** browsers keep data per web address. A different address (a renamed Netlify site, a deploy preview, the Netlify Drop test site, or the offline file) has its own separate progress. Signing in fixes this for good.

## Where data is stored

Progress (XP, streaks, card schedules, scores) is in the browser's localStorage and notes/photos in IndexedDB, so the app works offline. With an account, a copy is kept online and merged on every device (`src/lib/cloud.ts`, `src/lib/merge.ts`). Settings and Notes also have download/restore buttons for manual backups.

## Hungarian pronunciation

Audio uses the device's own text-to-speech. If no Hungarian voice is installed, the app stays silent instead of reading Hungarian with an English voice, and *Settings → Hungarian voice* shows how to add one on Windows, Mac, iPhone and Android. On Windows, Microsoft Edge has the most natural Hungarian voices built in.

## About the content

Vocabulary and grammar follow the MagyarOK A1 course used in class. Drills and reading texts are written fresh for this app; please don't paste textbook pages or exercises in, so the site can be shared with other students. Textbook audio is available from the publisher: <https://mnyi.eu/en/oktatasi-anyagok/magyarok-tankonyvcsalad>.
