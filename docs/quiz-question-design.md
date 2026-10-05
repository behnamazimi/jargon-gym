# Quiz question design by collection kind

Design agreed before implementation. Nothing here is built yet. Today simple
mode builds two shapes for every collection (`lib/quiz/generate-simple.ts`,
`lib/quiz/illustration.ts`) and ignores whether a collection teaches field
terms or a language (`lib/terms/kinds.ts`).

## Problems with today's quiz

- "Which term does this show, or none?" can be answered by matching text when
  the example contains the term (as in the Dutch screenshot that prompted this
  work), and for words the question makes little sense.
- "None of these" (the anti-example answer) has no meaning for vocabulary.
- Nothing tests production. Vocabulary learners need to produce the word, not
  just pick it.
- AI mode (`lib/quiz/generate-prompt.ts`) says "vocabulary quiz" and "real
  jargon" for every collection.

## What the industry does

- Language apps (Duolingo, Clozemaster, Quizlet) test words in both
  directions, in a sentence with a blank, and by typing. Recognition and
  production are separate skills and transfer between them is weak, so
  typing is the strongest test.
- Field-terminology learning favours applying a term to a case over restating
  its definition.

## Principles

- Question types depend on the collection's `kind`. `QuizTerm` gets a `kind`.
- Where kinds can share a shape, they do: both get a masked-term example.
- A term is masked wherever it would give away the answer: in the definition
  (Definition → term), in the example (Scenario → term, Cloze) and in the
  other terms' definitions shown as options (Term → meaning). Match whole
  words, case-insensitive. An example that only holds a changed form of the
  term is not used as a masked example.
- Masking does not apply to "Does it fit?": the term is the subject of the
  question there, so the stem names it. The example text itself is shown as
  written.
- Two terms in one collection can share a gloss ("to walk" for `lopen` and
  `wandelen`). For Meaning → word, either the colliding term is dropped from
  the options and accepted as an answer, or the question is skipped for that
  term. Decide at build time; both typed and MCQ versions must handle it.
- A quiz can span several collections, so the type is chosen per term from its
  own collection's kind, not per session.
- Anti-examples are used only by "Does it fit?". "None of these" is removed.

## Field terms (`terms`)

| Type              | Format                                                                                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Definition → term | MCQ, term masked in the definition                                                                                                                                                 |
| Term → meaning    | MCQ, options are other terms' definitions                                                                                                                                          |
| Scenario → term   | MCQ on an example with the term masked                                                                                                                                             |
| Does it fit?      | Yes/No on an example or anti-example; small share. Reuses the `true_false` question type (50% guess in TRACE), which simple mode had dropped on purpose (`lib/quiz/mix-ratios.ts`) |

No typed answers for field terms.

## Vocabulary (`vocabulary`)

| Type                 | Format                                                              |
| -------------------- | ------------------------------------------------------------------- |
| Word → meaning       | MCQ                                                                 |
| Meaning → word       | MCQ, distractors from the same category when the collection has one |
| Cloze                | MCQ on an example with an exact-match term blanked                  |
| Typed cloze          | Same blank, the learner types the word                              |
| Typed meaning → word | Fallback when the term has no usable example                        |

## Typed answers

- Only for terms of up to 3 words. Longer entries stay MCQ. The gloss can be
  any length because it is only shown.
- Which question a term gets depends on how well the learner knows it
  (recognition strength): less known → MCQ, better known → typed. Neither
  `TermCard` nor `QuizTerm` carries that strength today, so the quiz pool has
  to load it. Caveat: the Quiz queue serves the lowest recognition
  retrievability first (and untested terms before everything), so a typical
  session is mostly weak terms and typed questions will be rare. Pick a
  strength threshold deliberately and check what share of questions it
  produces on real data.
- Grading is forgiving on case and spacing only. Accents and articles count;
  no typo tolerance. When the only difference is accents or a leading
  article, the answer is still wrong but the feedback says so.
- A term qualifies once its recognition posterior is at least 0.7, it has been
  quizzed at least once and it has at most 3 words (`lib/quiz/mix.ts`).
  Typed meaning → word is skipped when another term in the collection has
  the same definition.
- Web only. The Telegram quiz uses the MCQ types and skips typed ones.
- Built: typed answers use their own `typed` question type with a 0.05 guess
  rate (migration `20261009100000_review_events_typed.sql`). The options below
  are kept for the record.
- TRACE is not unchanged by this. `applyQuizAnswer` takes a `QuestionType`
  (`multiple_choice` | `true_false`), the recognition update uses a
  guess-rate per type (`P_CORRECT_GIVEN_GUESS_MCQ` 0.25, `_TF` 0.5), and the
  `review_events.question_type` column has a check constraint on those two
  values. Two options, to be chosen before building:
  1. Log typed answers as `multiple_choice`. No migration or constant, but a
     typed pass counts like a 1-in-4 guess, which understates it.
  2. Add a `typed` question type: a migration for the check constraint, a new
     guess-rate constant (near zero) and a note in [trace.md](trace.md). The
     constant is the owner's call.
     Cloze MCQ and the word/meaning MCQs stay `multiple_choice`.
- The expected answer ships to the browser with the question, like
  `correctOptionIds` does today, and is graded client-side. Typed answers
  follow the same model; nothing new is exposed.

## AI mode

Same named types per kind. One prompt builder takes the kind and swaps in a
kind-specific section (rules, distractor guidance, tone) rather than becoming
two prompts. Wording of the plain-language tone rules stays shared.

## Open (author's call at build time)

- Mix ratios between types and the share of "Does it fit?". A per-term
  precedence rule is also missing: for example, vocabulary picks typed if the
  term is strong enough and has at most 3 words, then cloze if it has an
  exact-match example, else meaning → word or word → meaning at random.
- How many vocabulary terms have an exact-match example. Inflected verbs
  (`lopen` / "loop") fail the exact match, so run the check on the Dutch
  seed and on real collections before relying on cloze.
- Typed grading edge cases: Unicode normalisation (NFC) so a composed and
  decomposed accent compare equal, and nouns stored with an article
  ("het licht") where the learner may type only "licht".
- Category-aware distractor selection for vocabulary: `category` exists on
  terms, so `lib/quiz/distractors.ts` can prefer the same category.

## Touchpoints

`lib/quiz/types.ts`, `generate-simple.ts`, `illustration.ts`, `distractors.ts`,
`generate-prompt.ts`, `schema.ts`, `grade.ts`, `mappers.ts`, the quiz UI for
the typed input, and the quiz action's `questionType`.

- `kind` lives on `domains`, but `TermCard` (from the `get_term_card` RPC) has
  no `kind` and no recognition strength. The quiz pool must carry both, which
  may mean an RPC or query change.
- Telegram builds its own questions in `lib/telegram/quiz-session-store.ts`
  (calls `buildIllustrationQuestions`) and `quiz-session-flow.ts` (calls
  `selectDistractorsFromDomain`), not in `quiz-flow.ts`. Removing "None of
  these", adding masking and per-kind types has to land there too, and its
  Edge Function runtime must be able to import any new shared code.
- Update [trace.md](trace.md) if the question types or guess rates change.
