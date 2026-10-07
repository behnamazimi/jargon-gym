# AI credits

AI quizzes and Stories need a language model. AI credits let every account use
the app's own AI key for those two features. When the credits run out they can
top up.
This page explains who pays for a request, how the balance works, and where the
logic lives.

## Who pays for a request

Each AI request resolves to one of two outcomes:

1. **AI credits.** The app's key is set up, credits are switched on, and the
   balance is above zero. The app's key is used and the request spends credits.
2. **Unavailable.** None of the above. The screen offers a top-up when the
   credits are used up, and says AI isn't available otherwise.

Users can't bring their own key. If `CENTRAL_LLM_API_KEY` isn't set, outcome 1
never happens. The code is in `lib/llm/access.ts`.

Simple quizzes, Read, and Review never use credits.

## What things cost

A quiz costs one credit per question the model writes. Every term picked gets a
question, but a term that is ready to be typed gets a typed question built
without the model, and that one is free, so the cost shown when setting up a
quiz is a maximum. The quiz is planned, and the charge set, before the model
runs. If the model fails on some terms, those get a simple question and the
amount stays charged; if it fails on all of them, nothing is charged. A story costs one
credit per term it uses, which is 6, 8, or 10 for a short, medium, or long
story, and fewer if the collection has fewer eligible terms. Both weights are
settings, so the cost can change without a deploy.

The setup screens show the cost before you press Generate. If a request costs
more than the balance, the button is disabled and the screen offers a smaller
version: "Make it N questions" for a quiz, "Try Short" or "Try Medium" for a
story. The server never trims a request on its own.

## How the balance works

The balance is never stored. It is calculated from an append-only ledger, so it
can't drift and history is never lost. Two pools feed it:

- **Starter credits.** A lifetime amount, 100 by default.
- **Monthly credits.** A fresh amount each UTC calendar month, 30 by default.
  Unused monthly credits don't roll over.

Spending draws from the monthly pool first, then the starter pool. Admin grants
add to the starter pool. In plain terms:

```
remaining = max(0, starter + grants - starterUsed)
          + max(0, monthlyRefill - spentThisMonth)
```

`starterUsed` is the sum, across months, of whatever a month's net spend
exceeded the monthly refill. Net spend leaves out anything that was refunded.

Changing a setting applies to everyone straight away, because only usage is
stored. Raising the allowance is safe. Lowering it takes credits away from
people who are mid-use, and a balance never goes below zero.

## Charging and refunds

A request is charged before the model is called and refunded if it fails. The
`reserve_ai_credits` database function takes a per-user lock, checks the
balance, and writes the spend row in one step. Two requests from the same user
at the same moment can't both pass the check.

If anything fails after the charge, the spend is refunded. That covers a
provider error, an unparseable reply, a timeout, and a failure while saving a
story. Credits only stay spent for a quiz or story the user actually received.
Retries inside one attempt never charge twice. Refunding twice is harmless.

Each refund records a short reason in the refund row's `note`, such as
`Provider error 429: Quota exceeded` or `StoryGenerationError: ...`. When an
error wraps another one as its `cause`, as Stories' errors do, the note
describes the original. The reason
comes from the error, is cut to about 200 characters, has anything that looks
like a key removed, and never includes a prompt or what the user wrote. The
first reason stays if a refund is attempted twice.

Stories give up after 45 seconds, so a slow model is reported and refunded
before the platform's 60-second limit ends the request. AI quizzes have no such
limit of their own.

One case isn't covered. If the server process dies between the charge and the
refund, for example when a quiz runs past the platform's time limit, the
credits stay spent. Nothing marks these spends, so they look the same as any
other spend in the ledger. If this turns out to matter, a later change can add a
"settled" marker to spends and a job that refunds ones that never settle.

The code is in `lib/ai-credits/charge.ts` and `lib/ai-credits/repository.ts`.

## What users see

The account menu, and the More sheet on phones, show one plain line under the
email: how many credits are left, or that the credits are used up. The line is hidden when credits aren't offered. The
balance is looked up only when the menu opens, so ordinary page loads don't
pay for it. The line links to the AI section of Settings.

## Setting it up

Set these server-only environment variables, listed in `.env-template`:

- `CENTRAL_LLM_API_KEY`: the app's key. Leave it empty to switch AI credits off.
- `CENTRAL_LLM_PROVIDER`: `google` (the default) or `anthropic`.

Apply the migration before you set the key. If the key is set on a deployment
that doesn't have the migration yet, the balance lookup fails and users see the
same "AI isn't available" screens as before.

When someone uses AI credits, the terms, their definitions, and any outline the
person writes are sent to the app's AI provider. The AI credits panel in
Settings (`components/settings/llm-panel.tsx`) says so. The privacy page names
the providers and says the term content needed is sent, but doesn't mention
outlines. The sign-up page says nothing about AI.

The models are set in `lib/llm/model.ts`. We recommend setting a monthly budget cap in the provider's
console as a backstop.

