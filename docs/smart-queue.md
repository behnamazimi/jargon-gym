# Smart review queue

How Jargon Gym chooses the next term. Web review, Telegram `/next` and
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

Every term in your active collections carries a small history: how often
you've seen it, when you last interacted with it, and what happened last time
(got it, still learning, forgot it, and so on). The picker scores each
candidate from that history plus a few nudges — unseen terms, struggling terms,
terms you've seen many times but never locked in, brand-new additions — and a
penalty if you just marked something solid. Highest score wins.

**Known vs unknown is a separate gate.** You always pick from one pool or the
other: a row in `user_progress` means known; no row means unknown. Scoring
only ranks inside the pool you chose. Mark a term known or unknown anywhere —
review, a quiz, the collection list, Telegram, or the desktop widget — and it
moves between pools; review and quizzes always draw from one pool or the
other.

Once every term in a pool has been seen at least once, the unseen boost has
nothing left to apply. From then on, ranking is mostly staleness and struggle
signals — the **soft cycle**, with no everyday reset button.

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
`/next` + scheduled delivery, and quizzes. The web collection page and the
desktop widget don't fetch candidates or score anything — see
[Surfaces](#surfaces) for what they do instead.

---

## Pipeline

Surfaces that pick from the queue — web review, Telegram `/next` + scheduled
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
`review-outcome.ts`, to record `shown` and known-flip outcomes.

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

| Signal         | User-facing label        | Effect                                                                     |
| -------------- | ------------------------ | -------------------------------------------------------------------------- |
| Never seen     | Never seen               | Rises to the top until every term in the pool has been seen at least once  |
| Still learning | Still learning           | Boost — marked still learning, or wrong on a quiz                          |
| Forgot         | Forgot                   | Larger boost — marked forgot or cleared as known                           |
| Shown stuck    | Seen 3+ times, not solid | Moderate boost — opened without marking known                              |
| New term       | Recently added           | Moderate boost — created within the last few days                          |
| Staleness      | Not seen recently        | Climbs when you skip a day; caps at about a week                           |
| Solid cooldown | Recently marked solid    | **Lowers** priority for ~3 days after marking known or answering correctly |

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

| Signal             | Condition                                                                | Effect                                                                                               |
| ------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| **Solid cooldown** | Last outcome is `solid` and within `SOLID_COOLDOWN_HOURS`                | Large penalty. `verified` is intentionally excluded so known-pool refresh still works.               |
| **Unseen**         | `seen_count === 0`                                                       | Large boost. Disappears once every term in the pool has been seen at least once.                     |
| **Learning**       | Last outcome is `learning`                                               | Boost                                                                                                |
| **Forgot**         | Last outcome is `forgot`                                                 | Larger boost than learning                                                                           |
| **Shown stuck**    | `seen_count >= SHOWN_WITHOUT_SOLID_MIN_SEEN` and last outcome is `shown` | Moderate boost — passive exposure is not mastery                                                     |
| **New term**       | Created within the last 72 hours                                         | Moderate boost                                                                                       |
| **Seen count**     | Every prior sighting                                                     | Gentle sink (`seen_count × penalty`)                                                                 |
| **Staleness**      | Time since `last_seen_at`                                                | Rises linearly, capped at 7 days. Terms seen but missing a timestamp are treated as maximally stale. |

Same-score candidates are shuffled, not tie-broken by `term_id` — so which
term wins a tie varies pick to pick instead of always favoring the same ID.

Implementation: [`lib/smart-queue/score.ts`](../lib/smart-queue/score.ts) →
[`lib/smart-queue/pick.ts`](../lib/smart-queue/pick.ts).

### Tunable constants

Defined in [`lib/smart-queue/presets.ts`](../lib/smart-queue/presets.ts). No
settings UI for these:

| Constant                       | Default | Purpose                                                |
| ------------------------------ | ------- | ------------------------------------------------------ |
| `SOLID_COOLDOWN_HOURS`         | 72      | How long recently solid terms stay deprioritized       |
| `SHOWN_WITHOUT_SOLID_MIN_SEEN` | 3       | Minimum sightings before the shown-stuck boost applies |

Staleness and "stale" reason labels use a 24-hour threshold. New-term boost
uses a 72-hour creation window.

### Presets

**Settings → Review.** One preset applies to every surface: web review,
Telegram `/next`, quizzes, and scheduled delivery.

| Preset (UI label) | ID (`review_preset`) | Character                                          |
| ----------------- | -------------------- | -------------------------------------------------- |
| Balanced          | `balanced`           | Default mix of new, struggling, and stale terms    |
| Learn new first   | `learn_new`          | Prioritize unseen terms and recently added content |
| Drill weak spots  | `drill_weak`         | Focus on terms you're struggling with or forgot    |

Weight values (same file):

| Weight                   | balanced | learn_new | drill_weak |
| ------------------------ | -------- | --------- | ---------- |
| `unseenBoost`            | 100      | 150       | 80         |
| `learningBoost`          | 50       | 40        | 100        |
| `forgotBoost`            | 80       | 70        | 120        |
| `newTermBoost`           | 30       | 60        | 20         |
| `shownWithoutSolidBoost` | 30       | 25        | 40         |
| `solidCooldownPenalty`   | 120      | 120       | 120        |
| `seenCountPenalty`       | 10       | 15        | 8          |
| `stalenessBoostPerHour`  | 0.5      | 0.3       | 0.7        |
| `stalenessCapHours`      | 168      | 168       | 168        |

### Pick context

Picks accept a `PickContext`: `"default"` or `"quiz"`. Quizzes multiply the
weak-signal weights (`learningBoost`, `forgotBoost`, `shownWithoutSolidBoost`)
by **1.5×** without changing the user's saved preset. Review, Telegram
`/next`, and passive delivery use `"default"`.

### Pick reasons

Each pick includes a `reasons` list — which signals fired — for UI badges and
queue previews.

| Reason           | When it fires                       | UI label                 |
| ---------------- | ----------------------------------- | ------------------------ |
| `unseen`         | Never counted as seen               | Never seen               |
| `new`            | Term created within ~72h            | Recently added           |
| `learning`       | Last outcome is `learning`          | Still learning           |
| `forgot`         | Last outcome is `forgot`            | Forgot                   |
| `shown_stuck`    | Seen 3+ times, still `shown`        | Seen 3+ times, not solid |
| `stale`          | Not touched in 24h+                 | Not seen recently        |
| `solid_cooldown` | Marked solid within cooldown window | Recently marked solid    |
| `steady`         | No other signal fired               | Recently reviewed        |

`steady` is a fallback, not a scoring signal — it carries no weight. It fires
when a seen term has nothing else to flag: reviewed within the last 24h (so
not `stale`), not a new term, and its last outcome was `shown` (fewer than
`SHOWN_WITHOUT_SOLID_MIN_SEEN` sightings), `solid` outside the cooldown
window, or `verified`. Without it these candidates would return an empty
`reasons` list and render no badge at all in the queue preview.

Labels live in [`lib/smart-queue/reasons.ts`](../lib/smart-queue/reasons.ts).
Review and quiz setup show a collapsible queue preview; cards and questions
show one or two badges.

### Soft cycle

There is no "reset the deck" button for everyday use. When every term in a
pool has `seen_count > 0`, unseen boosts stop applying and ranking shifts to
staleness and struggle. Pool stats expose this as `allSeenOnce`. Resetting a
collection's progress clears both `review_state` and `user_progress` and
starts the cycle over.

---

## Outcomes

| Outcome    | Meaning                                                 |
| ---------- | ------------------------------------------------------- |
| `unseen`   | Default when no review row exists yet                   |
| `shown`    | Delivered, revealed, or read on the web collection page |
| `learning` | Still learning, or wrong on an unknown-pool quiz        |
| `solid`    | Got it, or marked known                                 |
| `verified` | Still know it (known-pool refresh)                      |
| `forgot`   | Forgot it, or cleared known                             |

### `last_seen_at` semantics

Every outcome write can choose whether to increment `seen_count`:

- **`incrementSeen = true`** — bump `seen_count` and set `last_seen_at`
- **`incrementSeen = false`** — do not bump the count, but still set
  `last_seen_at`

So `last_seen_at` tracks the last queue event, including solid / forgot /
verified writes that do not add a sighting. Cooldown and staleness both read
from this timestamp.

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
- First reveal → `shown` (increment). Rating writes the outcome without a
  second increment when `alreadyCountedSeen` is set.
- Got it / Forgot it always flip known state; quiz prefs do not apply here.

### Web collection

- No smart-queue pick here. Terms are sorted the way you choose in the
  toolbar — default / A–Z / unknown-first (`SortMode` in
  `lib/jargon/filter-terms.ts`) — not by score. Opening a term card → `shown`
  once per visit. Good for reference, not a substitute for review.

### Telegram bot

- Get terms on a schedule, or pull one on demand with `/next`. Same ranking as
  web review; one unknown term at a time (`default` context).
- On send → `shown` (increment). Delivering the next term does not write an
  extra outcome for the previous one.
- Mark known or still learning from inline buttons. Mark known → known flip +
  `solid` **without** incrementing seen count (`last_seen_at` still updates).

### Quizzes (web + Telegram)

- Same preset and pool rules as review, with one extra tilt: weak-signal weights
  (`learning`, `forgot`, `shown_stuck`) are multiplied by **1.5×** via
  `PickContext: "quiz"` without changing the saved preset.
- Web setup shows the queue preview; questions show badges.
- Each answer records an outcome (always increments seen count).
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
- **Next** → `shown` for the term you are leaving (increment).
- Click to open the term in the web app → `shown` on the collection page for
  that visit.
- Mark known → known flip + `solid` (increment).

### List checkbox

- Flips `user_progress` and writes `solid` / `forgot` so the queue does not
  treat the term as brand new.

### `/stat`

- Per-collection known % plus unknown-pool queue stats (unseen / seen /
  stale).

---

## Data model

Postgres tables:

| Table                         | Role                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `review_state`                | `seen_count`, `last_seen_at`, `last_outcome` per user + term |
| `user_progress`               | Row present → known; absent → unknown                        |
| `user_settings.review_preset` | Which weight preset the user chose                           |

Candidate RPCs (see
[`lib/smart-queue/repository.ts`](../lib/smart-queue/repository.ts)):

- `my_get_review_candidates` — session-scoped (RLS)
- `get_review_candidates` — service role, explicit `userId`

Legacy random `pick_multiple_*` RPCs are removed.

---

## Code map

| Concern                              | Location                                                            |
| ------------------------------------ | ------------------------------------------------------------------- |
| Study pools / collection scope       | [`lib/study/`](../lib/study/)                                       |
| Types, scoring, pick, stats, presets | [`lib/smart-queue/`](../lib/smart-queue/)                           |
| DB RPCs for candidates / outcomes    | [`lib/smart-queue/repository.ts`](../lib/smart-queue/repository.ts) |
| Term ID → TermCard hydration         | [`lib/smart-queue/hydrate.ts`](../lib/smart-queue/hydrate.ts)       |
| Pick + hydrate composition           | [`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts)       |
| Outcome writes (only entry point)    | [`lib/jargon/review-outcome.ts`](../lib/jargon/review-outcome.ts)   |
| Known / unknown flips                | [`lib/jargon/known-state.ts`](../lib/jargon/known-state.ts)         |
| Telegram routing                     | [`lib/telegram/flows.ts`](../lib/telegram/flows.ts)                 |

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
       Telegram /next + delivery,               Widget, web collection,
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
