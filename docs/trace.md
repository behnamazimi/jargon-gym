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
than the other two traces, over a 10-day scale). In mastery it fills a
small part of what recall is still missing, so it helps weak terms more
than strong ones (see Mastery below). Reading alone cannot make a term
"mastered."

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
takes the short-term branch instead, which only scales stability: for a young
term Again ×0.5, Good ×1.4 and Easy ×2.3, and Hard leaves it where it was.
A recalled term is first lifted to the one-day floor (below) and the gain is
applied on top, so right after a miss Hard, Good and Easy come back after about
1, 1.4 and 2.3 days instead of all three showing the same wait.
As in FSRS-6, the gain shrinks as a term gets stronger (`S^-w19`,
`SAME_DAY_STABILITY_DECAY`), and a Hard, Good or Easy never takes stability
away. Grades hours apart are weak
evidence of long-term memory, so they are not treated as full reviews.

Stock FSRS-5 weights are fit to Anki users, and with them a few Goods sent a
term away for years while Again and Hard barely brought it back. TRACE
changes four things, all smoothly, with no caps:

- **Diminishing returns** (`w9`, 0.15 → 0.626): the stronger a term already
  is, the less each Good or Easy adds.
- **Again keeps less** (`w11`, 15% of FSRS-5's), and a first-ever Again
  starts at 0.2 days of stability instead of 0.41. After a lapse, stability
  also never ends up higher than before, as in FSRS-5.
- **Hard is a partial recall**: its stability is a geometric blend of what
  Again and Good would give, 85% toward Again (`HARD_LAPSE_BLEND`), but never
  less than half the stability the term had (`HARD_MIN_KEEP`). Hard pulls a
  strong term back to about half its gap and holds a fragile one at the
  one-day floor. In stock FSRS-5 Hard always grows stability. A first-ever
  Hard starts at 0.7 days instead of 1.18.
- **Easy moves less**: the Easy bonus drops from 2.95× to 1.6× Good's growth,
  and a first-ever Easy starts at 7 days of stability instead of 15.5.

Graded each time it falls to Review's 0.89 line, five Goods in a row come
back after about 3.5, 10, 19, 31 and 45 days, and four Easys after about 8,
26, 57 and 104. An Again on a term that had reached about 19 days brings it
back in about 12 hours, and a Hard in about 9 days. The tests in
`lib/trace/recall.test.ts` ("review gaps at the Review target") check this
behaviour. A term that was recalled is never due sooner than a day
(`minPassStability` in `lib/trace/recall.ts`, applied to Hard, Good and Easy,
including a first-ever grade). A missed term is handled in the session instead
(see Learning steps below). Apart from those retries, a term never repeats
within a session.

#### Learning steps

A missed term (an Again) is asked again in the same session, after a few other
cards, up to three times (`LEARNING_STEP_MAX_RETRIES`). Web Review does this in
the browser (`lib/review/retry.ts`, `useReviewQueue.scheduleRetry`); Telegram
adds the term back into its session list (`recordReviewRating`). Once it is
recalled, the one-day floor takes over: an Again then a Good a few minutes
later comes back after about 1.4 days, then about 3.6, 7.9 and 14.6 days.

A retry updates the term's stability and difficulty like any grade, but it is
not a new test. The server counts it as one only if the term was graded within
the last hour (`LEARNING_STEP_WINDOW_MINUTES`); then it adds nothing to
`review_recall_count` (so mastery confidence and the Known label's test minimum
are unchanged), stamps neither high-water mark, and does not tick the daily
goal. `review_events.is_retry` marks these rows: leave them out when checking
how well TRACE predicts recall over days, since they are minutes apart.

Why: the spacing and testing research behind this (successive relearning)
supports re-asking a missed item in the session and then waiting at least a
day. The size of the gap before the retry is a convention, not a measured
value. In a simulation of real use (several sessions a day) this and the two
changes above roughly doubled how many terms were started in two weeks, at a
cost of about 7% extra cards. No replay of old grades was needed: stored
stabilities change at the next grade.

Review's grade buttons can show these gaps ("Show when terms come back" in the
Review options, on by default). `daysUntilNextReview` in `lib/trace/snapshot.ts`
applies each grade to the term's current state and returns the days until it
falls back to the line. The card carries that state (`TermCard.recall`), and
the browser works it out at reveal, since a grade a day after the last one
switches to the short-term rule. It is an estimate, not a due date: the term
comes back sooner if nothing else is due, and later on a day when many terms
have faded further.

