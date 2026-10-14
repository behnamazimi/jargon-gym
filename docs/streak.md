# Streak and streak shield

A day counts when the learner reads, reviews or quizzes one term, on their own
local day (`user_settings.timezone`, falling back to Europe/Amsterdam).
`bump_streak` (SQL) writes the streak after each qualifying event.
`streakSummary` and `withTodayDone` in `lib/streak/status.ts` read the same
rules for display, so a change to one must be mirrored in the other.

## Streak shield

- One shield is banked at a time (`shield_ready`). Each active day counts toward
  the next one (`shield_progress`); the 7th earns it.
- A shield covers exactly one missed day. The streak number does not move for
  the covered day and continues on the next active day. The shield is spent, the
  count restarts at 1 (the return day), and `shield_saved_date` and
  `shield_notice_pending` are set.
- Two missed days in a row break the streak and the shield is lost.
- Until the learner studies again, a banked shield with last activity two days
  ago is shown as in use (`shield.inUse`), and `get_streak_history` marks
  yesterday as shielded.
- The streak modal shows the shield line, the shielded day chip and a one-time
  message; opening the modal clears the flag through `my_clear_shield_notice`.
  The admin person page shows the shield state.

Tests: `lib/streak/status.test.ts`, `supabase/tests/streak_shield.sql`,
`e2e/tests/streak.spec.ts`.
