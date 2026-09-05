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

This is a full implementation of [FSRS-5](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm),
the same memory model behind modern versions of Anki. Every flashcard grade
you give in Review — Again, Hard, Good, or Easy — updates a stability score
(how many days it'd take to have a coin-flip chance of forgetting) and a
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
the standard FSRS-5 formulas (success grows stability more when the term
was already fading than when it was still fresh; a lapse drops it sharply,
scaled by how difficult the term is).

### Recognition, from Quiz

Quiz answers are noisier than Review grades — a wrong answer might be a
genuine gap, or it might be a misclick on an otherwise-easy multiple-choice
question. So instead of a discrete grade, each Quiz answer updates a
**posterior probability that you actually know the term**, using a simple
Bayesian update: how much a correct or incorrect answer should move your
estimate depends on how easy it'd be to get right by guessing (25% for
4-option multiple choice, 50% for true/false). That posterior maps onto a
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
kept forever, even as the live score later fades. The second, a sibling
high-water mark (`ever_learning_at`), does the identical thing one
threshold lower — stamped the first time Mastery_adjusted crosses the
learning threshold (0.6) rather than the known one (0.75).

Both stamps are permanent by design, but as of 2026-09-05 only one place in
the app reads them that way: the mastery page's "Lifetime" summary
(`lib/jargon/mastery.ts`'s `lifetimeLearningCount`/`lifetimeMasteredCount`,
via `partitionMasteryBuckets`), which is deliberately the one number in the
app that can't decrease just because a term decayed. Every other surface —
the per-collection cards' bucket bar, the domain header's "X of Y learned",
the sidebar, the widget, and the "current strength" figure — reads the
live, currently-decaying `knownLabel` instead
(`lib/trace/pace.ts`'s `partitionLiveMasteryBuckets`, or
`lib/jargon/collections.ts`'s `knownCount`/`termsLearnedCount`), so a term
that decays back out of "known" is reflected there immediately, including
in the per-collection "time to next milestone" estimate's _remaining_
count. That estimate's _rate_ half still comes from the permanent stamps
(`computeCrossingPace` in `lib/trace/pace.ts`) — there's no coherent "live
rate" for a signal with no stable crossing time, since rate is inherently
about real past events, not a current snapshot. The columns themselves
(`ever_mastered_at`/`ever_learning_at`) and their write path are unchanged;
only which UI surfaces read them changed.

## How each tier decides what to show you

All three tiers rank the exact same pool of terms — every term across your
active collections — just by a different signal. There's no separate
"known pool" or "unknown pool" to graduate between anymore.

| Tier       | Ranked by                                                                    | Never-tested terms                                                       |
| ---------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Read**   | Lowest decay-aware exposure (Read+Review+Quiz combined), tempered by mastery | Always included — reading is how a term gets exposure in the first place |
| **Review** | Lowest recall retrievability first                                           | Ranked _first_, ahead of every graded term                               |
| **Quiz**   | Lowest recognition retrievability first                                      | Ranked _first_, ahead of every answered term                             |

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

The Review/Quiz "never-tested terms rank first" rule is worth dwelling on,
because it's easy to get backwards. A term with no recall trace yet isn't
"low risk because it hasn't decayed" — it's _unknown_ risk, and TRACE treats
not knowing as more urgent than knowing you're weak. This is also the only
way a term can ever get its first grade or first answer at all: if
untested terms were excluded instead of prioritized, Review and Quiz would
have nothing to show for a term until it had already been tested once,
which is circular. So being untested is treated as maximally in need of
attention, not exempt from it.

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
   `pickQuizTerms(ForUser)` in `lib/trace-queue/service.ts` — the `ForUser`
   variants are for Telegram and the widget, which act on a user's behalf
   without a browser session.
3. **`lib/jargon/review-outcome.ts`** — the only code in the app allowed to
   record an outcome. Loads a term's current state, asks `lib/trace` to
   compute what it becomes after a read, a review grade, or a quiz answer,
   and persists the result. Its functions — `recordRead`, `recordReveal`,
   `applyReviewGrade`, `applyQuizAnswer` — are the actual entry points
   every surface in the app calls into; nothing else is allowed to write to
   the underlying table directly.
4. **Server actions** — the UI-facing entry points, one set per tier:
   `getNextReadTermAction` / `recordReadRevealAction` in
   `app/(private)/jargon/read/actions.ts`, `startReviewAction` /
   `rateReviewTermAction` in `app/(private)/jargon/review/actions.ts`, and
   `generateQuizAction` / `recordQuizAnswerAction` in
   `app/(private)/jargon/quiz/actions.ts`. Telegram has its own equivalents
   in `lib/telegram/` that call the same `lib/jargon/review-outcome.ts`
   and `lib/trace-queue` functions underneath.
5. **The database** — two tables. `review_state` holds one row per (user,
   term), storing exactly the fields `TraceState` needs: read count and
   last-read time, recall stability/difficulty and last-review time,
   recognition posterior and last-quiz time, plus the two persisted
   high-water-mark timestamps for "terms learned" (`ever_mastered_at`) and
   its lower-threshold sibling (`ever_learning_at`, added in
   [`supabase/migrations/20260905120000_ever_learning_at.sql`](../supabase/migrations/20260905120000_ever_learning_at.sql),
   the mastery page's per-collection pace insight). Everything else — every
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
   from it.

If you're trying to understand a bug or add a feature: math questions
("why did this term's score change like that") belong in `lib/trace/`,
which you can read and test in complete isolation from the app. Questions
about which terms show up where belong in `lib/trace-queue/`. Questions
about when something gets written belong in `lib/jargon/review-outcome.ts`.

## Where this differs from the original design

[trace-formula.md](./trace-formula.md) is the design document
written before implementation. A few things changed on the way to shipping
it — this list exists so the two documents don't quietly contradict each
other:

- **Never-tested terms rank first, not excluded.** The original design's
  wording ("a term with no state simply has nothing to rank by") reads as
  exclusion. In practice that would mean Review and Quiz could never
  surface a term for its first grade or answer, so the actual
  implementation ranks untested terms ahead of every tested one instead.
  See [How each tier decides what to show you](#how-each-tier-decides-what-to-show-you).
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

| Parameter                                                  | Value               | Meaning                                                                                                                          |
| ---------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Familiarity growth rate / decay rate                       | 0.3 / 0.5           | How fast familiarity grows per read, and how quickly that growth diminishes with repetition                                      |
| Familiarity cap                                            | 0.35                | Most familiarity alone can ever contribute to mastery                                                                            |
| Familiarity decay scale                                    | 10 days             | How fast familiarity fades if you stop reading a term                                                                            |
| Cold-start nudge (difficulty / stability)                  | 2 / 0.5             | How much familiarity shifts a term's very first recall grade                                                                     |
| Quiz slip allowance                                        | 0.95                | Assumed chance of answering correctly when you do know the term                                                                  |
| Guess rate, multiple choice / true-false                   | 0.25 / 0.5          | Assumed chance of answering correctly by guessing                                                                                |
| Retrievability decay scale                                 | 9                   | Shared by recall and recognition — larger stability decays retrievability more slowly                                            |
| Mastery blend weights (familiarity / recall / recognition) | 0.2 / 0.5 / 0.3     | How much each trace counts toward overall mastery                                                                                |
| Confidence time constant                                   | 2 tests             | How quickly the confidence discount approaches full weight                                                                       |
| Known / unknown thresholds                                 | 0.75 / 0.6          | Mastery_adjusted bounds for the known/learning/unknown label                                                                     |
| Known label minimum test count                             | 3                   | Tests needed (Review + Quiz combined) before "known" can apply                                                                   |
| Session cooldown                                           | 0.98 retrievability | Above this, a term drops out of that tier's list for the rest of the session                                                     |
| Read mastery-temper weight                                 | 0.2                 | How much the mastery-tempering nudge can push an already-tested term later in Read's queue, relative to its decay-aware exposure |

These are reasoned starting points, not values fit to real usage data — this
one in particular is meant to be tuned by feel from the debug queue view
once it's live, the same way the rest of the scoring engine's constants
get adjusted — see
`trace-formula.md`'s "Open items to validate" section for what's still
worth measuring once there's real pass/fail history to look at.