These values were picked from simulated Review at 40 and 100 reviews a day: a
learner who forgets the way stock FSRS-5 predicts, a pool of 3,000 terms and
one session a day. Moving each knob on its own showed that the per-grade ones
(Again, Hard, Easy and the first-ever stabilities) barely change the
workload, so they were set by how the gaps feel. Only the gaps of Good and
Easy trade new terms against keeping them, whether they are set by the target
or by `w9`: re-tuning Good and Easy to keep their gaps at a lower target gave
exactly the same workload. `w9` is the cleaner of the two, since it leaves
Again, Hard and the first gaps alone. It went from 0.8 to 0.626 so Good × 5
ends near 45 days instead of 29, and the Easy bonus from 2.0 to 1.6 so Easy
× 4 ends near 104 days instead of 136. Over 180 days at 40 a day that raised
the new-term share in the sixth month from about 4% to 5% and the terms that
would last three weeks from 609 to 656, with recall down about a point (87% to
86%). Over 90 days these values start about 510 terms, 84% of them would last
three weeks or more, 82% of reviews are recalled, and by the third month about
8% of each session is new terms.

These rules shipped with
[`20261030100000_trace_recall_replay.sql`](../supabase/migrations/20261030100000_trace_recall_replay.sql),
which replayed every term's logged grades under them once, so terms that
earlier rules had sent away for years came back into range.
[`20261031100000_trace_recall_replay_good_spacing.sql`](../supabase/migrations/20261031100000_trace_recall_replay_good_spacing.sql)
replayed them again after the `w9` and Easy change.

`HARD_MIN_KEEP` came on 15 October 2026. Before it, a Hard sent any term,
even one that had lasted two months, back to about a day, so Hard looked out
of place next to Good and Easy. Stock FSRS-5 and FSRS-6 grow stability on a
Hard; real grades here say young Hard terms really are fragile (about 80%
recalled a day later, below the 0.89 line), so only the collapse of strong
terms was changed. Good and Easy were left alone: their gaps are at or below
both FSRS versions. [`20261111100000_trace_retune_replay.sql`](../supabase/migrations/20261111100000_trace_retune_replay.sql)
replayed every term's logged events under the current rules, including the
one-day floor and the same-day rule.

### Recognition, from Quiz

Quiz answers are noisier than Review grades — a wrong answer might be a
genuine gap, or it might be a misclick on an otherwise-easy multiple-choice
question. So instead of a discrete grade, each Quiz answer updates a
**posterior probability that you actually know the term**, using a simple
Bayesian update: how much a correct or incorrect answer should move your
estimate depends on how easy it'd be to get right by guessing (25% for
4-option multiple choice, 50% for true/false, 5% for a typed answer, where
you have to produce the word yourself, and 25% for dictation, where you type a
word you just heard, which shows you can spell it more than that you know it). That posterior maps onto a
stability value the same way recall's does, and decays the same way into a
retrievability number.

Two details worth knowing:

- Like recall, a term has no recognition trace until you answer a Quiz
  question about it for the first time. A right first answer starts from
  what Review already says: the term's recall retrievability two weeks
  ahead, never below 0.5, so a pass on a well-recalled term counts in full.
  A wrong first answer, or any first answer on a term never graded in
  Review, starts from 50/50. Starting a miss from strong recall softened it
  so much that it lifted mastery above a term never quizzed. Either way this
  is only the prior at that moment, never a standing default beforehand.
