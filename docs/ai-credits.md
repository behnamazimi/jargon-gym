# AI credits

AI quizzes, Stories and story narration need paid services. AI credits let every
account use the app's own keys for them. When the credits run out they can top
up. This page explains who pays for a request, how a price is set, how the
balance works, and where the logic lives.

## Who pays for a request

Each AI request resolves to one of two outcomes:

1. **AI credits.** The app's key is set up, credits are switched on, and the
   balance covers the price. The app's key is used and the request spends
   credits.
2. **Unavailable.** None of the above. The screen offers a top-up when the
   credits are used up, and says AI isn't available otherwise.

Users can't bring their own key. If `CENTRAL_LLM_API_KEY` isn't set, outcome 1
never happens for quizzes and Stories. The code is in `lib/llm/access.ts`.

Simple quizzes, Read, Review and term narration never use credits.

## What things cost

A price is a base plus a rate per unit, rounded up to whole credits and never
below 1:

```
price = ceil(base_credits + credits_per_unit × units ÷ unit_size)
```

| Action            | Unit                      | Base | Rate per unit | Examples                             |
| ----------------- | ------------------------- | ---- | ------------- | ------------------------------------ |
| `quiz`            | question the model writes | 0    | 1             | 10 questions cost 10                 |
| `story`           | term used                 | 2    | 0.5           | 3 terms cost 4, 6 cost 5, 10 cost 7  |
| `narration_story` | 1,000 characters          | 0    | 7.5           | 524 characters cost 4, 1,737 cost 14 |

The rows live in `credit_prices`. A price changes by adding a row with a later
`effective_from`; older spends keep pointing at the row that priced them
(`ai_credit_ledger.price_id`). `unit_cost_usd` and `margin` on a row only record
why the price was chosen; the charge never reads them. The database function
`ai_credit_price` computes the price, and `lib/ai-credits/costs.ts` mirrors it
so the screens can show the price before the request.

A quiz costs one credit per question the model writes. Every term picked gets a
question, but a term that is ready to be typed gets a typed question built
without the model, and that one is free, so the cost shown when setting up a
quiz is a maximum. The quiz is planned, and the charge set, before the model
runs. If the model fails on some terms, those get a simple question and the
amount stays charged; if it fails on all of them, nothing is charged.

The setup screens show the cost before you press Generate. If a request costs more than the balance, or
the credits are gone, a calm notice appears above the main button
(`CreditGateNotice`) instead of a red error. It says what is missing and offers
a smaller version: "Make it N questions" for a quiz, "Make it Short instead" for
a story. The server never trims a request on its own.

