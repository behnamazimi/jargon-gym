# Smart review queue

How Jargon Gym decides **which term to show next**, and how that decision plugs into the rest of the app.

This is not spaced repetition with due dates. Nothing nags you. When _you_ ask for a term — Telegram `/next`, a web review session, a quiz — the queue ranks the pool and picks the highest-scoring ones.

---

## The idea in one paragraph

Every term in your active collections has a little history: how often you’ve seen it, when you last saw it, and what happened last time (got it, still learning, skipped, …). The picker scores every candidate with that history, plus a few boosts (unseen, struggling, newly added). Highest score wins. After you’ve seen everything once, the “unseen” boost disappears on its own and the queue becomes “whatever’s been neglected or feels weak.”

---

## Where the code lives

Next and Deno can’t share modules at deploy time, so the **pure algorithm is duplicated on purpose**:

| Role                                          | Next.js                                                       | Telegram / Edge                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Pure scoring / pick / stats                   | [`lib/smart-queue/`](../lib/smart-queue/)                     | [`supabase/functions/_shared/smart-queue/`](../supabase/functions/_shared/smart-queue/)                     |
| DB adapter (load candidates, record outcomes) | [`lib/smart-queue/service.ts`](../lib/smart-queue/service.ts) | [`supabase/functions/_shared/smart-queue-service.ts`](../supabase/functions/_shared/smart-queue-service.ts) |

Keep the pure folders in sync (same pattern as the Telegram link-token contract). Change weights or scoring in both places.

History is stored in Postgres:

- `review_state` — per user + term: `seen_count`, `last_seen_at`, `last_outcome`
- `user_progress` — still just binary known / unknown
- `user_settings.review_preset` — which weight pack to use

Writes go through `record_review_outcome` / `my_record_review_outcome`.

---

## Scoring (v1)

For each candidate:

1. **Unseen** (`seen_count === 0`) → big boost
2. **Outcome** → `learning` and `forgot` get extra boost; other outcomes don’t
3. **New term** → moderate boost if created in the last ~72 hours
4. **Seen count** → penalty (the more you’ve seen it, the lower it sinks)
5. **Staleness** → boost that grows with hours since `last_seen_at` (capped at 7 days)

Then sort by score (tie-break on term id) and take the top N.

### Presets

Settings → Review. Same preset feeds every smart pick surface.

| Preset       | Bias                               |
| ------------ | ---------------------------------- |
| `balanced`   | Default mix                        |
| `learn_new`  | Stronger unseen / new-term weights |
| `drill_weak` | Stronger learning / forgot weights |

Numbers live in `presets.ts` on both stacks.

### Soft cycle

There’s no hard “reset the deck” button. Once every term in a pool has `seen_count > 0`, none of them get the unseen boost anymore, so ranking is mostly staleness + struggle + penalties. Stats call that “all seen once.”

---

## Outcomes (what gets written)

| Outcome    | Meaning                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- |
| `unseen`   | Default / no row yet                                                                     |
| `shown`    | You were shown the term (delivery, reveal, or collapse after reading on the jargon page) |
| `skipped`  | Explicit Telegram Skip                                                                   |
| `learning` | Still learning / wrong in an unknown quiz                                                |
| `solid`    | Got it / marked known                                                                    |
| `verified` | Still know it (known-pool refresh)                                                       |
| `forgot`   | Forgot it / cleared known                                                                |

Important RPC detail: **`p_increment_seen = true`** bumps `seen_count` and `last_seen_at`. **`false`** only updates `last_outcome` (used after a term was already counted as shown).

---

## How surfaces couple in

All smart picks go through the adapter (`pickReviewTerms` / `recordReviewOutcome`). Surfaces differ in _when_ they record, not in the scoring math.

### Telegram `/next` (and cadence pushes)

1. Pick 1 unknown term from all active collections
2. On send → `shown` (+increment)
3. Skip → `skipped` (no increment)
4. Mark known → `mark_term_known` + `solid` (no increment)

### Web review (flashcards)

1. Pick N terms from the smart queue (unknown or known pool — you choose)
2. First reveal → `shown` (+increment)
3. Rate → outcome only (no second increment); re-rating doesn’t inflate `seen_count`
4. Setup shows pool stats: unseen · seen · stale · covered

Review always updates known/unknown on Got it / Forgot it. Quiz auto-mark prefs do **not** apply here.

### Web jargon page (term list)

Collapse a card after opening it → `shown` once per visit. Same sighting signal as a review reveal.

### Quizzes (Telegram `/quiz` + web quiz)

1. Batch = top N from the same smart pick
2. Each answer records an outcome (+increment)
3. Known-state flips respect Settings → Quiz prefs (`markKnownOnPass` / `markUnknownOnFail`)

### List checkbox / desktop widget “mark known”

Still flip `user_progress`, and also write queue history (`solid` / `forgot`) so those terms don’t look “never seen” inside the known pool.

### Reset collection progress

Clears **both** `user_progress` and `review_state` for that domain’s terms, so the soft cycle can start clean.

### Telegram `/stat`

Per-collection known% plus unknown-pool queue stats (unseen / seen / stale).

---

## Mental model

```
                    ┌─────────────────────────┐
                    │  review_state + preset  │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  pickTerms / score      │  ← pure, duplicated Next ↔ Deno
                    └───────────┬─────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   Telegram /next         Web review / quiz      Jargon collapse
   + cadence              + list / widget        (shown only)
          │                     │
          └──────────► record_review_outcome ◄──┘
```

If you’re changing behavior, ask: **is this a scoring change** (edit `lib/smart-queue` _and_ the Deno mirror) or **a surface coupling change** (when that UI calls pick / record)?

---

## What this is not

- No forced due dates or daily quotas
- Not Anki / SM-2 (no ease factor, no intervals)
- Random `pick_multiple_*` SQL RPCs still exist in the DB but are deprecated — app code shouldn’t call them