- A Quiz miss is softened if your current recall retrievability for that
  term is high. If you can clearly still recall a term from memory, a Quiz
  miss on it is more likely a misclick than real forgetting, so the
  posterior takes a smaller hit than it would for a term you're already
  shaky on.

## Mastery: the one number that blends all three

A term's live mastery asks one question: will you still know it two weeks
from now? Every track is read `MASTERY_HORIZON_DAYS` (14) days ahead, so a
term you just answered, right or wrong, isn't credited as fresh. What
counts is how much stability the term has built up.

```
R'      = R_r + 0.3 · F_used · (1 − R_r)          (reading fills part of what recall is missing)
K_g     = posterior · R_g                         (how likely you are to recognise it)
Mastery = R'^0.625 · K_g^0.375                     (weighted geometric mean)
```

`R_r`, `R_g` and `F_used` are all read 14 days ahead. The weaker of recall
and recognition pulls the score down. A track you haven't tested yet counts
as 0.5 (`UNTESTED_TRACK_EVIDENCE`), a coin flip rather than 0. A term never
quizzed tops out at 0.5^0.375 ≈ 0.77, below the Known line, so a passed quiz
is what lifts a term to Known. That comes from the formula, with no separate
rule. A term whose only quiz answer is wrong scores below one never quizzed,
so a miss can't stand in for a pass. A term
neither Review nor Quiz has tested has mastery 0, whatever Read did.

Reading lifts only the recall side (`READ_GAP_WEIGHT`, 0.3). It helps a weak
term more than a strong one, and it never makes an unquizzed term Known.
The lift fades with familiarity: one read halves after about 10 days.

The 5 : 3 split between recall and recognition is the original design's
0.5 / 0.3. Recall counts more because in Review you produce the answer,
while in Quiz you can pick it or guess.

That raw number then gets discounted by how many times you've actually
been tested on the term (Review + Quiz combined), so a single lucky "Easy"
grade on a brand-new term can't read as mastery the way ten consistent
grades would (`CONFIDENCE_TIME_CONSTANT`, 1). This adjusted number —
**Mastery_adjusted** — is what everything else (the known/learning/unknown
label, the mastery page's "current strength" figure) is actually built from.

These values come from 15 October 2026. Real events from one learner showed
the old blend (0.2 · F + 0.5 · R_r + 0.3 · R_g, read now) rewarding misses:
retrievability is 1 right after any answer, a wrong quiz answer added about
as much as a right one, and Agains counted as tests. Terms failed over and
over read Known while cleanly learned ones didn't. In a simulated learner
whose memory follows stock FSRS-6, the new mastery tracks real recall a
week ahead much more closely (rank correlation about 0.68 against 0.35). On
a 500-term collection at 40 reviews a day, a term reaches Known after
about 4 reviews and a passed quiz, about four weeks after it is first seen.
About 1% of those turn out weak, against 8–14% before.

### The known / learning / unknown label

This is a read-only badge, not something you set. There's no toggle
anywhere in the app to mark a term known by hand anymore — the label is
recalculated live from Mastery_adjusted every time it's shown:

| Label        | Condition                                                              |
| ------------ | ---------------------------------------------------------------------- |
| **Known**    | Mastery_adjusted ≥ 0.78, and you've been tested on it at least 3 times |
| **Learning** | Everything in between                                                  |
| **Unknown**  | Mastery_adjusted < 0.6                                                 |

The test-count floor exists because the confidence discount alone doesn't
fully protect against a single strong grade nudging a brand-new term over
0.78 by chance — the explicit count check closes that gap.

Importantly, **this label never affects what Review or Quiz shows you.**
Ranking uses each tier's own live signal described below (recall
retrievability for Review, posterior × recognition retrievability for Quiz),
never Mastery_adjusted — confidence-weighting and the known/unknown split are
a reporting layer on top of the ranking, not part of it.

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
answer anything, that track's retrievability is 1 at that instant. Mastery is
read two weeks ahead, so a miss no longer looks fresh, but the rule still
holds. `crossedThresholds` in `lib/trace/mastery.ts` applies it for both
stamps; Hard still counts, since you did recall the term.

