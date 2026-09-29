# AI credits

AI quizzes and Stories need a language model. AI credits let every account use
the app's own AI key for those two features until they save a key of their own.
This page explains who pays for a request, how the balance works, and where the
logic lives.

## Who pays for a request

Each AI request resolves to exactly one of three outcomes, in this order:

1. **Own key.** The user saved a provider and API key in Settings. That key is
   used, no credits are spent, and a failing key never falls back to credits.
2. **AI credits.** The user has no key, the app's key is set up, credits are
   switched on, and the balance is above zero. The app's key is used and the
   request spends credits.
3. **Unavailable.** None of the above. The screen tells the user to add a key,
   or that their credits are used up.

If `CENTRAL_LLM_API_KEY` isn't set, outcome 2 never happens and the app behaves
as it did before credits existed. The code is in `lib/llm/access.ts`.

Simple quizzes, Read, and Review never use credits.

## What things cost

A quiz costs one credit per question it will ask, which is one per term picked.
The charge is set before the model runs, so if the model returns fewer usable
questions than asked for, the full amount is still charged. A story costs one
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
email: how many credits are left, that the credits are used up, or that the
account uses its own key. The line is hidden when credits aren't offered. The
balance is looked up only when the menu opens, so ordinary page loads don't
pay for it. The line links to the AI section of Settings.

## Setting it up

Set these server-only environment variables, listed in `.env-template`:

- `CENTRAL_LLM_API_KEY`: the app's key. Leave it empty to switch AI credits off.
- `CENTRAL_LLM_PROVIDER`: `google` (the default) or `anthropic`.

Apply the migration before you set the key. If the key is set on a deployment
that doesn't have the migration yet, the balance lookup fails and users see the
same "add a key" screens as before, with no harm done to users on their own key.

When someone uses AI credits, the terms, their definitions, and any outline the
person writes are sent to the app's AI provider. Settings and the sign-up page
say so.

The models are the same ones users get with their own key, set in
`lib/llm/model.ts`. We recommend setting a monthly budget cap in the provider's
console as a backstop.

## Changing settings and helping a user

Admins manage AI credits at `/admin/ai-credits`, which is also in the admin tabs
and menus. There you can switch AI credits on or off and change the allowance,
the monthly refill, and the costs. **Grant** adds credits to someone's starter
pool by email, and **Reset** clears their usage from that point on. Both keep
every record, and a reset keeps any grants. Users with their own key are not
affected by the switch.

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
credits, ran out, or then saved their own key, how many credits were spent, and
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

-- People who saved their own key after using credits.
select count(*) from public.user_settings s
where s.api_key_last4 is not null
  and exists (
    select 1 from public.ai_credit_ledger l
    where l.user_id = s.user_id and l.kind = 'spend'
  );

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
`term_evaluation`, `narration_term`, `narration_story`): the on/off switch, who
may use it (`everyone`, `allowlist`, `admin`), a rolling 24-hour cap, and the
credit cost. Only billable features (those with a cost) can be written to the
ledger; the ledger's foreign key and `reserve_ai_credits` both refuse the rest,
so narration can never spend credits.

Quiz and Stories read their row before every request (`resolveAiAccess`). A
feature that is switched off is off for everyone, people with their own key
included, and admins can switch them on the AI credits admin page. This is a
separate lever from the credits switch, which only stops use of the app's key.
If the settings can't be read the request goes ahead, so an app deployed ahead
of its database keeps working; a missing row means off.

Costs are still edited on the credits settings, and a trigger copies them to
the feature rows. Charging and the setup screens still read the old cost
columns from `my_ai_credit_state`; moving them to the feature rows and then
dropping the old columns is a later step.

## Running one request at a time

Both features take a per-user, per-feature guard (`begin_ai_run`) around the
work, on the own-key path as well as the credits path (`lib/ai/run-guard.ts`).
It is taken before credits are reserved, so a refused duplicate is never
charged. It catches a second tab or a direct duplicate request; clicks in one
tab are already queued by Next. A request killed by the platform frees the guard
after 70 seconds, and the user sees "busy" until then. If the guard can't be
reached the request runs without it.

A saved own key that can't be decrypted (for example after the encryption
secret changed) is never replaced by credits. The user is asked to enter it
again in Settings.

## Where things live

- `supabase/migrations/20260929120000_ai_credits.sql`: tables, balance,
  reserve, refund, and admin functions.
- `lib/ai-credits/`: costs, the charge wrapper, and the database calls.
- `lib/llm/access.ts`: picks own key, credits, or unavailable.
- `lib/llm/central.ts`: reads the app's key from the environment.
- `app/(private)/jargon/quiz/actions.ts` and
  `app/(private)/jargon/read/stories/actions.ts`: charge and generate.
- `supabase/migrations/20260929170000_ai_feature_settings.sql` and
  `lib/ai/`: feature settings, the billable rule, and the run guard.
- `supabase/tests/`: SQL checks for the balance, permissions, and the
  concurrency guarantee. Run them against a local database.
