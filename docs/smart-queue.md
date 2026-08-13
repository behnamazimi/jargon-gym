# Smart review queue

How Jargon Gym chooses the next term. Read (web + Telegram `/read` +
scheduled delivery), Review (web + Telegram flashcards), and Quiz (web +
Telegram) each pick through the same scoring formula, but against their own
independent history — see [Three independent histories](#three-independent-histories).
The web collection page and the desktop widget don't pick from any queue —
they select terms their own way and only share the outcome-recording half;
see [Surfaces](#surfaces).

This is **not** Anki. There are no due dates, no intervals, and nothing nags
you to study. You open the app when you want; the queue ranks terms in your
active pool from history — what you've neglected or still can't use — not
from a fixed schedule or future review dates.

For the user-facing guide (surfaces, badges), see
[How the smart queue works](/how-smart-queue-works) on the deployed app. For
what **known** and **unknown** mean, see
[How terms are built](/how-terms-work).

---

## Mental model

Every term in your active collections carries state in two shapes:

- **Read** — deliberate but untested exposure: the Read page/command
  (web + Telegram `/read`, scheduled delivery), or opening a term card on
  the jargon page. `read_count` + `last_read_at`. No pass/fail concept —
  it's just "have you looked at this."
- **Tested** — an actual judgment, tracked **independently per activity**:
  - Review: `review_recall_count`, `last_review_recall_at`, `review_streak`, `review_fail_count`
  - Quiz: `quiz_test_count`, `last_quiz_tested_at`, `quiz_streak`, `quiz_fail_count`

`*_fail_count` is a lifetime counter, separate from the current streak — it
never resets on a pass, so it survives the moment a streak turns positive
again. It backs the `fragile` signal (see [Scoring](#scoring)) and started
accumulating only from the migration that added it — no historical
reconstruction.

`*_streak` is signed: positive = consecutive passes, negative = consecutive
fails, `0` = never tested in that activity. It replaces what used to be a
4-value outcome enum (`learning`/`solid`/`verified`/`forgot`) plus a separate
fail-streak counter — the sign tells you pass/fail, the magnitude tells you
how much, and known/unknown pool membership (`user_progress`) is tracked
separately so the streak doesn't need to encode it.

**Why Review and Quiz don't share one history.** A quiz question is
recognition — pick from a few options, true/false has a 50% guess floor. A
review card is self-graded recall with no distractors. Passing a quiz is
weaker evidence of actually knowing a term than passing a review card, so
treating them as the same signal let a lucky quiz guess trigger the
mastered-cooldown penalty and quiet a term that had never actually been
recalled unprompted. Splitting them means each activity's ranking reflects
only its own kind of evidence.

**Fails still cross between Review and Quiz; Read sits a miss out until
tomorrow.** A miss can't happen by lucky guessing — passing can — so a fail
in Review nudges Quiz and a fail in Quiz nudges Review. Read does **not**
get a fail boost: a same-day miss (`last_fail_at` still today in
`QUEUE_TIMEZONE`) applies a large sit-out penalty instead, so you don't
re-open the definition right after missing it. Symmetrically, a same-day
Read sits the term out of Review and Quiz until tomorrow — you just saw the
definition. Passing never nudges anything outside its own activity. Fail
flags live on `review_state` as `last_fail_at` and `last_fail_source`
(`'review'` | `'quiz'`), cleared the moment the term is next Read or
passes any test (which also lifts the fail→Read sit-out).

There is no "Seen" tier anymore. Widget rotation, a quiz question appearing
before it's answered, and the jargon-page known/unknown toggle don't write
to `review_state` at all — they're either pure local UI state or a pool flip
with no scoring implication. Only Read and Tested events feed the queue.

**Known vs unknown is a separate gate.** You always pick from one pool or
the other: a row in `user_progress` means known; no row means unknown.
Scoring only ranks inside the pool you chose. Mark a term known or unknown
anywhere — review, a quiz, the collection list, Telegram, or the desktop
widget — and it moves between pools.

```
  active collections + known/unknown filter
              |
              v
     fetch candidates (Postgres RPC)
              |
              v
   score each candidate (weights + PickContext)
              |
              v
      sort by score (ties shuffled)
              |
              v
   mix lanes: never-engaged <-> already-touched, take top N
              |
              v
        hydrate TermCards + pickMeta
              |
              v
   surface shows term → review-outcome writes state
```

This is the path for surfaces that pick from a queue: web Read/Review, the
Telegram equivalents, and quizzes. The web collection page and the desktop
widget don't fetch candidates or score anything — see
[Surfaces](#surfaces) for what they do instead.

---

## Three independent histories

`PickContext` is `"read" | "review" | "quiz"` — which activity's fields a
pick scores against:

| Context  | Own count             | Own streak                      | Own last-activity timestamp |
| -------- | --------------------- | ------------------------------- | --------------------------- |
| `read`   | `read_count`          | _(none — no pass/fail concept)_ | `last_read_at`              |
| `review` | `review_recall_count` | `review_streak`                 | `last_review_recall_at`     |
| `quiz`   | `quiz_test_count`     | `quiz_streak`                   | `last_quiz_tested_at`       |

The same scoring formula runs for all three; only which fields it reads
change. Staleness, mastered-cooldown, and struggling all read the context's
own fields — a Quiz streak never affects a Review pick's mastered-cooldown,
and vice versa.

---

## Pipeline

1. **Scope** — which collections (`lib/study/`), which pool (`known` or
   `unknown`), and which `PickContext` (`read`/`review`/`quiz`).
2. **Candidates** — Postgres returns one row per term with the full
   `review_state` history (all three activities' fields at once).
3. **Score and pick** — pure TypeScript in `lib/smart-queue/`; no DB calls
   during scoring. The formula reads only the fields relevant to the given
   context.
4. **Hydrate** — term IDs become `TermCard`s for the UI.
5. **Record** — when the user interacts, `lib/jargon/review-outcome.ts`
   writes events. Surfaces must not call the event RPC directly.

The web collection page and the desktop widget skip steps 1–4: they pick
terms their own way (sort order / local rotation) and only touch step 5 to
record Read/Test outcomes and known-flips.

Entry points:

| Layer                                                             | Role                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| [`lib/study/pool.ts`](../lib/study/pool.ts)                       | Thin wrapper most surfaces call                         |
| [`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts)     | `pickReviewTerms`, `pickReviewTermsForUser`, pool stats |
| [`lib/jargon/review-outcome.ts`](../lib/jargon/review-outcome.ts) | Sole writer of review events                            |

Telegram Edge Functions are thin proxies into internal API routes — they do
not own the scoring math.

---

## Scoring

Each candidate gets a score from additive signals and penalties, scoped to
the pick's `PickContext`. Multiple signals can fire on the same term; all
applicable reasons are returned for UI badges.

| Signal                           | Condition                                                                                               | Effect                                                                                                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Mastered cooldown**            | This context's own streak > 0 and its last-activity timestamp is within `masteredCooldownHours(streak)` | Large penalty. Independent per context — a Quiz pass never cools down Review. Window scales with streak — see [Streak-scaled cooldown](#streak-scaled-cooldown).                                                                                             |
| **Same-day Read sit-out**        | `review`/`quiz` only: `last_read_at` is today in `QUEUE_TIMEZONE`                                       | Large penalty (`sameDayCooldownPenalty`). You just saw the definition — try again tomorrow. Dominates struggling/unseen for that day.                                                                                                                        |
| **Same-day fail sit-out**        | `read` only: `last_fail_at` is today in `QUEUE_TIMEZONE`                                                | Large penalty (`sameDayCooldownPenalty`). Review and Quiz misses share this rule. Cleared when `last_fail_*` clears.                                                                                                                                         |
| **Never engaged**                | This context's own count is 0                                                                           | Large boost. `read` context: `read_count === 0`. `review`/`quiz`: their own test count is 0.                                                                                                                                                                 |
| **Struggling**                   | This context's own streak < 0                                                                           | Boost scaled by `min(\|streak\|, FAIL_STREAK_CAP) × strugglingBoostPerStreak`. Replaces the old separate learning/forgot/repeat_fail signals with one magnitude-scaled formula.                                                                              |
| **Engaged but untested**         | `read_count >= ENGAGED_MIN_COUNT` and this context's own test count is 0                                | Moderate boost. Only applies in `review`/`quiz` contexts — you've read it several times but never actually been tested in this activity.                                                                                                                     |
| **Abandoned review**             | `pending_reveal === true`                                                                               | Moderate boost. `review` context only — the leading edge of an unrated reveal.                                                                                                                                                                               |
| **Cross-activity fail**          | `last_fail_at` is set and `last_fail_source` is the _other_ test activity                               | `review`/`quiz` only. Boosts when the other activity most recently failed — a term's own activity already reflects its own fail via struggling. Scaled by `min(\|source streak\|, FAIL_STREAK_CAP)`. Read uses the same-day fail sit-out instead of a boost. |
| **Fragile (lifetime fail rate)** | `review`/`quiz` only: this context's own attempts `>= FAIL_RATE_MIN_ATTEMPTS`                           | Boost scaled by lifetime fail rate × `fragileBoostMax`. Independent of the _current_ streak sign — see [Lifetime fail rate](#lifetime-fail-rate-fragile).                                                                                                    |
| **Staleness**                    | Time since this context's own last-activity timestamp, only when its own count > 0                      | Decay-shaped, capped at 7 days — see [Decay-shaped staleness](#decay-shaped-staleness). Never-tested terms get no time-based pull — only the "never engaged" / "engaged but untested" signals account for those.                                             |

Same-score candidates are shuffled freshly each pick (Fisher–Yates within
each equal-score run after score-desc sort) so ties mix across collections
instead of keeping Postgres fetch order. Debug and live picks can disagree
on tie order.

Scoring ranks candidates; it does not decide pick order on its own — see
[Lane mix](#lane-mix) for the step that runs after it. `created_at` stays on
the candidate but scoring no longer reads it — there's no new-term boost.

Implementation: [`lib/smart-queue/score.ts`](../lib/smart-queue/score.ts) →
[`lib/smart-queue/pick.ts`](../lib/smart-queue/pick.ts).

### Streak-scaled cooldown

The mastered-cooldown window is no longer a flat 72 hours — it scales with
how many passes in a row a context has:

```ts
function masteredCooldownHours(streak: number): number {
  if (streak <= 0) return 0;
  const hours = BASE_COOLDOWN_HOURS * Math.pow(COOLDOWN_GROWTH_FACTOR, streak - 1);
  return Math.min(hours, COOLDOWN_CAP_HOURS);
}
```

`+1` → `BASE_COOLDOWN_HOURS` (72h, same as before); `+5` → ~277h (~11.5
days); `+6` and beyond → capped at `COOLDOWN_CAP_HOURS` (336h / 2 weeks).
Penalty magnitude (`masteredCooldownPenalty`) is unchanged — only the
window grows. A fail-then-repass resets the streak to `+1`, so the window
resets back to the short end too — that's intentional, not a bug: a term
that was just missed hasn't earned a long cooldown yet. Scoped per
`PickContext` like everything else — a long Quiz streak never lengthens
Review's cooldown.

### Decay-shaped staleness

Staleness no longer accrues linearly. It follows an exponential-decay
curve, front-loading the boost near the context's own decay constant (τ)
and flattening out as it approaches the cap:

```ts
function stalenessBoost(hoursSinceLastActivity, decayConstantHours, capHours, maxBoost) {
  const capped = Math.min(hoursSinceLastActivity, capHours);
  const normalized = 1 - Math.exp(-capped / decayConstantHours);
  return normalized * maxBoost;
}
```

The ceiling (`stalenessMaxBoost`, 84) matches the old linear formula's max
(`0.5 × 168h`) — only the shape changed, not the cap. τ is per-context
(`STALENESS_DECAY_HOURS` in `weights.ts`): Quiz stales fastest (24h), Review
next (36h), Read slowest (48h) — so a quiz you haven't touched in a day
climbs the queue faster than a definition you haven't re-read in a day.
Staleness stays **additive** with mastered cooldown, same as before: right
after a pass, the large negative cooldown penalty still dominates the
front-loaded staleness boost (e.g. 24h into a Review cooldown with τ=36,
staleness is only ~+41 against a −120 penalty — net still solidly negative).
There's no special-casing "zero staleness during cooldown" — the two
signals just add.

### Lifetime fail rate (`fragile`)

Streak captures the _current_ run, but resets to a clean positive value the
moment you pass — a term failed 6 times out of the last 10 looks identical
to a term that's never been missed, right after that one pass. `fragile`
tracks lifetime fails per activity (`review_fail_count` /
`quiz_fail_count` on `review_state`, incremented in `record_review_event`)
independent of the current streak sign:

```ts
function fragileBoost(totalTests, totalFails, fragileBoostMax) {
  if (totalTests < FAIL_RATE_MIN_ATTEMPTS) return 0;
  return (totalFails / totalTests) * fragileBoostMax;
}
```

Cold start: below `FAIL_RATE_MIN_ATTEMPTS` (4) own-context attempts, no
boost — insufficient history isn't evidence of difficulty. At a 100%
lifetime fail rate the boost caps at `fragileBoostMax` (25), which dents
but does not cancel a mastered-cooldown penalty (−120) at default weights.
`review`/`quiz` only — Read has no pass/fail concept, so `fragile` never
applies there. The counters are backfilled at `0` for pre-existing rows and
accumulate only going forward; there is no reconstruction of historical
fail counts from streak or anything else.

### Weights

Defined in [`lib/smart-queue/weights.ts`](../lib/smart-queue/weights.ts) as
a single fixed set — **no presets**. This is a single-user app; presets
existed to let a user pick a mode without touching code, which added a
whole tunable dimension (12 weights × 3 presets + a context multiplier) for
one person who can just edit the constants directly. There is no settings
UI for these:

| Constant                           | Default | Purpose                                                                            |
| ---------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `unseenBoost`                      | 100     | Never-engaged boost                                                                |
| `strugglingBoostPerStreak`         | 40      | Per point of `\|streak\|` when struggling, capped at `FAIL_STREAK_CAP`             |
| `masteredCooldownPenalty`          | 120     | Mastered-cooldown penalty                                                          |
| `sameDayCooldownPenalty`           | 120     | Same-day Read→Review/Quiz and fail→Read sit-outs                                   |
| `engagedButUntestedBoost`          | 30      | Read several times, never tested (this activity)                                   |
| `abandonedReviewBoost`             | 45      | Left mid-review                                                                    |
| `stalenessMaxBoost`                | 84      | Ceiling of the decay-shaped staleness curve (reached asymptotically at the cap)    |
| `stalenessCapHours`                | 168     | Staleness cap (7 days)                                                             |
| `crossFailOtherTestBoostPerRepeat` | 25      | Per repeat, test-context boost when the _other_ test activity most recently failed |
| `fragileBoostMax`                  | 25      | Boost at 100% lifetime fail rate; scales linearly down to 0                        |

| Constant                    | Default                              | Purpose                                                                                                        |
| --------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `BASE_COOLDOWN_HOURS`       | 72                                   | Mastered-cooldown window at streak `+1` (renamed from `SOLID_COOLDOWN_HOURS`)                                  |
| `COOLDOWN_GROWTH_FACTOR`    | 1.4                                  | Per-streak-point multiplier on the cooldown window                                                             |
| `COOLDOWN_CAP_HOURS`        | 336 (14 days)                        | Cooldown window never exceeds this, however high the streak                                                    |
| `STALENESS_DECAY_HOURS`     | `{ read: 48, review: 36, quiz: 24 }` | Per-context decay constant (τ) for the staleness curve — a map next to `WEIGHTS`, not fields on `ScoreWeights` |
| `FAIL_RATE_MIN_ATTEMPTS`    | 4                                    | Minimum own-context attempts before `fragile` applies                                                          |
| `QUEUE_TIMEZONE`            | `Europe/Amsterdam`                   | Calendar day for same-day sit-outs (edit in code if you move)                                                  |
| `ENGAGED_MIN_COUNT`         | 3                                    | Minimum reads before `engaged_untested` applies                                                                |
| `FAIL_STREAK_CAP`           | 5                                    | Maximum consecutive fails counted toward the struggling boost                                                  |
| `MIX_NEVER_ENGAGED_SLOTS`   | 1                                    | Never-engaged slots per mix cycle — see [Lane mix](#lane-mix)                                                  |
| `MIX_ALREADY_TOUCHED_SLOTS` | 1                                    | Already-touched slots per mix cycle — see [Lane mix](#lane-mix)                                                |

Staleness and "stale" reason labels use a 24-hour threshold.

### Pick reasons

Each pick includes a `reasons` list — which signals fired — for UI badges
and queue previews.

| Reason                 | When it fires                                                                                                    | UI label (`read` / `review` / `quiz`)                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `unseen`               | This context's own count is 0                                                                                    | Never read / Never reviewed / Never quizzed                      |
| `struggling`           | This context's own streak < 0                                                                                    | Struggling                                                       |
| `repeat_fail`          | Struggling and `\|streak\| >= 2`                                                                                 | Repeatedly missed                                                |
| `engaged_untested`     | `read_count >= ENGAGED_MIN_COUNT`, this context's own test count is 0 (`review`/`quiz` only)                     | Read 3+ times, not tested                                        |
| `abandoned_review`     | `pending_reveal === true` (`review` only)                                                                        | Left mid-review                                                  |
| `stale`                | This context's own count > 0 and not tested in 24h+                                                              | Not read recently / Not reviewed recently / Not quizzed recently |
| `mastered_cooldown`    | This context's own streak > 0, within cooldown window                                                            | Recently mastered                                                |
| `recent_read_cooldown` | `review`/`quiz`: `last_read_at` is today in `QUEUE_TIMEZONE`                                                     | Read today — try tomorrow                                        |
| `recent_fail_cooldown` | `read`: `last_fail_at` is today in `QUEUE_TIMEZONE`                                                              | Missed today — try tomorrow                                      |
| `cross_fail`           | `review`/`quiz`: `last_fail_at` set and `last_fail_source` is the other activity                                 | Missed elsewhere recently                                        |
| `fragile`              | `review`/`quiz`: own attempts `>= FAIL_RATE_MIN_ATTEMPTS` and lifetime fail rate > 0                             | Historically tricky                                              |
| `steady`               | No other signal fired (only reachable when this context's own count > 0 — `unseen` already covers the zero case) | Recently read / Recently reviewed / Recently quizzed             |

`unseen`, `stale`, and `steady` share one label per activity —
`formatPickReason(reason, context)` in
[`lib/smart-queue/reasons.ts`](../lib/smart-queue/reasons.ts) varies the
wording so a term read twice but never review-tested shows "Never
reviewed," not "Never read." `steady` is the only fallback reason — it's
not a scoring signal, carries no weight, and only fires once a term has
any activity in that context (unseen already claims the zero case
unconditionally).

Labels live in [`lib/smart-queue/reasons.ts`](../lib/smart-queue/reasons.ts).
Review and quiz setup show a collapsible queue preview; cards and questions
show one or two badges.

### Lane mix

Scoring ranks candidates within a lane; `pickTerms`
([`lib/smart-queue/pick.ts`](../lib/smart-queue/pick.ts)) then splits the
score-desc list into two lanes and zips them, so a fresh dump of terms
can't occupy every pick until the pool is exhausted:

- **Never-engaged** — this context's own count is 0.
- **Already-touched** — this context's own count is > 0 (struggling, stale,
  mastered, steady all live here; the existing score still orders _within_
  this lane).

The zip cycles `MIX_NEVER_ENGAGED_SLOTS` never-engaged picks then
`MIX_ALREADY_TOUCHED_SLOTS` already-touched picks (both default to 1 — a
straight alternation). Once one lane's eligible terms run out, the cycle
keeps contributing 0 from it each pass, so the other lane fills the rest of
the pick alone.

A term sits out of a mix slot — but still appears in debug, appended after
the eligible zip — when `mastered_cooldown`, `recent_read_cooldown`, or
`recent_fail_cooldown` fired, or (read context only) it was already read
today. A same-day Review/Quiz miss stays eligible: there's no mastered
cooldown to sit it out, and a struggling term should still be able to
surface.

Which lane starts a cycle isn't persisted — `limit=1` calls (Read, Telegram
`/read`, scheduled delivery) reconstruct it each time from today's
own-context engagements, starting with whichever lane is behind on its
slot ratio (tie starts never-engaged). See the doc comment on
`startingLane` in `pick.ts` for the exact reconstruction. Review/Quiz
batches (`limit` up to 30) get a true mix-ratio list from a single zip.

### Soft cycle

There is no "reset the deck" button for everyday use. When every term in a
pool has been engaged with at least once (Read, for the `read` context; or
tested once, for `review`/`quiz`), the never-engaged boost stops applying
and ranking shifts to staleness and struggle. Pool stats expose this as
`allSeenOnce` (`lib/smart-queue/stats.ts`, unchanged by lane mixing) — a
stat, not a claim that unseen terms strictly lead until then; the mix
already interleaves already-touched terms in throughout. Computed the same
way and scoped
to the same `PickContext`. Resetting a collection's progress clears both
`review_state` and `user_progress` and starts the cycle over.

### Strength tier (display-only)

A `weak` / `medium` / `strong` mastery badge, shown alongside pick-reason
badges and on collection term cards. It is purely cosmetic — computed from
the same `streak` / fail-rate / staleness inputs scoring already reads, but
**never fed back into the score**. `lib/smart-queue/strength.ts`:

```ts
function computeStrength(streak, failRate, hoursSinceLastActivity): Strength {
  if (streak <= 0 || failRate > STRENGTH_WEAK_FAIL_RATE) return "weak";
  if (
    streak >= STRENGTH_STRONG_MIN_STREAK &&
    failRate < STRENGTH_STRONG_MAX_FAIL_RATE &&
    hoursSinceLastActivity < stalenessCapHours
  ) {
    return "strong";
  }
  return "medium";
}
```

Thresholds: `STRENGTH_WEAK_FAIL_RATE` (0.4), `STRENGTH_STRONG_MIN_STREAK`
(5), `STRENGTH_STRONG_MAX_FAIL_RATE` (0.15). Below `FAIL_RATE_MIN_ATTEMPTS`
own-context attempts, callers pass `failRate = 0` — insufficient history
isn't "historically hard."

Surfaces (v1): collection term cards (from **Review** history —
`fetchReviewStrengthByTermId` in `lib/jargon/known-state.ts`), Review and
Quiz pick UI (from that activity's own history, computed alongside
`pickReasons` in `lib/review/mappers.ts` / `lib/quiz/mappers.ts` via
`strengthForCandidate`), and the debug page (both Review and Quiz side by
side). Read has no streak/fail-rate of its own, so it has no strength
badge. Telegram is out of scope for v1.

---

## Events

| Event         | Effect                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `read`        | `read_count += 1`, `last_read_at = now()`, clears `last_fail_at`/`last_fail_source`                                                            |
| `reveal`      | `pending_reveal = true`                                                                                                                        |
| `review_pass` | `review_recall_count += 1`, `last_review_recall_at = now()`, `review_streak` moves toward positive, `pending_reveal = false`, clears fail flag |
| `review_fail` | Same counters, `review_streak` moves toward negative, sets `last_fail_at`/`last_fail_source = 'review'`, `review_fail_count += 1`              |
| `quiz_pass`   | `quiz_test_count += 1`, `last_quiz_tested_at = now()`, `quiz_streak` moves toward positive, clears fail flag                                   |
| `quiz_fail`   | Same counters, `quiz_streak` moves toward negative, sets `last_fail_at`/`last_fail_source = 'quiz'`, `quiz_fail_count += 1`                    |

`review_fail_count` / `quiz_fail_count` are lifetime counters — they never
decrement and are not cleared by a pass. They back the `fragile` signal
(see [Lifetime fail rate](#lifetime-fail-rate-fragile)) and were backfilled
at `0` for rows that existed before that migration.

Streak update rule: a pass resets a negative streak to `+1` (or increments
a positive one); a fail resets a positive streak to `-1` (or decrements a
negative one) — so the sign always flips cleanly on the first opposite
result, rather than needing a separate "reset to 0" step.

---

## Surfaces

### Web Read

- The Read page and `/read` command pull one term at a time from the `read`
  context ranking (never-read, staleness of last read, cross-activity fail
  nudges). Opening it → `read` event.

### Web review

- Focused study session: pick a known or unknown pool, work through a
  ranked batch (`review` context), mark terms as you go.
- Setup shows pool stats and a queue preview; each card shows why it was
  picked.
- Reveal → `reveal` event (`pending_reveal = true`). Rating → `review_pass`
  or `review_fail`, which also clears `pending_reveal`. If a reveal is never
  rated (session abandoned), `pending_reveal` stays `true` — that's what the
  `abandoned_review` reason detects later.
- Rating always flips known state (Had it / Didn't have it in the unknown
  pool, Still know it / Forgot it in the known pool); quiz prefs do not
  apply here.

### Web collection

- No smart-queue pick here. Terms are sorted the way you choose in the
  toolbar — default / A–Z / unknown-first (`SortMode` in
  `lib/jargon/filter-terms.ts`) — not by score. Opening a term card →
  `read` event. Good for reference, not a substitute for review.
- The known/unknown toggle on a term card flips the pool only — no
  `review_state` write. It's a self-report while browsing, not a study
  action.

### Telegram bot

- `/read` and scheduled delivery: same `read` context ranking as the web
  Read page, one unknown term at a time. On send → `read` event.
- `/review`: same `review` context ranking as web review. Reveal / rate
  inline buttons write the same `reveal`/`review_pass`/`review_fail`
  events.
- `/quiz`: same `quiz` context ranking as web quiz.
- Mark known from delivery's inline button → known flip + `review_pass`
  (a self-graded Review pass — you're confirming you know it, which is a
  judgment, not passive exposure).

### Quizzes (web + Telegram)

- Own `quiz` context ranking, entirely independent of Review's.
- A question's term appearing on screen writes nothing now — the old
  Seen-tier write for "question shown" was dropped along with the Seen
  tier. Answering it → `quiz_pass`/`quiz_fail`.
- A quiz miss sits Read out until tomorrow (same rule as a Review miss) and
  nudges Review via cross-fail; it does not boost Read.
- Known flips follow Settings → Quiz prefs (`markUnknownOnFail`,
  `markKnownOnPass`).

### Desktop widget

- No smart-queue pick here either. `/api/widget/state` hands back the raw
  unknown-term list; `read-state.sh` on the desktop side chooses which one
  to show via a deterministic hash of the current time bucket plus a local
  rotation counter. No score, no queue involvement.
- Terms rotate on screen in the background. Passive rotation writes
  nothing — there's no Seen tier to record it into anymore.
- Click the term or **Read more** → opens `/jargon/read?termId=…` (records a
  `read` event there) and advances the widget to the next term.

### `/stat`

- Per-collection known % plus Read-context queue stats (never read / read /
  stale).

---

## Debug page

`/jargon/debug` lists every candidate in the chosen pool — known or
unknown, one collection or all active ones, any `PickContext`
(read/review/quiz) — with its live score, `reasons` badges, and the raw
`review_state` fields behind them. No term content, just the scoring
internals, sorted exactly like a real pick would be. It's a debugging view,
not a study surface: it doesn't write events. Built on
[`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts)'s
`listScoredCandidates`, which is `pickTerms` with `limit` set to every
candidate instead of a top-N slice.

---

## Data model

Postgres tables:

| Table           | Role                                                                                                                                                                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review_state`  | `read_count`, `last_read_at`; `review_recall_count`, `last_review_recall_at`, `review_streak`, `review_fail_count`; `quiz_test_count`, `last_quiz_tested_at`, `quiz_streak`, `quiz_fail_count`; `pending_reveal`; `last_fail_at`, `last_fail_source` — all per user + term |
| `user_progress` | Row present → known; absent → unknown                                                                                                                                                                                                                                      |

Candidate RPCs (see
[`lib/smart-queue/repository.ts`](../lib/smart-queue/repository.ts)):

- `my_get_review_candidates` — session-scoped (RLS)
- `get_review_candidates` — service role, explicit `userId`

Event RPC:

- `my_record_review_event` / `record_review_event` — the sole writer of
  `review_state`, taking a single `review_event` enum value
  (`read`/`reveal`/`review_pass`/`review_fail`/`quiz_pass`/`quiz_fail`).

---

## Code map

| Concern                              | Location                                                                                                                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Study pools / collection scope       | [`lib/study/`](../lib/study/)                                                                                                                                                                                                |
| Types, scoring, pick, stats, weights | [`lib/smart-queue/`](../lib/smart-queue/)                                                                                                                                                                                    |
| DB RPCs for candidates / events      | [`lib/smart-queue/repository.ts`](../lib/smart-queue/repository.ts)                                                                                                                                                          |
| Term ID → TermCard hydration         | [`lib/smart-queue/hydrate.ts`](../lib/smart-queue/hydrate.ts)                                                                                                                                                                |
| Pick + hydrate composition           | [`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts)                                                                                                                                                                |
| Event writes (only entry point)      | [`lib/jargon/review-outcome.ts`](../lib/jargon/review-outcome.ts) — `recordRead`/`recordReveal`/`recordTest`, plus `applyQuizAnswer`/`applyReviewRating`/`applyKnownToggle`/`setKnownStatus` composing those with pool flips |
| Known / unknown flips                | [`lib/jargon/known-state.ts`](../lib/jargon/known-state.ts)                                                                                                                                                                  |
| Telegram routing                     | [`lib/telegram/flows.ts`](../lib/telegram/flows.ts)                                                                                                                                                                          |

When changing behavior, ask: is this **scoring** (`lib/smart-queue`), **pool
selection** (`lib/study`), or **when a surface calls pick /
review-outcome**?

```
                     review_state + PickContext
                                  |
                                  v
                 lib/study  ->  lib/smart-queue  ->  review-outcome
                  (pick)          (score)             (record)
                    ^                                    ^
                    |                                    |
       Telegram /read + delivery,                Widget, web collection,
       web Read/Review, quizzes                  list checkbox
       (pick, then record)                      (record only — own selection)
                    |                                    |
                    +--------------- review-outcome ----+
```

---

## What this is not

This ranks what's in the active pool when you show up — on purpose, no
scheduled future reviews.

- Not Anki — no fixed schedule, intervals, or "cards due today"
- Not a notification system — study when you want
- Not random overall — ranking comes from history; equal scores are shuffled
  across collections each pick

## Next steps

- User-facing guides: [How the smart queue works](/how-smart-queue-works),
  [How terms are built](/how-terms-work)
- Telegram integration: [Telegram bot setup](supabase/telegram-setup.md)
- Project overview and local setup: [README](../README.md)