The live label used to have a known downside: right after an Again or a
missed Quiz question, a term could read Known for hours. Reading every track
two weeks ahead fixed that, since a term that was just missed has little
stability left to carry it that far.

The stamps were recomputed under the 15 October 2026 rules by
[`20261111100000_trace_retune_replay.sql`](../supabase/migrations/20261111100000_trace_retune_replay.sql),
so stamps that misses had earned under the old scoring were cleared.

The second, a sibling high-water mark (`ever_learning_at`), does the
identical thing one threshold lower — stamped the first time
Mastery_adjusted crosses the learning threshold (0.6) rather than the
known one (0.78). That stamp is still written, but it no longer drives
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
the same `rankReadQueue` order Cards uses, minus marked-known terms. Every
piece is offered the top 10 terms, whatever its length, and uses the ones
that fit (at least 1, 2 or 3 for short, medium and long); it is still
charged by length. It doesn't add a trace or a weight of its own. Marking a piece read writes one
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
| **Review** | Lowest recall retrievability first                                           | Ranked as if 0.89 retrievable: after decayed terms, before the rest      |
| **Quiz**   | Least likely to be recognised first (posterior × recognition retrievability) | Ranked as if 0.7: after missed and decayed terms, before the rest        |

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
an untested term is ranked as if it were 89% retrievable in Review
(`UNTESTED_RECALL_RETRIEVABILITY`) and 70% in Quiz
(`UNTESTED_RECOGNITION_RETRIEVABILITY`). A learned term that has decayed below
the line goes first, because it's about to slip. In Review the line also works
as the target: a learned term comes back once it is 11% likely to be
forgotten. It used to be 0.7 there too, which made every wait about four times
as long as FSRS intends and let each Good grow stability more. Quiz keeps 0.7
because recognition stability tops out at 16 days, so a higher line would
bring every quizzed term back within about two weeks. Once nothing is below the line, new terms come
next, ahead of learned terms that are still holding. There's no daily limit
and nothing to configure; the line adjusts itself to how much you study.

New terms get whatever is left after the terms below the line, so their share
of a session doesn't grow with a bigger daily budget, and it shrinks as the
learned pool grows. In the simulation above it was about 25% in the first
month, 8% in the third and 5% by the sixth, at 40 or 100 reviews a day.

