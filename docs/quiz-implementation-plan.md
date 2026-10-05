# Quiz question redesign: implementation plan

Implements [quiz-question-design.md](quiz-question-design.md). This page is
only about code structure and rollout. PR 1 (foundation and vocabulary) is
built, and so are typed answers (PR 2) and AI mode on the registry (PR 3).

## Design rules

- Pure core, thin edges. Masking, template selection, building and grading
  never import Supabase or React.
- One place per decision. A fact about a question lives in one module and
  everything else reads it.
- Extending means adding a module and one registry line, not editing switches.

## The model: template and interaction

A question carries two separate facts.

- **template**: what it asks (`definition_to_term`, `term_to_meaning`,
  `masked_example`, `does_it_fit`, and the web-only vocabulary templates
  `typed_cloze` and `typed_meaning_to_word`). Both kinds share
  a template when the question is the same; `templates/copy.ts` holds the
  kind-specific wording ("Which term…" vs "Which word or phrase…"), and
  `does_it_fit` is field terms only. Drives feedback copy and AI guidance.
  AI-written questions carry the same template ids.
- **interaction**: how it is answered (`choice`, `boolean`, `text`). Drives
  grading, keyboard handling, the answer UI and the TRACE question type
  (`multiple_choice`, `true_false`, `typed`).

`QuizQuestion` becomes a union by interaction, each with `template` and
`termId`. Nothing detects a template from prompt text (today's
`feedback.ts` does).

## Module layout (`lib/quiz/`)

| Path                      | Responsibility                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `types.ts`                | `QuizTerm` (with `kind`, `category`), question union, `QuizResponse`, template ids                          |
| `text/mask.ts`            | Whole-word, case-insensitive masking and whole-word check                                                   |
| `templates/<id>.ts`       | One per template: `eligible`, `build`, `feedback`, `kinds`, `channels`                                      |
| `templates/copy.ts`       | Kind-specific question wording                                                                              |
| `templates/choice.ts`     | Shared helpers for choice templates (candidate picking, shuffling)                                          |
| `templates/registry.ts`   | Template list, `templatesFor(kind, channel)`, feedback and boolean labels                                   |
| `plan.ts`                 | `orderTemplates`: eligible templates for a term in weighted random order                                    |
| `mix.ts`                  | Template weights, distractor counts, AI true/false cap, each with its reason                                |
| `distractors.ts`          | `DistractorSource` interface                                                                                |
| `distractors-supabase.ts` | The only Supabase implementation (related terms first, then same collection)                                |
| `build.ts`                | `buildQuiz(terms, source, channel, rng)`: try templates in plan order, fall back to the definition question |
| `grade.ts`                | `gradeAnswer(question, response)`: one switch on interaction                                                |
| `trace-type.ts`           | Interaction to TRACE `QuestionType`                                                                         |
| `question-schema.ts`      | `isQuizQuestion`, guarding both saved-session stores                                                        |
| `terms.ts`, `mappers.ts`  | Quiz pool plus a `domains.kind` lookup (no `TermCard` or RPC change)                                        |

`generate-simple.ts` is `buildQuiz` wired to the Supabase source. `illustration.ts`
is gone. A term is picked per its own collection's kind, so mixed quizzes work.

## Edges

- **Web UI.** One answer component per interaction (`choice-answer.tsx`,
  `boolean-answer.tsx`), chosen in `quiz-answer-choices.tsx`. The answer
  reducer holds a `QuizResponse`, and the keyboard helper returns one. Typed
  input (PR 2) pauses digit shortcuts, as `isTextEntryTarget` already does.
- **Telegram.** Uses `buildQuiz(..., "telegram")`, so templates that don't list
  `telegram` in `channels` are never picked. The built questions are stored in
  the session, and `quiz-session-flow.ts` renders from them through
  `quiz-options.ts`, which turns a question into tappable options and their
  responses. Long answers are listed in the message with numbered buttons.
  The "category / collection" header line is gone.