When the person is eligible for the free top-up, the notice says so ("You're
eligible for 30 free credits.") and the main button becomes **Get 30 free
credits**. Taking it never starts the request, so credits are never spent by
surprise. Eligibility comes from the server: `my_self_topup_state()` mirrors the
checks in `my_self_topup_ai_credits` (switched on, balance under the policy's
limit, nothing taken yet this UTC day), and `getMyCreditState` returns it as
`topUp`. Screens read `ai.topUp` and never guess. After today's top-up they say
more can be claimed tomorrow. `lib/ai-credits/gate.ts` picks the case. The same
rule applies to the Listen button on a story, Settings and the account menus
("free credits available").

## How the balance works

The balance is never stored. It is calculated from an insert-only ledger
(`ai_credit_ledger`), so it can't drift and history is never lost. Credits enter
as **lots**:

- A `grant` row is a lot. Its `source` says where it came from: `starter`,
  `monthly`, `self_topup`, `admin`, `reset`, or `opening` (the balance people
  had when lots began).
- A `refund` row is a lot too (see Charging and refunds).
- A lot has an optional `expires_at`. Null means it never expires.
- A `spend` row takes credits from lots through `ai_credit_allocations`, one
  allocation per lot used. A database check refuses to take more from a lot than
  it holds.
- An `expire` row writes off what was left in one lot, either because it lapsed
  or because an admin reset it. Each lot is written off once.

What is left in a lot is its amount minus its allocations minus its `expire`
row. The balance is the sum over lots that haven't expired.

Spending takes from the lot that expires soonest, then the oldest lot, with
lots that never expire last. Nothing is ever taken from a lapsed lot.

Rows before the cutover (`ai_credit_settings.lots_after_id`) belong to the
earlier two-pool model and are history only. The migration gave each person
opening lots equal to what the old balance function said they had left.

### Settling

`_ai_credit_settle` is the one function that writes on a person's behalf besides
a spend, refund or admin action. Under the per-user lock it adds the grants that
are due (a policy that applies to the account, is in effect, and has no lot for
this period) and writes `expire` rows for lots that lapsed. Reserve, refund,
top-up and the admin writers all take the same lock, so two requests at once are
handled one after the other.

Reading the balance (`ai_credit_balance`) never writes. It counts due grants that
aren't written yet, so a new month shows its credits before the first spend.

A recurring lot is created in full the first time it is needed, even late in the
month, and lapses at month end. It isn't prorated.

## Free tier

Grant policies (`credit_grant_policies`) decide who gets credits, how much, how
often, and when they lapse. They are rows, so changing them needs no deploy.

| Policy         | Amount | Rule                                                                       |
| -------------- | ------ | -------------------------------------------------------------------------- |
| Starter        | 50     | Once per new account, never expires                                        |
| Monthly refill | 20     | Each UTC month for new accounts, lapses at month end                       |
| Self top-up    | 30     | Everyone: once a UTC day, only under 10 credits left, lapses after 90 days |

Accounts that existed at the cutover keep their own terms: their opening lots,
and the monthly refill they had (30 by default), starting the month after the
cutover. A policy is changed by closing it (`effective_to`) and adding a new
one. The key that stops a double grant is the person, the source and the
period, so changing a policy mid-month never regrants the running period.

The top-up is a temporary measure until payments exist. Ending it is setting
`effective_to` on its policy.

## Charging and refunds

A request is charged before the model is called and refunded if it fails. The
`reserve_ai_credits` database function takes the per-user lock, settles, prices
the units, checks the balance, and writes the spend and its allocations in one
step. Two requests from the same user at the same moment can't both pass the
check. If the balance is too low, nothing is written for the spend and the
person sees what the request costs and what they have. The balance never goes
below zero.

If anything fails after the charge, the spend is refunded. That covers a
provider error, an unparseable reply, a timeout, and a failure while saving a
story. Credits only stay spent for a quiz or story the user actually received.
Retries inside one attempt never charge twice.

A refund adds one new lot per lot the spend drew from, for the same amount. A
refund never edits history. If the source lot never expired, the refund lot
doesn't either; otherwise it lasts until the source lot's expiry or 30 days
from now, whichever is later. If an admin reset wrote the source lot off, that
part isn't refunded. Refunding twice is harmless: there is one refund row per
spend and lot. A spend from before the cutover has no lots, so it is refunded
once, whole, as a 30-day lot.

Each refund records a short reason in the refund rows' `note`, such as
`Provider error 429: Quota exceeded` or `StoryGenerationError: ...`. When an
error wraps another one as its `cause`, as Stories' errors do, the note
describes the original. The reason comes from the error, is cut to about 200
characters, has anything that looks like a key removed, and never includes a
prompt or what the user wrote. The first reason stays if a refund is attempted
twice.

Stories give up after 45 seconds, so a slow model is reported and refunded
before the platform's 60-second limit ends the request. AI quizzes have no such
limit of their own.

One case isn't covered. If the server process dies between the charge and the
refund, for example when a quiz runs past the platform's time limit, the
credits stay spent. Nothing marks these spends. If this turns out to matter, a
later change can add a "settled" marker to spends and a job that refunds ones
that never settle.

The code is in `lib/ai-credits/charge.ts` and `lib/ai-credits/repository.ts`.

## Story narration

Making the audio for a story costs credits, because the narration provider
charges by the character. Only the request that starts the clip pays:

- The person presses Listen, and the player POSTs to
  `/api/stories/[storyId]/narration`.
- `getOrCreateAudio` finds the clip ready, or being made by someone else, and
  returns it without charging anyone.
- If the request wins the claim on the clip, it calls the `beforeGenerate`
  option with the length of the spoken text. `lib/stories/narration-billing.ts`
  reserves the credits then. If the balance is too low the route answers 402 and
  no provider is called.
- If the clip isn't made (provider error, or the job was replaced), the credits
  are refunded.

The price is shown on the Listen button, computed from the stored text with the
same function the server uses (`lib/stories/script.ts`). The code under
`lib/ai/speech/` and `lib/narration/` knows nothing about credits: the charge is
passed in from the route. `lib/ai/narration-isolation.test.ts` still keeps
credits code out of them, and out of term narration and the admin bulk sync,
which are never charged. The daily cap on story clips still applies on top of
credits.

## Recording what a call cost

After a charged call, the action stores what it really cost in
`ai_credit_costs`, one row per spend: provider, model, input, output and
reasoning tokens (or characters for narration), the number of calls (retries
show here) and `cost_micro_usd`. The rates are in `lib/ai-credits/provider-cost.ts`
and `speech-cost.ts` and are estimates from published rates; check them against
invoices. The Gemini rate doubles on January 1, 2027. A failure to record never
fails or refunds the action. This is how the prices above can be checked against
real cost.

## What users see

The account menu, and the More sheet on phones, show one plain line under the
email: how many credits are left, or that the credits are used up. The line is
hidden when credits aren't offered. The balance is looked up only when the menu
opens, so ordinary page loads don't pay for it. The line links to the AI section
of Settings.

## Setting it up

Set these server-only environment variables, listed in `.env-template`:

- `CENTRAL_LLM_API_KEY`: the app's key. Leave it empty to switch AI credits off.
- `CENTRAL_LLM_PROVIDER`: `google` (the default) or `anthropic`.

Apply the migrations before you set the key. If the key is set on a deployment
that doesn't have the migrations yet, the balance lookup fails and users see the
same "AI isn't available" screens as before. Apply the two credit lots
migrations with no AI request in flight (the run guard times out after 70
seconds), so no charge or refund straddles the cutover.

When someone uses AI credits, the terms, their definitions, and any outline the
person writes are sent to the app's AI provider. The AI credits panel in
Settings (`components/settings/llm-panel.tsx`) says so. The privacy page names
the providers and says the term content needed is sent, but doesn't mention
outlines. The sign-up page says nothing about AI.

The models are set in `lib/llm/model.ts`. We recommend setting a monthly budget
cap in the provider's console as a backstop.

## Changing settings and helping a user

Admins manage AI credits at `/admin/ai/credits`, reached from AI in the admin
sidebar (see [admin.md](admin.md)). There you can switch AI credits on or off
and change what new accounts get (starter and monthly credits), the top-up
amount, and the prices (quiz per question, story base and per term, narration per
1,000 characters). Saving closes the policies and adds new price rows as needed;
it never rewrites history. Policies kept for accounts that existed at the
cutover aren't touched by the form.

**Grant** adds a lot to someone's balance by email, with an optional expiry.
**Reset** restores a person's free allowance: it writes off what is left of
their starter, monthly, top-up and opening lots and gives them fresh lots from
the policies that apply to their account. Admin grants and refunds are kept.
Both keep every record. Turning credits off also hides the Top up button.

If you ever need to work on them directly, use the Supabase SQL editor:

```sql
-- A price change: add a row, never edit one.
insert into public.credit_prices
  (feature, unit, unit_size, base_credits, credits_per_unit, effective_from)
values ('story', 'term', 1, 4, 1, '2027-01-01');

-- A grant, optionally expiring.
insert into public.ai_credit_ledger (user_id, kind, amount, source, expires_at, note)
values ('<user id>', 'grant', 50, 'admin', null, 'why');
```

## Checking that it works

The **Is it working?** section of the admin page shows how many people used
credits, or ran out, how many credits were spent, and how many requests failed
and were refunded in the last 24 hours. A warning appears when many recent
requests failed for more than one person, which usually means the app's key was
revoked or ran out of quota. **Why requests failed** lists the most common
reasons from the last 24 hours, with how many times each happened and how many
people it affected. The same numbers, and more, come from SQL. A refund has one
row per lot the spend drew from, so count `distinct refund_of` for failed
requests:

```sql
-- People who have had at least one quiz or story from credits.
select count(distinct user_id) from public.ai_credit_ledger l
where kind = 'spend'
  and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id);

-- People whose balance is empty right now.
select count(*) from public.users u
where (select remaining from public.ai_credit_balance(u.id)) = 0;

-- People who topped up themselves, and how much.
select user_id, count(*) as top_ups, sum(amount) as credits
from public.ai_credit_ledger
where kind = 'grant' and source = 'self_topup'
group by user_id
order by credits desc;

-- The most common failure reasons in the last day.
select coalesce(note, 'Unknown reason') as reason, count(distinct refund_of) as failures
from public.ai_credit_ledger
where kind = 'refund' and created_at > now() - interval '24 hours'
group by 1 order by 2 desc limit 10;

-- Total credits spent, leaving out refunds.
select coalesce(sum(amount), 0) from public.ai_credit_ledger l
where kind = 'spend'
  and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id);

-- What AI calls cost, by feature and month, against the credits charged.
select date_trunc('month', l.created_at) as month, l.feature,
       sum(l.amount) as credits, sum(c.cost_micro_usd) / 1e6 as usd
from public.ai_credit_ledger l
join public.ai_credit_costs c on c.spend_id = l.id
where not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id)
group by 1, 2 order by 1, 2;
```

## Feature settings

`ai_feature_settings` has one row per AI feature (`quiz`, `story`,
`narration_term`, `narration_story`): the on/off switch, who may use it
(`everyone`, `allowlist`, `admin`), a rolling 24-hour cap, and whether it is
billable. Prices live in `credit_prices`, not here. Only billable features
(`quiz`, `story` and `narration_story`) can be written to the ledger; the
ledger's foreign key and `reserve_ai_credits` both refuse the rest, so term
narration can never spend credits.

Quiz and Stories read their row before every request (`resolveAiAccess`). A
feature that is switched off is off for everyone, and admins can switch them on
the AI credits admin page. This is a separate lever from the credits switch,
which only stops use of the app's key. If the settings can't be read the request
goes ahead, so an app deployed ahead of its database keeps working; a missing
row means off.

## Running one request at a time

Quiz and Stories take a per-user, per-feature guard (`begin_ai_run`) around the
work, through the credits charge (`lib/ai/run-guard.ts`). It is taken before
credits are reserved, so a refused duplicate is never charged. It catches a
second tab or a direct duplicate request; clicks in one tab are already queued
by Next. A request killed by the platform frees the guard after 70 seconds, and
the user sees "busy" until then. If the guard can't be reached the request runs
without it. Story narration doesn't use it: winning the claim on the clip is its
guard.

## Topping up

When someone is out of credits, the quiz, Stories, Listen and Settings screens
show **Top up credits**. The database only allows it while they have fewer than
10 credits left (`topup_not_needed` otherwise) and once per UTC day
(`topup_already_today`). It calls `topUpAiCreditsAction`
(`app/(private)/app/actions-ai-credits.ts`), which runs
`my_self_topup_ai_credits()`. That adds a `grant` lot from the self top-up
policy with the note `self_topup`, writes an audit row (`self_topup_ai_credits`)
in the same transaction, and returns the new balance. Afterwards the person and
every admin get an email (`lib/ai-credits/topup-copy.ts`); a failed email never
fails the top-up.

There is no payment. The top-up sits behind this one action so a payment step
can replace it later without touching the screens.

## Where things live

- `supabase/migrations/20261018100000_credit_lots_schema.sql` and
  `20261018110000_credit_lots_functions.sql`: lots, allocations, prices,
  policies, cost records, and the balance, settle, reserve, refund, top-up and
  admin functions.
- `supabase/migrations/20260929120000_ai_credits.sql`: the original ledger and
  settings tables.
- `lib/ai-credits/`: price math (`costs.ts`), the charge wrapper, the database
  calls, and cost recording.
- `lib/llm/access.ts`: picks credits or unavailable.
- `lib/llm/central.ts`: reads the app's key from the environment.
- `app/(private)/app/quiz/actions.ts` and
  `app/(private)/app/read/stories/actions.ts`: charge and generate.
- `lib/stories/narration-billing.ts` and `lib/ai/speech/audio.ts`: charging for
  story narration.
- `supabase/migrations/20260929170000_ai_feature_settings.sql` and `lib/ai/`:
  feature settings, the billable rule, and the run guard.
- `supabase/tests/`: SQL checks for the balance, permissions, lots, and the
  concurrency guarantee. `credit_lots_opening_parity.sh` rewinds the local
  database and checks that the migration keeps every balance. Run them against
  a local database.