If people say sessions have too few new terms, the quick win is to reserve a
fixed share of each session for them and rank the rest as today (in the
Review feed's batch picking, not the memory math). Tuning the weights can't do
it: none of them moved the share by more than a point. Simulated over 180
days at 40 a day, reserving 10% raised the terms that would last three weeks
from 656 to 771, and 15% to 950. The cost is more misses (recalled reviews
fell from 86% to 83% and 77%) and a growing pile of learned terms below the
target, which still come back most-faded first, only later. Past about 20%,
a third of started terms don't stick. It was left out on purpose, so check
with the product owner before adding it.

Quiz ranks by posterior × recognition retrievability (`quizRankScore`), not
by retrievability alone, so a term answered wrong comes back at the next
Quiz session after its cooldown (about a day), ahead of new terms and of
terms answered right. Ranking by retrievability alone let a missed term wait
about as long as a passed one, which held it back from Known for weeks.

Within a tier, once you've just gotten something right, it drops out of
that tier's list — specifically, once its retrievability rises above 0.98
— so a review or quiz session doesn't keep re-serving something you just
nailed thirty seconds ago. The same holds for a Quiz term answered wrong:
it sits out for about a day. There's no actual concept of a "session" behind
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

`lib/trace/forecast.ts` is the daily goals forecast. It replays the ranking
and update functions above one simulated day at a time and never changes
them, so a change to TRACE carries into the forecast on its own. See
[goals.md](./goals.md).

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
- **Mastery reads two weeks ahead and blends geometrically.** The design's
  `wF·F + wR·R_r + wG·R_g`, read now, rewarded misses (retrievability is 1
  right after any answer). Mastery now reads every track two weeks ahead,
  multiplies recognition by the quiz posterior, combines recall and
  recognition as a weighted geometric mean with untested tracks at 0.5, and
  lets reading fill part of what recall is missing; see
  [Mastery](#mastery-the-one-number-that-blends-all-three). Quiz also ranks
  by posterior × recognition rather than recognition alone.
- **The old known/unknown pool toggle is gone entirely,** not repurposed.
  There's no manual "mark as known" action anywhere in the app anymore, on
  web or Telegram — the label described above is the only thing that plays
  that role now, and it can't be set by hand.

## Tunable parameters

Every constant TRACE uses is named and commented in
[`lib/trace/constants.ts`](../lib/trace/constants.ts) — treat that file as
the source of truth rather than this table, since the two can drift. As of
writing:

| Parameter                                                    | Value                              | Meaning                                                                                                                          |
| ------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Familiarity growth rate / decay rate                         | 0.3 / 0.5                          | How fast familiarity grows per read, and how quickly that growth diminishes with repetition                                      |
| Familiarity cap                                              | 0.35                               | Most familiarity can count, both in mastery and in the cold-start nudge                                                          |
| Familiarity decay scale                                      | 10 days                            | How fast familiarity fades if you stop reading a term                                                                            |
| Cold-start nudge (difficulty / stability)                    | 2 / 0.5                            | How much familiarity shifts a term's very first recall grade                                                                     |
| Quiz slip allowance                                          | 0.95                               | Assumed chance of answering correctly when you do know the term                                                                  |
| Guess rate, multiple choice / true-false / typed / dictation | 0.25 / 0.5 / 0.05 / 0.25           | Assumed chance of answering correctly by guessing                                                                                |
| Recall forgetting curve                                      | FSRS-5                             | `(1 + 19/81·t/S)^-0.5`, so recall is exactly 90% after S days                                                                    |
| Recognition decay scale                                      | 9                                  | Recognition only: `(1 + t/(9·S))⁻¹`                                                                                              |
| Changed FSRS-5 weights (w0 / w1 / w3 / w9 / w11 / w16)       | 0.2 / 0.7 / 7 / 0.626 / 0.30 / 1.6 | First-ever Again, Hard and Easy stability, diminishing returns, how much a lapse keeps, Easy bonus                               |
| Hard blend toward Again / least kept                         | 0.85 / 0.5                         | Where Hard's stability sits between the Again and Good outcomes, and the least share of its stability a Hard keeps               |
| Mastery horizon                                              | 14 days                            | How far ahead every track is read for mastery                                                                                    |
| Mastery blend exponents (recall / recognition)               | 0.625 / 0.375                      | Weights of the geometric mean of recall and recognition knowledge                                                                |
| Untested track evidence                                      | 0.5                                | What a track with no tests yet counts as in mastery                                                                              |
| Read gap weight                                              | 0.3                                | Share of what recall is missing that full familiarity fills in mastery                                                           |
| Confidence time constant                                     | 1 test                             | How quickly the confidence discount approaches full weight                                                                       |
| Known / unknown thresholds                                   | 0.78 / 0.6                         | Mastery_adjusted bounds for the known/learning/unknown label                                                                     |
| Known label minimum test count                               | 3                                  | Tests needed (Review + Quiz combined) before "known" can apply                                                                   |
| Same-day stability decay (`w19`)                             | 0.0658                             | FSRS-6's default, paired with TRACE's own `w17`/`w18`; same-day gains shrink as stability grows                                  |
| Learning-step retries / window                               | 3 / 60 minutes                     | How often a missed term is re-asked in a session, and how recently it must have been graded for a retry to count as one          |
| Session cooldown                                             | 0.98 retrievability                | Above this, a term drops out of that tier's list for the rest of the session                                                     |
| Untested-term queue position (Review / Quiz)                 | 0.89 / 0.7                         | Where a never-graded or never-answered term sorts; learned terms that have decayed below it go first                             |
| Read mastery-temper weight                                   | 0.2                                | How much the mastery-tempering nudge can push an already-tested term later in Read's queue, relative to its decay-aware exposure |

These are reasoned starting points, not values fit to real usage data — this
one in particular is meant to be tuned by feel once it's live, the same way the rest of the scoring engine's constants
get adjusted — see
`trace-formula.md`'s "Open items to validate" section for what's still
worth measuring once there's real pass/fail history to look at.

## Open follow-up: should TRACE move to FSRS-6? (revisit around early December 2026)

**How we got here.** On 12 October 2026 we noticed that Good and Easy barely
grow a term after an Again or Hard. Production `review_events` (one learner, 325
grades) showed why: they study about three times a day, so 86% of repeats came
less than 24 hours after the previous grade and used the same-day rule. A term
that started with Again stayed on a loop of hours. We rejected moving the
24-hour cut-off to 4 or 8 hours (it treats two answers hours apart as proof of
long-term memory) and shipped learning steps, the one-day floor and FSRS-6's
same-day formula instead. FSRS-6 itself was kept out on purpose.

**What FSRS-6 is** (from the FSRS algorithm wiki): the forgetting curve's decay
becomes a fitted value (`w20`, default 0.1542, `R = (1 + (0.9^(-1/w20) - 1)·t/S)^(-w20)`);
the same-day formula gains `S^(-w19)`; there are 21 weights, defaults
`[0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
0.1542]`. We adopted only the same-day change.

**Why we might want all of it.**

- Its weights are fitted to real learner data. TRACE's (`w0`, `w1`, `w3`, `w9`,
  `w11`, `w16`, the 0.85 Hard blend, the 0.89 line) were tuned by feel against a
  simulated learner who forgets like stock FSRS-5, which shows workload, not
  better memory.
- Early evidence says TRACE is too cautious: over 136 repeats it predicted 82%
  recall and the learner got 88%. In a simulation against an FSRS-6 memory, 42%
  of old-TRACE reviews came when recall was still 95% or better.
- In that simulation stock FSRS-6 left more terms recalled at day 14 than
  TRACE with these changes (726 vs 680; 753 with learning steps and the floor;
  old TRACE 457).

**Why not yet.**

- Stock FSRS-6 sends a term away for years after a few Goods (Good ×6 came back
  after 2,157 days, Easy ×4 after 2,719). That is the problem the 10 October
  retune fixed by hand.
- The simulation favoured FSRS-6, because its hidden memory was FSRS-6 itself.
  The real data was 3 days old and every gap was in hours, so nothing is known
  yet about days or weeks.

**What to check** (query `review_events` where `is_retry = false`):

1. Enough data: a few hundred repeats at gaps of a day or more, ideally from
   more than one learner.
2. Calibration: predicted `retrievability_before` against actual recall in
   bands (below 0.7, 0.7-0.8, 0.8-0.9, 0.9 and up), for TRACE and for stock
   FSRS-6 replayed on the same events; compare log-loss.
3. Whether real Again rates at gaps of a day or more match what each model
   predicts, and whether very long waits ever match real forgetting.
4. Decide: keep TRACE if it is calibrated; adopt FSRS-6 with a longest-wait cap;
   or fit the weights with the open-source FSRS optimizer on our own events.

If FSRS-6 is adopted, the forgetting curve changes (`retrievability` and
`daysUntilRetrievability` in `lib/trace/recall.ts`), so `rankReviewQueue`,
`cooldownEndsAt`, the queue-debug admin view and the 0.89 and 0.98 lines need
re-checking, and a replay migration is needed (pattern:
`20261030100000_trace_recall_replay.sql`).
