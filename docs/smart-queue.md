# Smart review queue

How Jargon Gym chooses the next term. Telegram `/next`, web review, quizzes,
the desktop widget, and passive delivery all use the same picker.

This is **not** Anki. There are no due dates, no intervals, and nothing nags
you to study. You open the app when you want; the queue ranks terms in your
active pool and returns the highest-scoring ones.

For a user-facing explanation (pools, badges, presets), see
[How the review queue works](/smart-queue) on the deployed app.

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
only ranks inside the pool you chose.

Once every term in a pool has been seen at least once, the unseen boost has
nothing left to apply. From then on, ranking is mostly staleness and struggle
signals — the **soft cycle**.

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

---

## Pipeline

All surfaces pick through the same path:

1. **Scope** — which collections (`lib/study/`) and which pool (`known` or
   `unknown`).
2. **Candidates** — Postgres returns one row per term with review history.
3. **Score and pick** — pure TypeScript in `lib/smart-queue/`; no DB calls
   during scoring.
4. **Hydrate** — term IDs become `TermCard`s for the UI.
5. **Record** — when the user interacts, `lib/jargon/review-outcome.ts`
   writes outcomes. Surfaces must not call outcome RPCs directly.

Entry points:

| Layer                                                             | Role                                                    |
| ----------------------------------------------------------------- | ------------------------------------------------------- |
| [`lib/study/pool.ts`](../lib/study/pool.ts)                       | Thin wrapper most surfaces call                         |
| [`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts)     | `pickReviewTerms`, `pickReviewTermsForUser`, pool stats |
| [`lib/jargon/review-outcome.ts`](../lib/jargon/review-outcome.ts) | Sole writer of review outcomes                          |

Telegram Edge Functions are thin proxies into internal API routes — they do
not own the scoring math.

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

Ties break on `term_id` (ascending) for stable ordering.

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

Settings → Review. One preset applies to every surface.

| Preset       | Character                                      |
| ------------ | ---------------------------------------------- |
| `balanced`   | Default mix                                    |
| `learn_new`  | Favors unseen and recently added terms         |
| `drill_weak` | Favors learning, forgot, and shown-stuck terms |

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

| Outcome    | Meaning                                          |
| ---------- | ------------------------------------------------ |
| `unseen`   | Default when no review row exists yet            |
| `shown`    | Delivered, revealed, or read on the jargon page  |
| `learning` | Still learning, or wrong on an unknown-pool quiz |
| `solid`    | Got it, or marked known                          |
| `verified` | Still know it (known-pool refresh)               |
| `forgot`   | Forgot it, or cleared known                      |

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

All picks return `{ cards, pickMeta }` from `fetchStudyTermPool` or
`pickReviewTerms*`. Surfaces differ in **when** they record outcomes, not in
the scoring formula.

### Telegram `/next` and cadence pushes

- Pick one unknown term (`default` context).
- On send → `shown` (increment).
- Delivering the next term does not write an extra outcome for the previous
  one.
- Mark known → known flip + `solid` **without** incrementing seen count
  (`last_seen_at` still updates).

### Web review

- User chooses known or unknown pool, then receives a batch (`default`
  context).
- Setup shows pool stats and a queue preview.
- First reveal → `shown` (increment).
- Rating writes the outcome without a second increment when
  `alreadyCountedSeen` is set.
- Cards show pick-reason badges.
- Got it / Forgot it always flip known state; quiz prefs do not apply here.

### Jargon page

- Opening a term card → `shown` once per visit.

### Quizzes (web + Telegram)

- Same picker with `quiz` context (stronger weak-signal bias).
- Web setup shows the queue preview; questions show badges.
- Each answer records an outcome (always increments seen count).
- Known flips follow Settings → Quiz prefs (`markUnknownOnFail`,
  `markKnownOnPass`).

### Desktop widget

- Passive rotation does **not** count as seen.
- Next → `shown` for the term you are leaving.
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
            |
   +--------+--------+--------+
   |        |        |        |
Telegram  Web review/quiz   Widget + jargon page
 /next    + list checkbox   (shown on Next only)
   |        |        |
   +--------+--- review-outcome only ---+
```

---

## What this is not

- No daily quotas or forced due dates
- Not SM-2, ease factors, or scheduled intervals
- Not a spaced-repetition scheduler — it is a priority queue over your active
  pool

## Next steps

- User-facing guide: [How the review queue works](/smart-queue)
- Telegram integration: [Telegram bot setup](supabase/telegram-setup.md)
- Project overview and local setup: [README](../README.md)