## Changing settings and helping a user

Admins manage AI credits at `/admin/ai/credits`, reached from AI in the admin
sidebar (see [admin.md](admin.md)). There you can switch AI credits on or off and change the allowance,
the monthly refill, the costs, and how many credits one top-up adds. **Grant** adds credits to someone's starter
pool by email, and **Reset** clears their usage from that point on. Both keep
every record, and a reset keeps any grants. Turning credits off also hides the Top up button.

The allowance and refill live in `ai_credit_settings`, the prices in
`ai_feature_settings.credit_cost` (one row each for `quiz` and `story`), and the
ledger in `ai_credit_ledger`. If you ever need to work on them directly, use the
Supabase SQL editor:

```sql
update public.ai_credit_settings
set default_allowance = 100, monthly_refill = 30;

update public.ai_feature_settings set credit_cost = 1
where feature in ('quiz', 'story');

insert into public.ai_credit_ledger (user_id, kind, amount, note)
values ('<user id>', 'grant', 50, 'why');
```

## Checking that it works

The **Is it working?** section of the admin page shows how many people used
credits, or ran out, how many credits were spent, and
how many requests failed and were refunded in the last 24 hours. A warning
appears when many recent requests failed for more than one person, which usually
means the app's key was revoked or ran out of quota. **Why requests failed** lists
the most common reasons from the last 24 hours, with how many times each happened
and how many people it affected. The same numbers, and more, come from SQL:

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
where kind = 'grant' and note = 'self_topup' and created_by = user_id
group by user_id
order by credits desc;

-- The most common failure reasons in the last day.
select coalesce(note, 'Unknown reason') as reason, count(*) as failures
from public.ai_credit_ledger
where kind = 'refund' and created_at > now() - interval '24 hours'
group by 1 order by 2 desc limit 10;

-- Total credits spent, leaving out refunds.
select coalesce(sum(amount), 0) from public.ai_credit_ledger l
where kind = 'spend'
  and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id);
```

## Feature settings

`ai_feature_settings` has one row per AI feature (`quiz`, `story`,
`narration_term`, `narration_story`): the on/off switch, who
may use it (`everyone`, `allowlist`, `admin`), a rolling 24-hour cap, and the
credit cost. Only billable features (those with a cost) can be written to the
ledger; the ledger's foreign key and `reserve_ai_credits` both refuse the rest,
so narration can never spend credits.

Quiz and Stories read their row before every request (`resolveAiAccess`). A
feature that is switched off is off for everyone, and admins can switch them on the AI credits admin page. This is a
separate lever from the credits switch, which only stops use of the app's key.
If the settings can't be read the request goes ahead, so an app deployed ahead
of its database keeps working; a missing row means off.

Costs are still edited on the credits settings, and a trigger copies them to
the feature rows. Charging and the setup screens still read the old cost
columns from `my_ai_credit_state`; moving them to the feature rows and then
dropping the old columns is a later step.

## Running one request at a time

Both features take a per-user, per-feature guard (`begin_ai_run`) around the
work, through the credits charge (`lib/ai/run-guard.ts`).
It is taken before credits are reserved, so a refused duplicate is never
charged. It catches a second tab or a direct duplicate request; clicks in one
tab are already queued by Next. A request killed by the platform frees the guard
after 70 seconds, and the user sees "busy" until then. If the guard can't be
reached the request runs without it.

## Topping up

When someone is out of credits, the quiz, Stories and Settings screens show
**Top up credits**. The database only allows it while they have fewer than 10
credits left (`topup_not_needed` otherwise). It calls `topUpAiCreditsAction`
(`app/(private)/app/actions-ai-credits.ts`), which runs
`my_self_topup_ai_credits()`. That adds a ledger `grant` row with the note
`self_topup`, writes an audit row (`self_topup_ai_credits`) in the same
transaction, and returns the new balance. The amount is
`ai_credit_settings.self_topup_amount` (30 by default, editable on the admin
credits page). Afterwards the person and every admin get an email
(`lib/ai-credits/topup-copy.ts`); a failed email never fails the top-up.

There is no payment, and no limit on how many times someone can top up, so the
provider's monthly budget cap is the only backstop. The top-up sits behind this
one action so a payment step can replace it later without touching the screens.

## Where things live

- `supabase/migrations/20260929120000_ai_credits.sql`: tables, balance,
  reserve, refund, and admin functions.
- `lib/ai-credits/`: costs, the charge wrapper, and the database calls.
- `lib/llm/access.ts`: picks credits or unavailable.
- `lib/llm/central.ts`: reads the app's key from the environment.
- `app/(private)/app/quiz/actions.ts` and
  `app/(private)/app/read/stories/actions.ts`: charge and generate.
- `supabase/migrations/20260929170000_ai_feature_settings.sql` and
  `lib/ai/`: feature settings, the billable rule, and the run guard.
- `supabase/tests/`: SQL checks for the balance, permissions, and the
  concurrency guarantee. Run them against a local database.
