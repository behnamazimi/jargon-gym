<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# UI components

Use DaisyUI components.

# Comments

Write code that is self-explanatory. Add comments only when they are
necessary. Any comment you add should be in plain language and not overkill.

# Validating changes

After finishing a change, run `pnpm check` (lint + format check + type-check + knip) and fix anything it flags before considering the change done.

# Scoring engine (TRACE)

Read, Review, and Quiz are all driven by TRACE, the scoring engine that
picks which term to show next and computes mastery
(`lib/trace/`, `lib/trace-queue/`, `lib/terms/review-outcome.ts`, and the
Read/Review/Quiz server actions). When a task requires actually understanding
how it works — the memory traces, mastery blend, ranking rules, or which
layer owns what — read [docs/trace.md](docs/trace.md) in detail rather than
guessing from the code alone.

# AI overview

[docs/ai.md](docs/ai.md) is the single map of every AI feature: vendors,
access rules, cost levers and narration. Start there.

# AI credits

AI Quiz and Stories run on the user's own key when they have one, and
otherwise on the app's key (`CENTRAL_LLM_API_KEY`), spending AI credits. The
resolver is `lib/llm/access.ts`; charging, refunds and cost math are in
`lib/ai-credits/`; the ledger, balance and admin functions are in
`supabase/migrations/20260929120000_ai_credits.sql`. Credits are charged before
the model call and refunded on any failure. Read
[docs/ai-credits.md](docs/ai-credits.md) before changing balances, costs or
the charge flow.

# Admin panel

The admin area (`/admin`) is in `app/(private)/admin/`, `lib/admin/`,
`components/admin/` and `hooks/use-admin-*`. Read [docs/admin.md](docs/admin.md)
before adding an admin page or action: every page calls `requireAdminPage()`,
every action goes through `runAdminAction`, and direct writes record an audit
row through `writeAudit`.

# Stories

Read's Stories mode lives in `lib/stories/` (prompt, generation, parsing
the model's plain-text reply in `markup.ts`, style and setting pickers,
repository, narration) with its page, actions, and components under
`app/(private)/app/read/stories/` and `components/read/stories/`.
It credits reads through `recordRead` like Cards; see the Stories section in
[docs/trace.md](docs/trace.md).

# Telegram bot

The Telegram bot's app-side logic lives in `lib/telegram/`: `flows.ts` is
the update router (dispatches commands/callbacks, does not itself contain
command logic), `commands.ts` parses and handles top-level commands,
`delivery-flow.ts` / `quiz-flow.ts` / `review-flow.ts` hold the Read/Quiz/
Review flows, `presentation.ts` + `copy.ts` format outgoing messages, and
`transport.ts` builds the `TelegramAction` DTOs that get sent. It calls the
same `lib/terms/review-outcome.ts` and `lib/trace-queue` functions the web
app uses, so scoring behavior stays identical across both surfaces. The
Supabase Edge Functions that actually receive/send Telegram HTTP traffic are
in `supabase/functions/telegram-webhook` and
`supabase/functions/telegram-send-due`; see
[docs/supabase/telegram-setup.md](docs/supabase/telegram-setup.md) for setup
and the manual test matrix.

# Guided tour

Every account gets short per-page tips ("chapters") until it has seen them
all or skipped them. The steps are plain data
in `lib/tour/chapters/` (grouped by area); `lib/tour/state.ts` decides what
shows, and `components/tour/` renders it (a React Aria `Popover` plus a
ring). Chapters on the same page run in the order listed: back to back on
Library, one per visit elsewhere. Once Library's tips are done, the tour
points at the next page's nav link (`lib/tour/walk.ts`) and the user clicks
it themselves. To
add a chapter, add an entry to the matching area file, add any new target ids to
`lib/tour/targets.ts`, and put `data-tour="<id>"` on the element. Feature
components only carry that attribute and never import tour code. Progress
lives in `user_settings.tour_status` / `tour_seen`.

# Library (/app/library)

The Library's layout (`app/(private)/app/library/layout.tsx`) holds the
collection sidebar, and the page loads one collection. Switching collections
is a plain `?domain=` link, so only the page reloads. The page sends a lean
row per term (`LibraryTerm`, from `lib/library/load.ts`). Full details
load in batches from `GET /api/terms/details` as rows near the screen
(`lib/library/details-store.ts`). Marking known and deleting don't
revalidate the page. They record a local edit in
`lib/library/overrides.ts`, which wins over any older server snapshot,
so call `overrideMarkedKnown` wherever a term is marked known. Filters live in
the `lb_lib_filters` cookie so the server renders them.

# Import

Adding terms (chooser, paste importer, commit, unfinished terms) is described
in [docs/import.md](docs/import.md). Parsing lives in `lib/import/parse/`
and stays pure. Nothing in this path may call an AI model. A term needs only
its name; terms without a definition are excluded from everything TRACE and
every delivery surface serve.

# Capture

Saving one term (`/app/capture`, `lib/capture/`,
`components/capture/`) is described in the Capture section of
[docs/import.md](docs/import.md). It reuses `createTerm`; no AI runs in it.

# Loves and reports

