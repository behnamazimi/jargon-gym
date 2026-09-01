# TRACE

**T**iered **R**etention **A**cross **C**ognitive **E**xposure

A memory-scoring engine derived from FSRS, redesigned for jargon learning with three tiers (Read, Review, Quiz), no due dates, and independent queues per tier.

---

## 1. Core idea

Standard FSRS tracks one memory state per item and outputs a due date. TRACE tracks **three independent memory traces per term** (exposure, recall, recognition), never schedules anything, and instead ranks each tier's queue live by current decay. Mastery is a live-computed blend of the three traces, not a stored score.

---

## 2. The three traces

| Trace                                            | Fed by | Represents                                 |
| ------------------------------------------------ | ------ | ------------------------------------------ |
| **F** — Familiarity                              | Read   | Passive exposure                           |
| **S_r / D_r** — Recall stability/difficulty      | Review | Ability to produce the term unprompted     |
| **S_g / D_g** — Recognition stability/difficulty | Quiz   | Ability to identify the term among options |

All three decay continuously and independently, whether or not the user opens that tier.

---

## 3. Familiarity (F) — from Read

**Growth per read**, diminishing with repeat exposure:

```
F' = F + w_f · e^(−k·n)
```

- `n` = read count so far for this term
- `w_f = 0.3`, `k = 0.5` (defaults)

**Cap:** `F_used = min(F, cap_F)`, `cap_F = 0.35`
Reading alone can never push mastery above ~35%.

**Decay** (faster, shallower than tested memory):

```
F(t) = F₀ / (1 + t / 10)
```

`t` = days since last Read.

**Effect on cold-start** (first time a term is Reviewed or Quizzed):

```
D0' = D0(G) − λD · F₀      (λD = 2)
S0' = S0(G) · (1 + λS · F₀) (λS = 0.5)
```

If F₀ = 0 (never read before first test), this collapses to plain FSRS defaults — no special-casing needed.

---

## 4. Recall trace (S_r, D_r) — from Review

Full FSRS-5, unmodified, using recall-before-reveal grades (1=Again, 2=Hard, 3=Good, 4=Easy). `S_r` and `D_r` are **null until the first Review** — see Section 4b.

**Default weights (w0–w18):**

```
[0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234,
 1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407,
 2.9466, 0.5034, 0.6567]
```

**Initial stability** (first-ever grade on a term):

```
S0(G) = w[G−1]     (i.e. w0, w1, w2, or w3 for G = 1..4)
```

**Initial difficulty:**

```
D0(G) = w4 − e^(w5·(G−1)) + 1
D0 = clamp(D0(G), 1, 10)
```

**Difficulty update** (subsequent reviews):

```
ΔD = −w6 · (G − 3)
D' = D + ΔD · (10 − D) / 9
D_final = clamp( w7·D0(4) + (1−w7)·D' , 1, 10 )
```

**Stability update on success** (G = 2, 3, or 4):

```
S' = S · ( 1 + e^w8 · (11−D) · S^(−w9) · (e^(w10·(1−R)) − 1) · bonus(G) )
bonus(G) = w15 if G=2, 1 if G=3, w16 if G=4
```

**Stability update on lapse** (G = 1):

```
S' = w11 · D^(−w12) · ((S+1)^w13 − 1) · e^(w14·(1−R))
```

**Same-day re-review:**

```
S' = S · e^(w17·(G − 3 + w18))
```

**Retrievability:**

```
R_r(t) = (1 + t / (9·S_r))^−1
```

### 4b. Nullable state — no defaulting

`S_r`/`D_r` do not exist until the first Review event. There is no cold-start default assigned just because a term was created. `R_r(t)` is undefined (not "low," not "0.23 decaying" — undefined) until a real S_r exists. This is what makes Section 9's eligibility rule automatic rather than a rule to remember: a term with no Review history simply has nothing to rank in the Review queue, no separate check required.

Once the term has been Read, F(t) feeds the _initial_ S0/D0 via Section 3's cold-start nudge — but only at the moment of the first real Review. Before that first Review, F alone never produces a fake S_r/R_r.

---

## 5. Recognition trace (S_g, D_g) — from Quiz

Quiz answers are noisy (guessing). Convert each answer into a **posterior probability of knowledge**, not a discrete grade.

**Bayesian update per answer:**

```
p' = (P(correct|knows) · p) / (P(correct|knows)·p + P(correct|guess)·(1−p))
```

- `P(correct|knows) = 0.95` (slip rate allowance)
- `P(correct|guess)`: `0.25` for 4-option MCQ, `0.50` for True/False
- Start `p₀ = 0.5` for an untested term

Map posterior to stability: `S_g = 1 + k_g · p` (k_g tunable, e.g. 15)

**Recognition retrievability:**

```
R_g(t) = (1 + t / (9·S_g))^−1
```

**Nullable state:** same rule as Section 4b — `S_g` (and posterior `p`) do not exist until the first Quiz answer. No default `p₀ = 0.5` is assigned to an unquizzed term; `p₀ = 0.5` is only the starting prior used _the moment_ the first answer comes in, not a standing value beforehand. `R_g(t)` is undefined until then.