- **Pool.** `lib/quiz/terms.ts` looks up `domains.kind` for the picked terms.
  The quiz pickers copy each term's recognition posterior and test count onto
  the card (`withRecognition` in `lib/trace-queue/pick-terms.ts`), so no extra
  query is needed.
- **Saved sessions.** Web uses the storage key version (`v2`, the old key is
  removed on load) and validates questions with `isQuizQuestion`. Telegram
  stores `version: 2`. Old sessions are dropped, not migrated.

## AI mode

- `plan.ts` assigns a template per term, the same as simple mode.
- The prompt builder takes the kind and the plan. It includes the shared tone
  rules once, a short kind section, and `aiGuidance` only for the templates
  that appear in the plan. It sends only the fields each template needs.
  Input tokens stay flat as templates are added.
- The response schema is built from the plan's templates, as it is today from
  slots.
- Typed templates are never sent to the model. They come from the
  deterministic builder, since the stored word is the answer.

## AI mode, as built

- `plan-ai.ts`: `planAiQuiz` orders templates per term with the simple quiz's
  weighted `orderTemplates`, but a template the model can write (`ai` spec) is
  eligible for any term of its kind, with no example needed. Templates the model
  can't write (typed) are built there, so the model is only asked for, and only
  charged for, the rest. Booleans come only from `does_it_fit`, so there is no
  separate true/false cap.
- Each model-writable template declares an `ai` spec: whether the model writes a
  quote, kind-specific guidance, and `finish`, which turns the model's raw fields
  into the final question (shared wording from `templates/copy.ts`, the term
  masked, the right option set to the real term name).
- `generate-prompt.ts` sends each term's id, template, name and definition
  (capped at `AI_DEFINITION_MAX_CHARS`), the intro of the kinds present, and
  guidance only for the templates present. `schema.ts` locks the shape per slot
  and adds a `quote` field only where a template writes one.
- `generate.ts` assembles the quiz: built questions, model-written ones, and a
  simple question for any term the model failed on. `actions.ts` plans first and
  charges `quizCost(plan.slots.length)`; with no slots there is no run guard, no
  charge and no model call.

## Rollout

Three PRs. Foundation and vocabulary ship together so vocabulary collections
never sit on field-term templates.

1. **Foundation and vocabulary.** Kind plumbing, model, registry, masking,
   plan, `mix.ts`, the injected distractor source, all MCQ and boolean
   templates for both kinds (field terms and vocabulary), category-aware
   distractors, shared-gloss handling, web UI refactor, Telegram on the
   shared builder, session versioning. "None of these" and prompt-text
   detection are removed.
2. **Typed.** `text` interaction, typed templates, strength gate, TRACE
   `typed` type: migration for the check constraint, a guess-rate constant, a
   [trace.md](trace.md) note. The constant is in its own commit for review.
3. **AI mode.** Registry-driven prompt and schema.

Each PR ends with `pnpm check`. Any change to `lib/trace/` constants gets
explained in the PR, as it does today.

## `mix.ts` starting values

The author proposes the first values, each with a one-line reason next to it
in the file, and retunes them later. They live only in `mix.ts`. The values to
set are: the share of each template within a kind, the "Does it fit?" share
(kept small because it has a 50% guess rate), the recognition-strength
threshold for typed questions, and the 3-word cap. The threshold is checked
against real data in PR 2 before it ships.

## Tests

- Unit tests per template (eligibility and build, with a stub source), plus
  `mask`, `answer-match`, `plan` and `grade`. These are cheap because the core
  is pure.
- A coverage test over the seed: how many Dutch terms get an exact-match
  cloze.
- Existing quiz and Telegram tests are updated, not deleted.

## Out of scope

Typed answers in Telegram, typo tolerance, changes to Review or Read, and any
change to TRACE constants other than the new `typed` guess rate.
