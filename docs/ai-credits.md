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

One case isn't covered. If the server process dies between the charge and the
refund, for example when a request runs past the platform's time limit, the
credits stay spent. Nothing marks these spends, so they look the same as any
other spend in the ledger. If this turns out to matter, a later change can add a
"settled" marker to spends and a job that refunds ones that never settle.

The code is in `lib/ai-credits/charge.ts` and `lib/ai-credits/repository.ts`.

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

The settings row and the ledger live in `ai_credit_settings` and
`ai_credit_ledger`. Until the admin page exists, use the Supabase SQL editor.

To change the allowance, the refill, or the costs:

```sql
update public.ai_credit_settings
set default_allowance = 100, monthly_refill = 30,
    quiz_credits_per_question = 1, story_credits_per_term = 1;
```

To switch AI credits off for everyone, set `enabled = false` in the same table.
Users with their own key are not affected.

To give a user extra credits, or clear their usage while keeping the history:

```sql
insert into public.ai_credit_ledger (user_id, kind, amount, note)
values ('<user id>', 'grant', 50, 'why');

insert into public.ai_credit_ledger (user_id, kind, amount, note)
values ('<user id>', 'reset', 0, 'why');
```

A reset clears usage from that point on and keeps grants.

## Checking that it works

These queries answer whether people use credits and what happens next:

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

-- Total credits spent, leaving out refunds.
select coalesce(sum(amount), 0) from public.ai_credit_ledger l
where kind = 'spend'
  and not exists (select 1 from public.ai_credit_ledger r where r.refund_of = l.id);
```

## Where things live

- `supabase/migrations/20260929120000_ai_credits.sql`: tables, balance,
  reserve, refund, and admin functions.
- `lib/ai-credits/`: costs, the charge wrapper, and the database calls.
- `lib/llm/access.ts`: picks own key, credits, or unavailable.
- `lib/llm/central.ts`: reads the app's key from the environment.
- `app/(private)/jargon/quiz/actions.ts` and
  `app/(private)/jargon/read/stories/actions.ts`: charge and generate.
- `supabase/tests/`: SQL checks for the balance, permissions, and the
  concurrency guarantee. Run them against a local database.