**Cross-track sanity check on quiz failure:** scale the penalty by how surprising the failure is, using current recall strength:

```
penalty_scale = 1 − 0.5 · R_r(t)
```

High R_r at time of quiz failure → soften the S_g hit (likely a misclick, not real forgetting).

---

## 6. Cooldown (session-level, not part of the decay math)

The decay formulas only resolve at day-scale; they don't prevent same-session repeats. Separate, simple rule:

- Exclude any term with `R(t) > 0.98` from that tier's queue for the rest of the current session.
- Across days, no cooldown needed — decayed R(t) naturally sorts recently-passed terms to the bottom of the queue.

---

## 7. Mastery (per term, computed live)

```
Mastery(term, t) = wF·F_used(t) + wR·R_r(t) + wG·R_g(t)
```

Defaults: `wF = 0.2, wR = 0.5, wG = 0.3`

**Confidence discount** — a single Good grade shouldn't count as much as ten:

```
confidence(n) = 1 − e^(−n/3)     (n = number of tests on this track)
Mastery_adjusted = confidence(n) · Mastery(term, t)
```

Nothing is stored — recompute from last-event timestamps + current S/D whenever needed.

---

## 8. Aggregate mastery (deck/user level)

```
OverallMastery = (Σ Mastery_adjusted(termᵢ)) / N_active
```

`N_active` = terms with at least one Read (i.e., actually started).

**Show two numbers in UI**, since OverallMastery decays with inactivity by design:

- **Current strength** — the live decaying value above (used internally for ranking)
- **Terms learned** — high-water-mark count of terms that ever crossed Mastery ≥ 0.8; never decreases

---

## 9. Known / unknown pools (UI layer only — not part of ranking math)

Filtering/display layer on top of the continuous system, not a change to queue sorting:

- Promote to **known**: Mastery_adjusted ≥ 0.8 **and** n ≥ 3 on whichever track(s) drove the score
- Demote to **unknown**: Mastery_adjusted < 0.6 (hysteresis gap prevents flapping at the boundary)

The n ≥ 3 gate exists because `confidence(n)` alone isn't enough to stop a single lucky Easy grade on a brand-new term from crossing 0.8 — confidence discounts the number, but a generous first grade plus low n can still occasionally clear the bar by accident. The explicit count check closes that gap.

Queues still rank by raw `R(t)` ascending regardless of pool, **not** by Mastery_adjusted — ranking answers "what's decaying fastest," which doesn't need confidence-weighting (a barely-tested item genuinely is at risk and should surface). Confidence and the null-state rule only gate the _mastery/knowledge_ claim (pool promotion, progress stats), never the queue ordering. Pools stay a filtering/labels/UI layer only, since the no-due-date design already produces natural prioritization without a hard split.

---

## 10. Per-tier queues (no due dates)

| Tier   | Eligible when                                | Sort by                          | Notes                            |
| ------ | -------------------------------------------- | -------------------------------- | -------------------------------- |
| Read   | always                                       | lowest exposure count / lowest F | or content order                 |
| Review | ≥1 Read done (S_r ≠ null after first grade)  | R_r(t) ascending                 | most at-risk of forgetting first |
| Quiz   | ≥1 Read done (S_g ≠ null after first answer) | R_g(t) ascending                 | most at-risk of forgetting first |

This isn't a separate rule to enforce — it falls directly out of Sections 4b/5's nullable-state design. A term with no S_r simply has no `R_r(t)` to rank by, so it can't appear in the Review queue; same for Quiz. No manual gating logic needed beyond "don't rank what you can't compute."

Nothing is ever locked or overdue for terms that _are_ eligible. Opening a tier the user hasn't touched in weeks just surfaces its weakest terms first.

---

## 11. Default parameters (starting point — tune from real usage data)

| Param                      | Value         | Meaning                                  |
| -------------------------- | ------------- | ---------------------------------------- |
| w_f                        | 0.3           | familiarity growth rate                  |
| k                          | 0.5           | exposure diminishing-returns rate        |
| cap_F                      | 0.35          | max mastery contribution from Read alone |
| λD, λS                     | 2, 0.5        | cold-start nudge from familiarity        |
| P(correct\|knows)          | 0.95          | quiz slip allowance                      |
| P(correct\|guess) MCQ / TF | 0.25 / 0.50   | guess-rate correction                    |
| k_g                        | 15            | posterior → stability scale              |
| wF, wR, wG                 | 0.2, 0.5, 0.3 | mastery blend weights                    |
| known / unknown threshold  | 0.8 / 0.6     | pool hysteresis                          |
| cooldown R threshold       | 0.98          | same-session repeat suppression          |

---

## 12. Open items to validate once you have data

- wF/wR/wG weights and cap_F are reasoned defaults, not fit — revisit once you have real pass/fail logs.
- Recognition-vs-recall gap (how much lower S_g tends to run vs S_r) should get measured per-user over time rather than assumed.
- Familiarity decay shape (currently a simple hyperbola) could be replaced with something fit to actual re-Read behavior once you have it.
