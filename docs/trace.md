# TRACE

TRACE is the scoring engine that decides which term to show you next in
Read, Review, and Quiz, and how "mastered" you are on any given term. This
document explains how it works today, in plain language, and points you to
where each piece lives in the codebase. For the original design rationale
and the formulas' derivation, see [trace-formula.md](./trace-formula.md).
This file is the one to trust if the two ever disagree — a few details
changed during implementation, and the differences are called out in
[Where this differs from the original design](#where-this-differs-from-the-original-design).

## The core idea

Most spaced-repetition tools track one memory score per item and give it a
due date: "review this tomorrow." TRACE does neither. It tracks **three
independent memory traces per term** — one for reading, one for recall, one
for recognition — and it never schedules anything. Instead, every time you
open Read, Review, or Quiz, TRACE recomputes how much each trace has faded
since you last touched it and shows you whatever's decayed the most. There's
no backlog waiting for you and nothing is ever "overdue": open a tier you
haven't touched in weeks, and it just shows you its weakest terms first.

Nothing is stored pre-computed. Every score TRACE reports — retrievability,
mastery, the known/learning/unknown label — is calculated fresh from a
handful of stored numbers (mostly timestamps and two or three parameters per
trace) each time it's needed.

## The three traces

| Trace           | Fed by | What it represents                               |
| --------------- | ------ | ------------------------------------------------ |
| **Familiarity** | Read   | How much passive exposure you've had to the term |
| **Recall**      | Review | How well you can produce the term unprompted     |
| **Recognition** | Quiz   | How well you can pick the term out of a lineup   |

These are deliberately separate. Reading a definition a dozen times doesn't
mean you could recall it cold, and being able to recognize the right answer
in a multiple-choice question doesn't mean you could produce it from
scratch. TRACE keeps the three apart so each tier ranks terms by the kind of
memory it's actually testing.

All three decay continuously, whether or not you open that tier. A term you
aced in Review last month is quietly getting weaker in the recall trace
right now, even though you haven't reviewed anything since.

### Familiarity, from Read

Every time you read a term, familiarity grows a little, but with steeply
diminishing returns — the first read counts for a lot, the tenth barely
moves it. It also decays fairly quickly if you stop reading a term (faster
than the other two traces), and on its own it can never contribute more
than a small, capped share of a term's overall mastery. Reading alone
cannot make a term "mastered."

Familiarity's real job is to give recall a head start. The first time you
grade a term in Review, its starting recall strength gets nudged up (and
its starting difficulty down) in proportion to how much you'd already read
it. Never read it before that first grade? The nudge is zero, and recall
just starts from its own plain defaults.

### Recall, from Review

This is [FSRS-5](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm),
the same memory model behind modern versions of Anki, with a few weights and
one rule changed (below). Every flashcard grade
you give in Review — Again, Hard, Good, or Easy — updates a stability score
(how many days until your chance of recalling it drops to 90%) and a
difficulty score (how hard this specific term is for you, distinct from how
long you've retained it) for that term. Retrievability is the number the
whole system is actually built around: given the current stability and how
many days it's been since you last recalled the term, retrievability is
your estimated live probability of recalling it right now, decaying
smoothly from 1 immediately after a good grade toward 0 the longer you go
without testing it again.

A term has no recall trace at all until you grade it in Review for the
first time — there's no default, no "probably fine" starting guess. Once
graded, every later grade updates the same stability/difficulty pair using
the FSRS-5 formulas: success grows stability more when the term was already
fading than when it was still fresh, and a lapse drops it sharply, scaled by
how difficult the term is. A grade less than 24 hours after the last one
takes FSRS-5's short-term branch instead, which only scales stability.

Stock FSRS-5 weights are fit to Anki users, and with them a few Goods sent a
term away for years while Again and Hard barely brought it back. TRACE
changes four things, all smoothly, with no caps:

- **Diminishing returns** (`w9`, 0.15 → 0.65): the stronger a term already
  is, the less each Good or Easy adds.
- **Again keeps less** (`w11`, 35% of FSRS-5's). After a lapse, stability
  also never ends up higher than before, as in FSRS-5.
- **Hard is a partial recall**: its stability is a geometric blend of what
  Again and Good would give, 65% toward Again (`HARD_LAPSE_BLEND`). Hard
  pulls a strong term back and holds a fragile one in place. In stock FSRS-5
  Hard always grows stability.
- **Easy moves less**: the Easy bonus drops from 2.95× to 1.6× Good's growth,
  and a first-ever Easy starts at 8 days of stability instead of 15.5.

Graded each time it falls to Review's 0.85 line, five Goods in a row come
back after about 5, 17, 36, 61 and 91 days. An Again on a term that had
reached about 36 days brings it back in about 2, and a Hard in about 7. The
tests in `lib/trace/recall.test.ts` ("review gaps at the Review target") check
this behaviour. Because grades less than a day apart only scale stability, a term
failed twice climbs back in small steps (about 8, 11 and 16 hours) until its
gaps pass a day.

These rules shipped with
[`20261030100000_trace_recall_replay.sql`](../supabase/migrations/20261030100000_trace_recall_replay.sql),
which replayed every term's logged grades under them once, so terms that
earlier rules had sent away for years came back into range.

### Recognition, from Quiz

Quiz answers are noisier than Review grades — a wrong answer might be a
genuine gap, or it might be a misclick on an otherwise-easy multiple-choice
question. So instead of a discrete grade, each Quiz answer updates a
**posterior probability that you actually know the term**, using a simple
Bayesian update: how much a correct or incorrect answer should move your
estimate depends on how easy it'd be to get right by guessing (25% for
4-option multiple choice, 50% for true/false, 5% for a typed answer, where
you have to produce the word yourself). That posterior maps onto a
stability value the same way recall's does, and decays the same way into a
retrievability number.

Two details worth knowing:

- Like recall, a term has no recognition trace until you answer a Quiz
  question about it for the first time. The very first answer starts from
  an assumed 50/50 prior — but only at that moment, never as a standing
  default beforehand.
- A Quiz miss is softened if your current recall retrievability for that
  term is high. If you can clearly still recall a term from memory, a Quiz
  miss on it is more likely a misclick than real forgetting, so the
  posterior takes a smaller hit than it would for a term you're already
  shaky on.

## Mastery: the one number that blends all three

A term's live mastery score blends all three traces — familiarity's capped
contribution, recall retrievability, and recognition retrievability —
weighted so recall counts for the most, recognition next, and familiarity
least:

```
Mastery = 0.2 · Familiarity_used + 0.5 · Recall_retrievability + 0.3 · Recognition_retrievability
```

A track you haven't touched yet (no recall trace, no recognition trace)
contributes zero rather than making the whole thing undefined — a
freshly-read, never-tested term's mastery is exactly whatever Read alone
earned it, which is small by design.

That raw number then gets discounted by how many times you've actually
been tested on the term (Review + Quiz combined), so a single lucky "Easy"
grade on a brand-new term can't read as mastery the way ten consistent
grades would. This adjusted number — **Mastery_adjusted** — is what
everything else (the known/learning/unknown label, the mastery page's
"current strength" figure) is actually built from.

### The known / learning / unknown label

This is a read-only badge, not something you set. There's no toggle
anywhere in the app to mark a term known by hand anymore — the label is
recalculated live from Mastery_adjusted every time it's shown:

| Label        | Condition                                                              |
| ------------ | ---------------------------------------------------------------------- |
| **Known**    | Mastery_adjusted ≥ 0.75, and you've been tested on it at least 3 times |
| **Learning** | Everything in between                                                  |
| **Unknown**  | Mastery_adjusted < 0.6                                                 |

The test-count floor exists because the confidence discount alone doesn't
fully protect against a single strong grade nudging a brand-new term over
0.75 by chance — the explicit count check closes that gap.

Importantly, **this label never affects what Review or Quiz shows you.**
Ranking always uses the raw, undiscounted retrievability described below —
confidence-weighting and the known/unknown split are a reporting layer on
top of the ranking, not part of it.

### Terms learned: the numbers that are actually stored

Mastery_adjusted decays with inactivity by design — that's the point, it's
telling you your _current_ strength. But that means it can't answer "how
many terms have I ever actually learned," since a term you nailed weeks ago
and haven't touched since would report a low score today despite you
having genuinely learned it once.

So there are two pieces of TRACE state that are permanent records rather
than live computations. The first: the first moment a term's
Mastery_adjusted crosses the known threshold, that moment gets stamped and
kept forever, even as the live score later fades. The mastery page shows
both numbers side by side — "current strength" (live, decays) and "terms
learned" (high-water mark, never decreases).

A failed attempt never earns either stamp. That means an Again in Review or a
missed question in Quiz, whatever the score says afterwards. Right after you
answer anything, that track's retrievability is 1 for the instant before it starts
to decay, so a score taken then would credit a miss as a perfectly fresh memory.
`crossedThresholds` in `lib/trace/mastery.ts` applies the rule for both
stamps; Hard still counts, since you did recall the term. A success is still
read at the instant of the answer, so a lucky Good or Hard on a barely-known
term can still earn a stamp. Only misses are filtered out.

The second, a sibling high-water mark (`ever_learning_at`), does the
identical thing one threshold lower — stamped the first time
Mastery_adjusted crosses the learning threshold (0.6) rather than the
known one (0.75). That stamp is still written, but it no longer drives
the mastery page. Collection cards there put every earned term (not
marked known) into exactly one of three buckets from live activity
counts plus `ever_mastered_at` (`lib/trace/pace.ts`):

- **Not started** — no Read, Review, or Quiz activity yet
- **Learning** — any activity on those tracks, and not yet mastered
- **Mastered** — `ever_mastered_at` is set

The per-collection pace line estimates time until the current learning
terms reach Mastered, using recent `ever_mastered_at` crossings. It's
anchored on that permanent stamp rather than the live known/learning/
unknown label, so a term quietly decaying back out of "known" can't make
the estimate's target recede on its own.

### Stories, a second way to read

Read has a Stories mode (`/app/read/stories`, logic in `lib/stories/`)
that writes a short AI piece around the top of a collection's Read queue —
the same `rankReadQueue` order Cards uses, minus marked-known terms. It
doesn't add a trace or a weight of its own. Marking a piece read writes one
ordinary `read` event per term that actually made it into the text, through
the same `recordRead` Cards uses, and only once per piece (`stories.read_at`
is set at most once). Diminishing returns on familiarity apply exactly as
they do for cards.

Cards only count a read after you reveal the definition (or, with the
"Show definitions right away" Read option on, as soon as the card is shown,
the same rule focus mode uses). Stories doesn't
hide anything, so the piece carries a glossary of the definitions for every
term in it, and the reads are recorded when you mark the piece read, not
when it's generated.

While a story's narration plays, the sentence being spoken is highlighted
(the "Highlight text while listening" Read option, `read_narration_highlight`,
on by default). The narration has no timings, so `lib/stories/highlight.ts`
estimates them on the client: each sentence gets a share of the clip in
proportion to its length, after the spoken title. The pause weights at the top
of that file are the knobs if the highlight drifts. Once the player has the
clip, the browser also downloads and decodes it (`lib/stories/clip-pauses.ts`),
finds the quiet stretches (`lib/stories/silence.ts`) and moves each sentence
boundary onto the pause nearest where it was expected
(`lib/stories/pause-alignment.ts`), so the highlight and
Shadowing follow the real audio. The pauses are matched in order, all at once.
A sentence that starts with a speaker label such as "Elena:" gets an extra,
lighter-weighted slot for the pause after the label, so that pause isn't taken
for the end of the previous sentence; stories without labels have no such
slots. Each pause also records its near-silent core, so playback never stops
or starts inside a soft last or first sound. Where no pause is found, or the
clip can't be decoded, the estimates stay. None of this changes scoring.

Shadowing (the "Shadowing" Read option, `read_shadowing*` columns, also
switched by the icon at the top right of a story) is an
optional playback mode for the same narration, for repeating each sentence
aloud after the voice. It turns the ±10s skips into previous and next sentence,
lets you tap a sentence to play it, can loop a sentence, and can pause after
each one for as long as the sentence took (times a multiplier). It forces the
highlight on while it is on and reuses the same timings (measured from the
clip's pauses, or estimated until they are known), through `sentenceBounds` in
`lib/stories/highlight.ts`; the rules for a finished sentence are in
`lib/stories/shadowing.ts`, and the playback hook is
`components/read/stories/use-shadowing-playback.ts`. If the pauses can't
be found, boundaries are only as accurate as the estimates, so a pause can land
a little early or late.
The screen stays on only when the person turns on "Keep screen awake" in the
Read options (Review has its own switch). One `KeepAwake` in Read's layout
covers Cards, Stories, the fullscreen feed and Shadowing, using the shared
`useWakeLock` hook, which lets go after 2 minutes without a tap or key press.

Tapping a sentence to play it is its own Read option ("Tap a sentence to
play it", `read_tap_to_play`, on by default) and works with Shadowing on or
off. If nothing is playing, the tapped sentence plays alone and pauses; if the
narration or Shadowing is already playing, it carries on from there.
It is playback only: nothing is recorded or graded, and replays add no reads.
Marking the piece read works exactly as before.

## How each tier decides what to show you

All three tiers rank the exact same pool of terms — every term across your
active collections — just by a different signal. There's no separate
"known pool" or "unknown pool" to graduate between anymore.

| Tier       | Ranked by                                                                    | Never-tested terms                                                       |
| ---------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Read**   | Lowest decay-aware exposure (Read+Review+Quiz combined), tempered by mastery | Always included — reading is how a term gets exposure in the first place |
| **Review** | Lowest recall retrievability first                                           | Ranked as if 0.85 retrievable: after decayed terms, before the rest      |
| **Quiz**   | Lowest recognition retrievability first                                      | Ranked as if 0.7 retrievable: after decayed terms, before the rest       |

Read's ranking used to be a simple "fewest reads first" count. It's now a
decay-aware signal that also folds in Review and Quiz history: a term's
reads, review grades, and quiz answers are combined into one exposure
count, anchored on whichever track was touched most recently, and decayed
the same way familiarity decays. On top of that, a small nudge pushes an
already-well-tested term later in the queue, so a term that's been
thoroughly reviewed or quizzed doesn't keep dominating Read purely
because its own read count happens to be zero. Two things this fixes: a
term read many times long ago no longer permanently outranks one read
once very recently (the old count never faded); and a term graded
confidently in Review while never actually opened in Read no longer sits
at the front of Read's queue forever just because `readCount` is 0.

The Review/Quiz placement of never-tested terms is worth dwelling on, because
it's easy to get backwards. A term with no recall trace yet isn't "low risk
because it hasn't decayed" — it's _unknown_ risk, and TRACE still has to serve
it: this is the only way a term can ever get its first grade or first answer at
all. If untested terms were excluded instead, Review and Quiz would have nothing
to show for a term until it had already been tested once, which is circular.

But "unknown" doesn't mean "more urgent than everything you've learned." TRACE
used to put untested terms first, and that has a cost: import a big collection
and every session is spent meeting new terms while the ones you already learned
quietly fade, so by the time they come back you've mostly forgotten them. So
an untested term is ranked as if it were 85% retrievable in Review
(`UNTESTED_RECALL_RETRIEVABILITY`) and 70% in Quiz
(`UNTESTED_RECOGNITION_RETRIEVABILITY`). A learned term that has decayed below
the line goes first, because it's about to slip. In Review the line also works
as the target: a learned term comes back once it is 15% likely to be
forgotten. It used to be 0.7 there too, which made every wait about four times
as long as FSRS intends and let each Good grow stability more. Quiz keeps 0.7
because recognition stability tops out at 16 days, so a higher line would
bring every quizzed term back within about two weeks. Once nothing is below the line, new terms come
next, ahead of learned terms that are still holding. There's no daily limit
and nothing to configure; the line adjusts itself to how much you study. With a
small daily budget most of a session goes to reviewing what's fading. With a large
one, little decays below the line and most of it goes to new terms.

Within a tier, once you've just gotten something right, it drops out of
that tier's list — specifically, once its retrievability rises above 0.98
— so a review or quiz session doesn't keep re-serving something you just
nailed thirty seconds ago. There's no actual concept of a "session" behind
this, though: it's the same live retrievability check used everywhere
else, so how long a term stays excluded depends entirely on how strong the
grade was. A shaky term you just barely passed drops back below 0.98 (and
becomes eligible again) within an hour or two; a term you graded Easy,
which pushes its stability much higher, can stay excluded for a couple of
days, since its retrievability decays that much more slowly. Either way,
once it does drop below 0.98 it re-enters the ranking sorted by its
now-decayed retrievability like anything else — nothing special happens at
that point, it's just no longer being held back.

## Unfinished terms

A term with no definition is "unfinished". It never enters any of the pools
above: `get_trace_candidates` and `progress_state_by_collection` skip it, so it
earns no exposure, adds nothing to mastery denominators or progress counts, and
never reaches Read, Review, Quiz, Stories, the widget or Telegram. Finishing a
term makes it eligible from that moment, with no history, like a newly
imported term. A finished term can't go back, so no trace row ever belongs to
an unfinished term. See [import.md](./import.md).

## Where the logic lives

TRACE is built in layers, each one only reachable through the layer above
it:

1. **`lib/trace/`** — the algorithm itself. Pure math, no database or React
   imports, fully unit-tested. This is where every formula above actually
   lives: familiarity growth/decay, FSRS-5 recall, the Bayesian recognition
   update, the mastery blend, and the three ranking functions
   (`rankReadQueue`, `rankReviewQueue`, `rankQuizQueue`). The barrel file
   `lib/trace/index.ts` is the only door in — nothing outside this folder
   reaches past it. Its main entry points are `computeTraceSnapshot()`
   (get every live number for one term) and `applyReadEvent()` /
   `applyReviewGrade()` / `applyQuizAnswer()` (compute what a term's state
   should become after one event).
2. **`lib/trace-queue/`** — wires the math to Supabase. Fetches every
   term's current stored state for a user, hands it to `lib/trace`'s
   ranking functions, and loads the winning terms' full content. Entry
   points: `pickReadTerms(ForUser)`, `pickReviewTerms(ForUser)`,
   `pickQuizTerms(ForUser)` in `lib/trace-queue/service.ts`. The `ForUser`
   variants take an explicit user id and the service-role client. Telegram
   and the widget need them because they have no browser session. The web
   Read and Review feeds use them too, after checking the session, because
   they load the winning cards in one batched `get_term_cards` call.
   Candidates come from `get_trace_candidates_json` (or
   `my_get_trace_candidates_json`): every row in one JSON array, ordered by
   `term_id`, so a large collection is one call instead of a page per 1000 rows.
3. **`lib/terms/review-outcome.ts`** — the only code in the app allowed to
   record an outcome. Loads a term's current state, asks `lib/trace` to
   compute what it becomes after a read, a review grade, or a quiz answer,
   and persists the result. Its functions — `recordRead`, `recordReveal`,
   `applyReviewGrade`, `applyQuizAnswer` — are the actual entry points
   every surface in the app calls into; nothing else is allowed to write to
   the underlying table directly.
4. **Server actions** — the UI-facing entry points, one set per tier:
   `getReadFeedBatchAction` / `recordReadRevealAction` in
   `app/(private)/app/read/actions.ts`, `rateReviewTermAction` in
   `app/(private)/app/review/actions.ts` (Review's cards load through
   `lib/review/feed.ts`: on the page itself, and on refills through
   `POST /api/review/feed`, so a refill never waits behind a grade), and
   `generateQuizAction` / `recordQuizAnswerAction` in
   `app/(private)/app/quiz/actions.ts`. Telegram has its own equivalents
   in `lib/telegram/` that call the same `lib/terms/review-outcome.ts`
   and `lib/trace-queue` functions underneath.
5. **The database** — two tables. `review_state` holds one row per (user,
   term), storing exactly the fields `TraceState` needs: read count and
   last-read time, recall stability/difficulty and last-review time,
   recognition posterior and last-quiz time, plus the two persisted
   high-water-mark timestamps for "terms learned" (`ever_mastered_at`) and
   its lower-threshold sibling (`ever_learning_at`, added in
   [`supabase/migrations/20260905120000_ever_learning_at.sql`](../supabase/migrations/20260905120000_ever_learning_at.sql)).
   The mastery page's collection buckets and pace line use activity counts
   plus `ever_mastered_at`; `ever_learning_at` is still stamped, but it
   doesn't drive that view. Everything else — every
   retrievability, every mastery number, the known/learning/unknown label
   — is computed in TypeScript on the way out, never in SQL. The TRACE
   columns were added in
   [`supabase/migrations/20260831230000_trace_engine.sql`](../supabase/migrations/20260831230000_trace_engine.sql),
   which also marks the old pre-TRACE scoring columns
   (`review_streak`, `quiz_streak`, `last_fail_at`, `last_fail_source`,
   `review_fail_count`, `quiz_fail_count`) deprecated without dropping them
   yet, as a safety margin during the rewrite. Once TRACE was verified
   working end-to-end, those columns were dropped for good in
   [`supabase/migrations/20260901120000_drop_deprecated_scoring_columns.sql`](../supabase/migrations/20260901120000_drop_deprecated_scoring_columns.sql) —
   `review_state` today only has the fields `TraceState` needs.
   `review_events`, added in
   [`supabase/migrations/20260901140000_review_events_log.sql`](../supabase/migrations/20260901140000_review_events_log.sql),
   is the append-only companion: one row per event (all six — read, reveal,
   review_pass/fail, quiz_pass/fail), written by the same
   `record_review_event`/`my_record_review_event` call, in the same
   transaction as the `review_state` upsert. It exists for questions
   `review_state`'s live-only design can't answer — calibration
   (retrievability just before an event, versus its outcome), FSRS weight
   fitting (the real 1-4 grade, not just pass/fail), per-term lapse rate,
   and real re-read cadence — not for ranking or mastery, which never read
   from it. It is never trimmed; the plan for when it grows too large is in
   the Growth and retention section of [admin.md](./admin.md).

If you're trying to understand a bug or add a feature: math questions
("why did this term's score change like that") belong in `lib/trace/`,
which you can read and test in complete isolation from the app. Questions
about which terms show up where belong in `lib/trace-queue/`. Questions
about when something gets written belong in `lib/terms/review-outcome.ts`.

## Where this differs from the original design

[trace-formula.md](./trace-formula.md) is the design document
written before implementation. A few things changed on the way to shipping
it — this list exists so the two documents don't quietly contradict each
other:

- **Never-tested terms rank at a fixed line, not excluded and not first.** The
  original design's wording ("a term with no state simply has nothing to rank
  by") reads as exclusion. In practice that would mean Review and Quiz could
  never surface a term for its first grade or answer, so the implementation
  ranks them as if they were 0.7 retrievable instead. They used to go ahead
  of every tested term, but that starved reviews after a large import; now a
  learned term that has decayed below the line goes first.
  See [How each tier decides what to show you](#how-each-tier-decides-what-to-show-you).
- **Recall is FSRS-5 with four changes.** Diminishing returns, Again,
  Hard and Easy are retuned so Again and Hard pull a term back and Good and
  Easy don't send it away for years; see [Recall, from Review](#recall-from-review).
  Recognition is not FSRS and keeps its own hyperbolic curve.
- **A miss never stamps a high-water mark.** The design didn't say what
  happens when the post-answer score crosses a threshold on a failed
  attempt. Since retrievability is 1 right after any answer, a miss could
  stamp `ever_mastered_at`, so only a success (not an Again, not a missed
  Quiz question) can.
- **No hysteresis on the known/unknown label.** The original design
  proposed a promote-at-0.8/demote-at-0.6 band specifically to stop a term
  from flickering between labels near the boundary, which requires
  remembering the previous label. Since nothing about TRACE is meant to be
  stored beyond the raw trace state, the shipped version uses a plain
  two-threshold read of the current score instead, with no memory of what
  the label used to be.
- **"Terms learned" needed one real stored value.** Everything else in
  TRACE is computed live by design, but a high-water mark is impossible to
  recompute from a snapshot — see [Terms learned](#terms-learned-the-one-number-thats-actually-stored).
  This is the one intentional exception, stored as `ever_mastered_at` on
  `review_state`.
- **The old known/unknown pool toggle is gone entirely,** not repurposed.
  There's no manual "mark as known" action anywhere in the app anymore, on
  web or Telegram — the label described above is the only thing that plays
  that role now, and it can't be set by hand.

## Tunable parameters

Every constant TRACE uses is named and commented in
[`lib/trace/constants.ts`](../lib/trace/constants.ts) — treat that file as
the source of truth rather than this table, since the two can drift. As of
writing:

| Parameter                                                  | Value                 | Meaning                                                                                                                          |
| ---------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Familiarity growth rate / decay rate                       | 0.3 / 0.5             | How fast familiarity grows per read, and how quickly that growth diminishes with repetition                                      |
| Familiarity cap                                            | 0.35                  | Most familiarity alone can ever contribute to mastery                                                                            |
| Familiarity decay scale                                    | 10 days               | How fast familiarity fades if you stop reading a term                                                                            |
| Cold-start nudge (difficulty / stability)                  | 2 / 0.5               | How much familiarity shifts a term's very first recall grade                                                                     |
| Quiz slip allowance                                        | 0.95                  | Assumed chance of answering correctly when you do know the term                                                                  |
| Guess rate, multiple choice / true-false / typed           | 0.25 / 0.5 / 0.05     | Assumed chance of answering correctly by guessing                                                                                |
| Recall forgetting curve                                    | FSRS-5                | `(1 + 19/81·t/S)^-0.5`, so recall is exactly 90% after S days                                                                    |
| Recognition decay scale                                    | 9                     | Recognition only: `(1 + t/(9·S))⁻¹`                                                                                              |
| Changed FSRS-5 weights (w3 / w9 / w11 / w16)               | 8 / 0.65 / 0.69 / 1.6 | First-ever Easy stability, diminishing returns, how much a lapse keeps, Easy bonus                                               |
| Hard blend toward Again                                    | 0.65                  | Where Hard's stability sits between the Again and Good outcomes                                                                  |
| Mastery blend weights (familiarity / recall / recognition) | 0.2 / 0.5 / 0.3       | How much each trace counts toward overall mastery                                                                                |
| Confidence time constant                                   | 2 tests               | How quickly the confidence discount approaches full weight                                                                       |
| Known / unknown thresholds                                 | 0.75 / 0.6            | Mastery_adjusted bounds for the known/learning/unknown label                                                                     |
| Known label minimum test count                             | 3                     | Tests needed (Review + Quiz combined) before "known" can apply                                                                   |
| Session cooldown                                           | 0.98 retrievability   | Above this, a term drops out of that tier's list for the rest of the session                                                     |
| Untested-term queue position (Review / Quiz)               | 0.85 / 0.7            | Where a never-graded or never-answered term sorts; learned terms that have decayed below it go first                             |
| Read mastery-temper weight                                 | 0.2                   | How much the mastery-tempering nudge can push an already-tested term later in Read's queue, relative to its decay-aware exposure |

These are reasoned starting points, not values fit to real usage data — this
one in particular is meant to be tuned by feel once it's live, the same way the rest of the scoring engine's constants
get adjusted — see
`trace-formula.md`'s "Open items to validate" section for what's still
worth measuring once there's real pass/fail history to look at.
