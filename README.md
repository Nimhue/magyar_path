# Magyar Path

A Hungarian study app built lesson by lesson: flashcards with spaced repetition, grammar reference, quizzes, drills, short readings and notes with photos. Lessons unlock in order; a teacher code unlocks everything.

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
```

## Adding a new lesson

All learning content lives in `/content` as JSON. You never need to touch the code in `/src`.

```
content/
  config.json        pass marks, cards per session, teacher code
  lessons/           one file per lesson (vocab, homework, links)
  grammar/           one file per grammar topic
  exercises/         drill sets (multiple choice, typing, sorting, matching, listening)
  readings/          short texts with comprehension questions
```

1. Copy an existing lesson file, e.g. `content/lessons/03-orana.json` → `05-something.json`.
2. Give it a new `id` and the next `order` number. Lessons unlock in `order`.
3. Fill in `vocab` groups. Each item is `{ "hu": "...", "en": "...", "note": "optional" }`.
   - Add `"kind": "phrase"` for sentences, `"kind": "rule"` for grammar facts (rules show as flashcards but are kept out of quizzes).
4. List the grammar topics, drill sets and readings it uses by their ids.
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

### Grammar section types

`heading`, `text`, `tip` (tone `info` or `warn`), `table`, `examples`, `pairs` (minimal pairs with audio) and `widget` (`harmony`, `article`, `van`). In any text, `**bold**` and `*italic*` work.

## How a lesson is completed

A lesson counts as done when the learner has **seen every flashcard**, scored **80%+ on the quiz** and passed **every drill set (70%+)**. That unlocks the next lesson. Readings are a bonus. Grammar and Notes are always open. Change the pass marks in `content/config.json`.

## Teacher code

The default teacher code is **`tanarno`**. Change it before sharing the site:

```bash
npm run teacher-hash -- yournewcode
```

Paste the printed hash into `content/config.json` as `teacherCodeHash`. Teachers enter the code in **Settings → Teacher mode**.

The code is a convenience lock, not real security: anyone determined can read the site's code. That's fine for unlocking lessons.

## Where data is stored

Progress (XP, streaks, card schedules, scores) is in the browser's localStorage. Notes and photos are in IndexedDB. Both stay on the device; Settings and Notes have download/restore buttons for backups.

All progress code lives in `src/lib/store.ts` and notes in `src/lib/notesDb.ts`, so adding sync later (e.g. Supabase accounts) only means swapping those two modules.

## About the content

Vocabulary and grammar follow the MagyarOK A1 course used in class. Drills and reading texts are written fresh for this app; please don't paste textbook pages or exercises in, so the site can be shared with other students. Textbook audio is available from the publisher: <https://mnyi.eu/en/oktatasi-anyagok/magyarok-tankonyvcsalad>.