Members love and report shared collections; admins take them down. Read the
"Shared collections: loves, reports and takedowns" section of
[docs/admin.md](docs/admin.md) first. Shared reasons and copy live in
`lib/collections/moderation.ts`, and no user-facing string may name the admin.

# Collection requests

People can request a collection; the admin builds it by hand and delivers a private
copy to each requester. It lives in `lib/requests/`, `lib/admin/requests/`,
`components/requests/`, `components/admin/requests/` and `app/(private)/admin/requests/`.
Read the Requests section of [docs/import.md](docs/import.md) before changing it. No AI
runs in this path, and no user-facing string may name the admin or imply automation
(`lib/requests/copy.ts` and its test enforce the list).

# Page promos

Banners that point at a page the user hasn't visited live in `lib/promos/`
and `components/promos/`. Read [docs/promos.md](docs/promos.md) before adding
a promo or mounting the slot on a page.

# Public pages

Content pages (About, How terms are built, Before you sign up, Privacy,
Terms) are MDX in `content/pages/`. The route's `page.tsx` keeps the
metadata, imports the MDX and renders it in `ShowcasePage` (title, lead,
scene, closing CTA) or `LegalPage`, passing `showcaseProse` or `legalProse`
from `components/content/mdx-prose.tsx`. Write plain Markdown; don't put
classes in MDX. Shared pieces for public pages live in `components/public/`.
Public pages are cached, so the server always renders the visitor CTA and
`PublicCta` swaps it in the browser for signed-in users (on a collection it
asks `/api/collections/[id]/membership` and offers Add or Open in library).

Public collection pages (`app/collections/`, `components/collections/`) are
built from data for every public collection: the hero reads the collection's
`kind` (`lib/terms/kinds.ts`), terms show as cards grouped by category, and the
index shows each collection by one of its terms (`lib/collections/pick.ts`
picks it, stable per slug). Optional copy or a pinned term goes in
`lib/collections/showcase-overrides.ts`. The seed has two public samples
(`standup`, `dutch-basics`) for checking these pages locally.

Search metadata: collection and term pages carry JSON-LD (`lib/seo/json-ld.ts`,
rendered with `components/seo/json-ld.tsx`), and public pages get generated
share images from `lib/seo/og/specimen-image.tsx` (fonts in `assets/fonts/`).
An `opengraph-image` outside `/collections/` must be added to the proxy's
public paths, or crawlers are sent to the login page.

# Illustrations

Hand-drawn doodle illustrations live in `components/illustrations/`. Scenes
(`scenes/`) are built only from the shared primitives: `Illustration` (the
svg shell, wobble filter and hatch patterns), `Shape` / `Line` / `Hatch`,
`Clip`, the doodles in `marks.tsx`, and the seeded path builders in
`geometry.ts`. Colours come only from `palette.ts`; the values and all motion
live in `illustrations.css`. They're decorative and hidden from screen
readers unless you pass a `title`. Reusable status scenes: `NotFoundScene`,
`SomethingWentWrongScene` and `OfflineScene` (pass them as `illustration` to
`StatusPage`), `PreparingScene` for waits while something is generated,
`EmptyBoxScene` for empty collections and term lists, `CaughtUpScene` for
"nothing left to study", and `QuizCheerScene` / `KeepTrainingScene` for quiz
results (`EmptyState` and `QuizCenteredState` take them as `illustration`).

Keep new ones consistent with the existing scenes:

- Look: thick ink outlines with flat fills that print slightly off the
  outline (`Shape` does both; the wobble filter adds the marker jitter). Blue,
  coral, yellow and purple on paper, small hatch patches for texture. No
  text, gradients or shadows.
- Characters: one-colour blob or bean bodies, stick limbs, dot eyes and a
  one-line mouth. Quirky and minimal, no extra details. Every character is a
  lobya; the named ones are Lobyaq (blue), Lobyar (coral) and Lobyare
  (purple), introduced on the About page.
- Scene: 800×600, one idea that pictures the section's message, subject
  centred with plenty of white space, a few sparks, squiggles or dots around
  it. Check it still reads at phone width.
- Motion: wrap a part in `<Motion kind=…>` (`motion.tsx`). Every character
  acts out its job in a short story (read, flip, throw, sip), not random
  wiggles; moves that belong together share a beat; loops pause before
  repeating. Reduced motion turns it all off.

# macOS widget

The widget's source lives in `widget/lobyas.widget/` (`index.jsx` +
`read-state.sh` / `reveal-term.sh` / `advance-term.sh`), with its app-side
counterparts in `lib/widget/` and `app/api/widget/`. Any change to the
widget's logic must bump the version in [widget/version.json](widget/version.json) —
`lib/widget/version.ts` and `scripts/widget-zip.sh` both read it as the
single source of truth for the widget's release counter.

# Brand

The product is "Lobyas" in prose and UI, "lobyas" in identifiers, slugs and
keys. User-facing copy says "terms", not "jargon". The request kind "Jargon",
the quiz prompt's "real jargon" and "a new job's jargon" are the only literal
uses. `lib/requests/copy.test.ts` fails if "jargon" appears elsewhere in the
request copy, and `content/pages/copy.test.ts` does the same for content pages. Public
pages of a `vocabulary` collection say "words and phrases" instead of
"terms".
