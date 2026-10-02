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
(`lib/trace/`, `lib/trace-queue/`, `lib/jargon/review-outcome.ts`, and the
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
`app/(private)/jargon/read/stories/` and `components/jargon/read/stories/`.
It credits reads through `recordRead` like Cards; see the Stories section in
[docs/trace.md](docs/trace.md).

# Telegram bot

The Telegram bot's app-side logic lives in `lib/telegram/`: `flows.ts` is
the update router (dispatches commands/callbacks, does not itself contain
command logic), `commands.ts` parses and handles top-level commands,
`delivery-flow.ts` / `quiz-flow.ts` / `review-flow.ts` hold the Read/Quiz/
Review flows, `presentation.ts` + `copy.ts` format outgoing messages, and
`transport.ts` builds the `TelegramAction` DTOs that get sent. It calls the
same `lib/jargon/review-outcome.ts` and `lib/trace-queue` functions the web
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

# Library (/jargon)

The Library's layout (`app/(private)/jargon/(collection)/layout.tsx`) holds the
collection sidebar, and the page loads one collection. Switching collections
is a plain `?domain=` link, so only the page reloads. The page sends a lean
row per term (`LibraryTerm`, from `lib/jargon/library/load.ts`). Full details
load in batches from `GET /api/jargon/terms/details` as rows near the screen
(`lib/jargon/library/details-store.ts`). Marking known and deleting don't
revalidate the page. They record a local edit in
`lib/jargon/library/overrides.ts`, which wins over any older server snapshot,
so call `overrideMarkedKnown` wherever a term is marked known. Filters live in
the `jg_lib_filters` cookie so the server renders them.

# Import

Adding terms (chooser, paste importer, commit, unfinished terms) is described
in [docs/import.md](docs/import.md). Parsing lives in `lib/jargon/import/parse/`
and stays pure. Nothing in this path may call an AI model. A term needs only
its name; terms without a definition are excluded from everything TRACE and
every delivery surface serve.

# Capture

Saving one term (`/jargon/capture`, `lib/jargon/capture/`,
`components/jargon/capture/`) is described in the Capture section of
[docs/import.md](docs/import.md). It reuses `createTerm`; no AI runs in it.

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

# macOS widget

The widget's source lives in `widget/jargon-gym.widget/` (`index.jsx` +
`read-state.sh` / `reveal-term.sh` / `advance-term.sh`), with its app-side
counterparts in `lib/widget/` and `app/api/widget/`. Any change to the
widget's logic must bump the version in [widget/version.json](widget/version.json) —
`lib/widget/version.ts` and `scripts/widget-zip.sh` both read it as the
single source of truth for the widget's release counter.
