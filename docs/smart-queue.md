# Smart review queue

How Jargon Gym chooses the next term. Web review, Telegram `/read` and
scheduled delivery, and quizzes all pick through the same scoring pipeline.
The web collection page and the desktop widget don't pick from it — they
select terms their own way and only share the outcome-recording half; see
[Surfaces](#surfaces).

This is **not** Anki. There are no due dates, no intervals, and nothing nags
you to study. You open the app when you want; the queue ranks terms in your
active pool from history — what you've neglected or still can't use — not from
a fixed schedule or future review dates.

For the user-facing guide (surfaces, badges, presets), see
[How the smart queue works](/how-smart-queue-works) on the deployed app. For
what **known** and **unknown** mean, see
[How terms are built](/how-terms-work).

---

## Mental model

Every term in your active collections carries a small history, split into
three tiers of increasing weight:

- **Seen** — incidental exposure: the widget's "Next" CTA, a term appearing
  as a quiz question, or the known/unknown toggle on a jargon-page term card.
  None of these are a deliberate "go read this" action — the widget rotates
  terms in the background, a quiz question just puts a term in front of you,
  and the toggle is a self-report, not something you opened to read.
- **Read** — deliberate but untested exposure, one outcome value (`read`)
  tracked as two disjoint counters: `read_count` (the Read command/page, web +
  Telegram, or opening a term card on the jargon page) and
  `review_reveal_count` (a Review card's reveal-before-rating step, web +
  Telegram). Same tier, same weight in the formula — the split exists so
  scoring can tell "left mid-review" apart from ordinary rereading (see
  Abandoned review, below), not to rank one above the other.
- **Recalled** — an actual tested judgment (`learning` / `solid` / `verified`
  / `forgot`, from Review ratings, quiz answers, or the widget's "Mark known"
  button).

The picker scores each candidate from that history plus a few nudges —
never-read terms, struggling terms, terms seen or read many times but never
actually tested, brand-new additions — and a penalty if you just marked
something solid. **Recalled outcomes dominate ranking**: they're stored
separately from the last Seen/Read event, so opening a term on the jargon page can never
silently erase a `learning`/`forgot` signal or cancel a solid cooldown.
A term that fails Review or a quiz repeatedly in a row also ranks higher than
one that only failed once — see `fail_streak` below. Highest score wins.

Recall is also the only thing staleness reacts to. A term that's never been
recalled gets no time-based pull at all — only its light-exposure count
(never-recalled / browse-only, below) and the gentle seen-count sink apply.
Being "seen" isn't itself something worth re-surfacing for; only an actual
test going stale is.

**Known vs unknown is a separate gate.** You always pick from one pool or the
other: a row in `user_progress` means known; no row means unknown. Scoring
only ranks inside the pool you chose. Mark a term known or unknown anywhere —
review, a quiz, the collection list, Telegram, or the desktop widget — and it
moves between pools; review and quizzes always draw from one pool or the
other.

Once every term in a pool has been Read or Revealed at least once, the
never-read boost has nothing left to apply. From then on, ranking is mostly
staleness and struggle signals — the **soft cycle**, with no everyday reset
button. Pool stats (`allSeenOnce`) track the same thing — read/reveal
exposure, not raw `seen_count` — so they stay in sync with when the boost
actually stops applying.

```
  active collections + known/unknown filter
              |
              v
     fetch candidates (Postgres RPC)
              |
              v
   score each candidate (preset + PickContext)
              |
              v
      sort by score, take top N
              |
              v
        hydrate TermCards + pickMeta
              |
              v
   surface shows term → review-outcome writes state
```

This is the path for surfaces that pick from the queue: web review, Telegram
`/read` + scheduled delivery, and quizzes. The web collection page and the
desktop widget don't fetch candidates or score anything — see
[Surfaces](#surfaces) for what they do instead.

---

## Pipeline

Surfaces that pick from the queue — web review, Telegram `/read` + scheduled
delivery, and quizzes — go through the same path:

1. **Scope** — which collections (`lib/study/`) and which pool (`known` or
   `unknown`).
2. **Candidates** — Postgres returns one row per term with review history.
3. **Score and pick** — pure TypeScript in `lib/smart-queue/`; no DB calls
   during scoring.
4. **Hydrate** — term IDs become `TermCard`s for the UI.
5. **Record** — when the user interacts, `lib/jargon/review-outcome.ts`
   writes outcomes. Surfaces must not call outcome RPCs directly.

The web collection page and the desktop widget skip steps 1–4: they pick
terms their own way (sort order / local rotation) and only touch step 5,
`review-outcome.ts`, to record Seen/Read and known-flip outcomes.

Entry points:

| Layer                                                             | Role                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| [`lib/study/pool.ts`](../lib/study/pool.ts)                       | Thin wrapper most surfaces call                         |
| [`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts)     | `pickReviewTerms`, `pickReviewTermsForUser`, pool stats |
| [`lib/jargon/review-outcome.ts`](../lib/jargon/review-outcome.ts) | Sole writer of review outcomes                          |

Telegram Edge Functions are thin proxies into internal API routes — they do
not own the scoring math.

---

## What the queue prioritizes

These are the user-facing signals (badges on review cards, quiz questions, and
the queue preview). A term can show more than one at a time. **Forgot** ranks
above **still learning**.

| Signal           | User-facing label                  | Effect                                                                                                       |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Never read       | Never read                         | Rises to the top until every term in the pool has been Read or Revealed at least once                        |
| Still learning   | Still learning                     | Boost — marked "Didn't have it" in review, or wrong on a quiz                                                |
| Forgot           | Forgot                             | Larger boost — marked forgot or cleared as known                                                             |
| Repeat fail      | Repeatedly forgotten               | Extra boost on top of Still learning/Forgot, scales with consecutive fails (2+ in a row), caps after 5       |
| Never recalled   | Read 3+ times, never recalled      | Moderate boost — opened it deliberately (Read, or a Review reveal) 3+ times, never actually tested           |
| Browse only      | Browsed 3+ times, never read       | Smaller boost — every sighting was passive (widget rotation, a quiz appearance, or the known/unknown toggle) |
| Abandoned review | Left mid-review                    | Moderate boost — the last thing that happened was an unrated Review reveal                                   |
| New term         | Recently added                     | Moderate boost — created within the last few days                                                            |
| Staleness        | Not seen recently                  | Climbs when you skip a day; caps at about a week. Only applies once a term has been recalled at least once   |
| Solid cooldown   | Recently marked solid              | **Lowers** priority for ~3 days after marking known or answering correctly                                   |

That cooldown is the only scheduled behavior. Nothing else gets a future review
date.

Terms that trigger none of the above show **Recently reviewed** instead — a
label, not a ranking effect. It just means nothing stands out yet.

Implementation detail: scoring math, weights, and tie-breaking are below.

---

## Scoring

Each candidate gets a score from additive signals and penalties. Multiple
signals can fire on the same term; all applicable reasons are returned for UI
badges.

| Signal               | Condition                                                                                                        | Effect                                                                                                                                                                                                                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Solid cooldown**   | Last _recalled_ outcome is `solid` and within `SOLID_COOLDOWN_HOURS`                                             | Large penalty, reads `last_recalled_at` so a later Seen/Read write can't cancel it early. `verified` is intentionally excluded so known-pool refresh still works.                                                                                                                           |
| **Never read**       | `read_count === 0 && review_reveal_count === 0`                                                                  | Large boost. Disappears once a term has been Read or Revealed at least once — incidental Seen-tier sightings don't clear it.                                                                                                                                                                |
| **Learning**         | Last _recalled_ outcome is `learning`                                                                            | Boost — survives later Seen/Read writes                                                                                                                                                                                                                                                     |
| **Forgot**           | Last _recalled_ outcome is `forgot`                                                                              | Larger boost than learning — survives later Seen/Read writes                                                                                                                                                                                                                                |
| **Fail streak**      | `fail_streak >= 2`                                                                                               | Additional boost on top of Learning/Forgot, `min(fail_streak, FAIL_STREAK_CAP) × failStreakBoostPerRepeat`. `fail_streak` increments on every `learning`/`forgot` and resets to 0 on `solid`/`verified`, so it always tracks the _current_ run of consecutive fails, not lifetime failures. |
| **Never recalled**   | `recalled_count === 0`, `(read_count + review_reveal_count) >= NEVER_RECALLED_MIN_SEEN`                          | Moderate boost — opened deliberately (Read, or a Review reveal) at least 3 times, still never tested. Incidental Seen-tier sightings don't count toward this threshold.                                                                                                                     |
| **Browse only**      | `recalled_count === 0`, `read_count === 0 && review_reveal_count === 0`, `seen_count >= NEVER_RECALLED_MIN_SEEN` | Smaller boost — every sighting was passive (widget rotation, a quiz appearance, or the known/unknown toggle), never once opened deliberately. Weaker signal than **Never recalled** on purpose.                                                                                             |
| **Abandoned review** | `last_outcome === 'read'` and `last_review_reveal_at` exactly equals `last_seen_at`                              | Moderate boost — the most recent event of any kind was a Review reveal that's never been rated or superseded by a later read, distinct from generic never-recalled rereading                                                                                                                |
| **New term**         | Created within the last 72 hours                                                                                 | Moderate boost                                                                                                                                                                                                                                                                              |
| **Seen count**       | Every prior sighting, any tier                                                                                   | Gentle sink (`seen_count × penalty`)                                                                                                                                                                                                                                                        |
| **Staleness**        | Time since `last_recalled_at`, only when `recalled_count > 0`                                                    | Rises linearly, capped at 7 days. Never-recalled terms get **no** time-based pull at all — only Never recalled/Browse only and the seen-count sink account for their light exposure.                                                                                                        |

Same-score candidates are shuffled, not tie-broken by `term_id` — so which
term wins a tie varies pick to pick instead of always favoring the same ID.

Implementation: [`lib/smart-queue/score.ts`](../lib/smart-queue/score.ts) →
[`lib/smart-queue/pick.ts`](../lib/smart-queue/pick.ts).

### Tunable constants

Defined in [`lib/smart-queue/presets.ts`](../lib/smart-queue/presets.ts). No
settings UI for these:

| Constant                  | Default | Purpose                                                                         |
| ------------------------- | ------- | ------------------------------------------------------------------------------- |
| `SOLID_COOLDOWN_HOURS`    | 72      | How long recently solid terms stay deprioritized                                |
| `NEVER_RECALLED_MIN_SEEN` | 3       | Minimum Seen+Read sightings before the never-recalled/browse-only boost applies |
| `FAIL_STREAK_CAP`         | 5       | Maximum consecutive fails counted toward the fail-streak boost                  |

Staleness and "stale" reason labels use a 24-hour threshold. New-term boost
uses a 72-hour creation window.

### Presets

**Settings → Review.** One preset applies to every surface: web review,
Telegram `/read`, quizzes, and scheduled delivery.

| Preset (UI label) | ID (`review_preset`) | Character                                          |
| ----------------- | -------------------- | -------------------------------------------------- |
| Balanced          | `balanced`           | Default mix of new, struggling, and stale terms    |
| Learn new first   | `learn_new`          | Prioritize never-read terms and recently added content |
| Drill weak spots  | `drill_weak`         | Focus on terms you're struggling with or forgot    |

Weight values (same file):

| Weight                     | balanced | learn_new | drill_weak |
| -------------------------- | -------- | --------- | ---------- |
| `unseenBoost`              | 100      | 150       | 80         |
| `learningBoost`            | 50       | 40        | 100        |
| `forgotBoost`              | 80       | 70        | 120        |
| `newTermBoost`             | 30       | 60        | 20         |
| `neverRecalledBoost`       | 30       | 25        | 40         |
| `browseOnlyBoost`          | 15       | 12        | 20         |
| `abandonedReviewBoost`     | 45       | 35        | 55         |
| `failStreakBoostPerRepeat` | 15       | 10        | 25         |
| `solidCooldownPenalty`     | 120      | 120       | 120        |
| `seenCountPenalty`         | 10       | 15        | 8          |
| `stalenessBoostPerHour`    | 0.5      | 0.3       | 0.7        |
| `stalenessCapHours`        | 168      | 168       | 168        |

### Pick context

Picks accept a `PickContext`: `"default"` or `"quiz"`. Quizzes multiply the
weak-signal weights (`learningBoost`, `forgotBoost`, `neverRecalledBoost`,
`browseOnlyBoost`, `abandonedReviewBoost`, `failStreakBoostPerRepeat`) by
**1.5×** without changing the user's saved preset. Review, Telegram `/read`,
and passive delivery use `"default"`.

### Pick reasons

Each pick includes a `reasons` list — which signals fired — for UI badges and
queue previews.

| Reason             | When it fires                                                                                 | UI label                           |
| ------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------- |
| `unseen`           | `read_count === 0 && review_reveal_count === 0`                                               | Never read                         |
| `new`              | Term created within ~72h                                                                      | Recently added                     |
| `learning`         | Last _recalled_ outcome is `learning`                                                         | Still learning                     |
| `forgot`           | Last _recalled_ outcome is `forgot`                                                           | Forgot                             |
| `repeat_fail`      | `fail_streak >= 2`                                                                            | Repeatedly forgotten               |
| `never_recalled`   | `recalled_count === 0`, `read_count + review_reveal_count >= 3`                               | Read 3+ times, never recalled      |
| `browse_only`      | `recalled_count === 0`, `read_count === 0` and `review_reveal_count === 0`, `seen_count >= 3` | Browsed 3+ times, never read       |
| `abandoned_review` | `last_outcome === 'read'` and `last_review_reveal_at === last_seen_at`                        | Left mid-review                    |
| `stale`            | `recalled_count > 0` and not recalled in 24h+                                                 | Not seen recently                  |
| `solid_cooldown`   | Last recalled solid within cooldown window                                                    | Recently marked solid              |
| `steady`           | No other signal fired                                                                         | Recently reviewed                  |

`steady` is a fallback, not a scoring signal — it carries no weight. It fires
in two cases: (1) the term has never been recalled and hasn't cleared either
`never_recalled` (deliberate `read_count + review_reveal_count >=
NEVER_RECALLED_MIN_SEEN`) or `browse_only` (zero deliberate exposure but
`seen_count >= NEVER_RECALLED_MIN_SEEN`) — including a term with some
deliberate exposure that hasn't reached 3 yet, which qualifies for neither —
and staleness never applies pre-recall, so there's nothing left to flag; or
(2) it has been recalled, that recall is
recent enough to dodge `stale`, and the outcome doesn't carry its own boost
(`verified`, or `solid` outside its cooldown window). `solid` can't land
here inside the cooldown window — `solid_cooldown` reads the same
`last_recalled_at` that staleness uses, and `STALE_REASON_THRESHOLD_HOURS`
(24) is well inside `SOLID_COOLDOWN_HOURS` (72), so a `solid` outcome recent
enough to dodge `stale` always still trips the cooldown. Without `steady`
these candidates would return an empty `reasons` list and render no badge at
all in the queue preview.

Labels live in [`lib/smart-queue/reasons.ts`](../lib/smart-queue/reasons.ts).
Review and quiz setup show a collapsible queue preview; cards and questions
show one or two badges.

### Soft cycle

There is no "reset the deck" button for everyday use. When every term in a
pool has been Read or Revealed at least once, the never-read boost stops
applying and ranking shifts to staleness and struggle. Pool stats expose
this as `allSeenOnce` (`lib/smart-queue/stats.ts`), computed from the same
`read_count`/`review_reveal_count` check as the boost, so it can't diverge.
Resetting a collection's progress clears both `review_state` and
`user_progress` and starts the cycle over.

---

## Outcomes

| Outcome    | Tier     | Meaning                                                                        |
| ---------- | -------- | ------------------------------------------------------------------------------ |
| `unseen`   | —        | Default when no review row exists yet                                          |
| `seen`     | Seen     | Widget "Next", a quiz question's term, or the jargon-page known/unknown toggle |
| `read`     | Read     | Read command/page, a jargon-page card open, or a Review reveal                 |
| `learning` | Recalled | Didn't have it (unknown-pool review), or wrong on a quiz                       |
| `solid`    | Recalled | Had it (unknown-pool review), or the widget's "Mark known"                     |
| `verified` | Recalled | Still know it (known-pool refresh)                                             |
| `forgot`   | Recalled | Forgot it, or cleared known via the widget                                     |

`learning`/`solid`/`verified`/`forgot` are collectively "Recalled" — an actual
tested judgment, as opposed to the light `seen`/`read` exposure tiers.

### `last_seen_at` / `last_recalled_at` / `last_review_reveal_at` semantics

Every outcome write can choose whether to increment `seen_count`:

- **`incrementSeen = true`** — bump `seen_count` and set `last_seen_at`
- **`incrementSeen = false`** — do not bump the count, but still set
  `last_seen_at`

So `last_seen_at` tracks the last queue event of _any_ tier, including solid /
forgot / verified writes that do not add a sighting.

`last_recalled_at`/`last_recalled_outcome` only move on a Recalled-tier write
(`learning`/`solid`/`verified`/`forgot`) and are untouched by later `seen`/
`read` writes — that's the whole point: a `learning` outcome from three weeks
ago stays the scoring signal even if the term has been opened on the jargon
page since. Cooldown, Recalled-tier outcome boosts, and staleness all read
from `last_recalled_at`/`last_recalled_outcome` exclusively — a term with
`recalled_count === 0` gets no staleness contribution at all, no matter how
recent or old `last_seen_at` is; `never_recalled`/`browse_only` and the
seen-count sink are the only things accounting for its light exposure.

`last_review_reveal_at` follows the same pattern for the review-reveal
sub-flavor of Read: it only moves on a `read` write where the caller flagged
`p_is_review_reveal`, and is otherwise untouched. `abandoned_review` compares
it against `last_seen_at` for exact equality rather than storing a separate
origin tag — if they match, the most recent event of _any_ kind was that
reveal, meaning nothing (a later plain read, or a rating) has happened since.

---

## Surfaces

Web review, Telegram, and quizzes share one ranking — all picks return
`{ cards, pickMeta }` from `fetchStudyTermPool` or `pickReviewTerms*`, and
differ only in outcome timing, not in the scoring formula. The web
collection page and desktop widget pick terms their own way (below) and
only share the outcome-recording half of the pipeline.

### Web review

- Focused study session: pick a known or unknown pool, work through a ranked
  batch, mark terms as you go (`default` context).
- Setup shows pool stats and a queue preview; each card shows why it was
  picked.
- First reveal → `read`, `review_reveal_count` +1 (increment). Rating writes
  the Recalled outcome without a second increment when `alreadyCountedSeen`
  is set. If a reveal is never rated (session abandoned), that untouched
  `last_review_reveal_at` is what the `abandoned_review` reason detects later.
- Rating always flips known state (Had it / Didn't have it in the unknown
  pool, Still know it / Forgot it in the known pool); quiz prefs do not
  apply here.

### Web collection

- No smart-queue pick here. Terms are sorted the way you choose in the
  toolbar — default / A–Z / unknown-first (`SortMode` in
  `lib/jargon/filter-terms.ts`) — not by score. Opening a term card → `read`,
  `read_count` +1 (increment), once per visit — you deliberately opened that
  term to look at it, even though browsing itself isn't a study action.
  Good for reference, not a substitute for review.
- The known/unknown toggle on a term card → `seen` (increment) either
  direction, plus the `user_progress` flip. It's a self-report, not a tested
  recall — it doesn't touch `recalled_count`, `last_recalled_outcome`, or
  `fail_streak`.

### Telegram bot

- Get terms on a schedule, or pull one on demand with `/read`. Same ranking as
  web review; one unknown term at a time (`default` context).
- On send → `read`, `read_count` +1 (increment). Delivering the next term
  does not write an extra outcome for the previous one.
- Mark known or still learning from inline buttons. Mark known → known flip +
  `solid` **without** incrementing seen count (`last_seen_at` still updates).

### Quizzes (web + Telegram)

- Same preset and pool rules as review, with one extra tilt: weak-signal weights
  (`learning`, `forgot`, `never_recalled`, `browse_only`, `abandoned_review`)
  are multiplied by **1.5×** via `PickContext: "quiz"` without changing the
  saved preset.
- Web setup shows the queue preview; questions show badges.
- A question's term appearing on screen → `seen` (increment) — the term just
  showed up, it hasn't been tested yet. Answering it then records the
  Recalled outcome **without** a second increment, since the appearance
  already counted the sighting.
- Known flips follow Settings → Quiz prefs (`markUnknownOnFail`,
  `markKnownOnPass`).

### Desktop widget

- No smart-queue pick here either. `/api/widget/state` hands back the raw
  unknown-term list; `read-state.sh` on the desktop side chooses which one to
  show via a deterministic hash of the current time bucket plus a local
  rotation counter (`widget/jargon-gym.widget/read-state.sh`). No score, no
  `seen_count`, no staleness — the smart-queue picker is never called.
- Terms rotate on screen in the background. Passive rotation does **not** count
  as a sighting.
- **Next** → `seen` (increment), for the term you are leaving — the widget put
  it in front of you, it doesn't know whether you actually read it.
- Click to open the term in the web app → `read`, `read_count` +1, on the
  collection page for that visit (see Web collection, above).
- Mark known → known flip + `solid` (increment) — Recalled tier, unlike the
  jargon-page toggle above, which records Seen instead.

### `/stat`

- Per-collection known % plus unknown-pool queue stats (unseen / seen /
  stale).

---

## Debug page

`/jargon/debug` lists every candidate in the chosen pool — known or unknown,
one collection or all active ones, any preset — with its live score, `reasons`
badges, and the raw `review_state` fields behind them (seen/read/review-reveal/
recalled counts, last outcome, last recalled outcome, fail streak). No term content,
just the scoring internals, sorted exactly like a real pick would be. It's a
debugging view, not a study surface: it doesn't write outcomes and the preset
switcher never touches `user_settings`. Built on
[`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts)'s
`listScoredCandidates`, which is `pickTerms` with `limit` set to every
candidate instead of a top-N slice.

---

## Data model

Postgres tables:

| Table                         | Role                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `review_state`                | `seen_count`, `last_seen_at`, `last_outcome` (any tier); `read_count`, `review_reveal_count`, `recalled_count` (disjoint subset counters); `last_recalled_outcome`, `last_recalled_at` (Recalled tier only); `last_review_reveal_at` (Review-reveal tier only); `fail_streak` (consecutive learning/forgot, resets on solid/verified) — all per user + term |
| `user_progress`               | Row present → known; absent → unknown                                                                                                                                                                                                                                                                                                                       |
| `user_settings.review_preset` | Which weight preset the user chose                                                                                                                                                                                                                                                                                                                          |

Candidate RPCs (see
[`lib/smart-queue/repository.ts`](../lib/smart-queue/repository.ts)):

- `my_get_review_candidates` — session-scoped (RLS)
- `get_review_candidates` — service role, explicit `userId`

Legacy random `pick_multiple_*` RPCs are removed.

---

## Code map

| Concern                              | Location                                                                                                                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Study pools / collection scope       | [`lib/study/`](../lib/study/)                                                                                                                                                                                               |
| Types, scoring, pick, stats, presets | [`lib/smart-queue/`](../lib/smart-queue/)                                                                                                                                                                                   |
| DB RPCs for candidates / outcomes    | [`lib/smart-queue/repository.ts`](../lib/smart-queue/repository.ts)                                                                                                                                                         |
| Term ID → TermCard hydration         | [`lib/smart-queue/hydrate.ts`](../lib/smart-queue/hydrate.ts)                                                                                                                                                               |
| Pick + hydrate composition           | [`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts)                                                                                                                                                               |
| Outcome writes (only entry point)    | [`lib/jargon/review-outcome.ts`](../lib/jargon/review-outcome.ts) — `applyTermSeen`/`applyTermRead`/`applyReviewReveal` (light tiers), `applyReviewRating`/`applyQuizAnswer`/`applyKnownToggle`/`applyMarkKnown` (Recalled) |
| Known / unknown flips                | [`lib/jargon/known-state.ts`](../lib/jargon/known-state.ts)                                                                                                                                                                 |
| Telegram routing                     | [`lib/telegram/flows.ts`](../lib/telegram/flows.ts)                                                                                                                                                                         |

When changing behavior, ask: is this **scoring** (`lib/smart-queue`), **pool
selection** (`lib/study`), or **when a surface calls pick /
review-outcome**?

```
                     review_state + preset + PickContext
                                  |
                                  v
                 lib/study  ->  lib/smart-queue  ->  review-outcome
                  (pick)          (score)             (record)
                    ^                                    ^
                    |                                    |
       Telegram /read + delivery,                Widget, web collection,
       web review, quizzes                      list checkbox
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
- Not random — every pick comes from your history in that pool

## Next steps

- User-facing guides: [How the smart queue works](/how-smart-queue-works),
  [How terms are built](/how-terms-work)
- Telegram integration: [Telegram bot setup](supabase/telegram-setup.md)
- Project overview and local setup: [README](../README.md)
