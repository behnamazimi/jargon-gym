# Daily goals

Daily goals let a learner set a pace for Read, Review, and Quiz, see roughly
when each active collection would be mastered at that pace, and get a lobya
celebration the moment a day's goal is met. This page covers where the data
lives, how a celebration is decided, and how the forecast works.

## What a goal counts

A goal counts distinct terms on the learner's local day, the same numbers the
streak history shows. It uses the same day boundary as the streak.
`goal_day_counts` reads them from `review_state`'s last-read, last-reviewed,
and last-quizzed stamps, not from the `review_events` log, so goals keep
working if that log is ever dropped. Only the forecast's personal success
rates read the log, and they fall back to the defaults without it.

- **Read:** terms read, including Stories, the widget, and Telegram.
- **Review:** cards graded (reveals don't count).
- **Quiz:** questions answered (practice rounds don't count).

Every tier is optional. The presets are Light, Steady, and Intense (Read and
Review 10/20/40, Quiz 5/10/20), and the stepper moves in steps of 5. The
lobya's pose follows the nearest preset (`lib/goals/levels.ts`). Goals never
affect the streak.

## Where it lives

The feature is spread across a few small modules, all under `goals` names.

| Path                                                 | What it holds                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| `supabase/migrations/20261102100000_daily_goals.sql` | `user_settings` columns and the goal RPCs                           |
| `lib/goals/`                                         | Levels, progress math, settings repository, and the forecast loader |
| `lib/trace/forecast.ts`                              | The pure forecast simulation                                        |
| `app/(private)/app/goals/`                           | The page and its server actions                                     |
| `components/goals/`                                  | The page UI, the live store, and the celebration dialog             |
| `components/illustrations/scenes/goal-*.tsx`         | The lobya team poses and the celebration scene                      |

`user_settings.daily_goals` is null until the learner saves goals once.
`goal_celebrate` turns the celebration off. `goal_celebrated` records which
tiers were already celebrated on one local date.

## How a celebration is decided

The server decides, so a celebration shows once per tier per day across all
tabs and devices. No write action returns today's counts, and Read and Stories
write after their response, so the browser only asks when a goal looks met.

1. `GoalsIsland` (mounted in the root layout) seeds `goal-store.ts` with the
   goals, today's counts, and the tiers already celebrated. The tracker is
   keyed by user and resets the store when it unmounts, so signing out and
   back in on the same tab starts clean.
2. Study code calls `tickGoal(tier, termId)` after each term it credits. The
   store counts each term once per tab and day.
3. When today's count plus this tab's ids reaches the goal, the store calls
   `claimGoalCelebrationAction`. The `my_claim_goal_celebration` RPC locks the
   row, recounts, and records the tier only if the goal is met.
4. Every answer carries the server's counts, which replace the store's. The
   terms sent with that claim are dropped, so a term the server had already
   counted before the page loaded can't keep a goal looking met. If the claim
   fails (a read may still be in flight), the store asks again up to three times,
   1.5 seconds apart, then waits for the next credit.
5. A true claim opens `GoalCelebrationDialog` over the current screen.

Running out of terms counts as meeting the goal. `ReadCaughtUp` takes a `goal`
prop and calls `goalCaughtUp(tier)` when every active collection is caught up
and something was studied in that tier today. Editing goals never celebrates by itself,
but raising a tier's goal (or turning it back on) clears its celebrated mark for today (`saveGoals`), so reaching
the higher goal celebrates again. Lowering or turning a goal off leaves it.

To credit a new study surface, call `tickGoal` once the term is recorded.

## How the forecast works

The forecast plays TRACE forward one day at a time. Each day it picks the top
N terms per tier with the real ranking functions and applies the real update
functions, using the goals as N. A term counts as mastered on the same rule
that stamps `ever_mastered_at`: a successful answer that leaves it known.

- Grades come from a seeded random sequence, using the learner's own Review
  success rate and grade mix and Quiz success rate once there's enough
  history, or 85% before that.
- Three runs give the date range. The horizon is 365 days; past it, the row says
  "Over a year." Each row shows the later end of the range.
- Mastered needs Review (Read adds nothing to mastery, and Quiz alone tops out
  below the known line), so with Review off the forecast asks for it instead of
  showing dates. Quiz is optional.

A run stops early when nothing that's left can finish in time: no collection
fits in the answers left, nothing was mastered for 90 days, or, from day 60,
every unfinished collection's recent pace already lands well past the year.
Pace only slows as fewer new terms are left, so that last check doesn't cut
off a collection that would have finished. A forecast for 4,000 terms takes
under a second in most cases, and the page asks for one 400 ms after the last
change.

## Next steps

- Read [TRACE](./trace.md) for the ranking and mastery rules the forecast
  replays.
- Read [Page promos](./promos.md) for the `goals` promo that points new
  learners at the page.
