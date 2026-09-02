-- Local bootstrap: one admin + spare referral codes for manual testing.
-- Admin login: admin@jargon.local / password123

create extension if not exists pgcrypto with schema extensions;

-- Bootstrap code used to create the seeded admin (consumed below)
insert into public.referral_codes (code, is_active)
values ('BOOTSTRAP', true);

do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_admin_id,
    'authenticated',
    'authenticated',
    'admin@jargon.local',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"referral_code":"BOOTSTRAP"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_admin_id,
    format(
      '{"sub":"%s","email":"%s","email_verified":true,"phone_verified":false}',
      v_admin_id,
      'admin@jargon.local'
    )::jsonb,
    'email',
    v_admin_id::text,
    now(),
    now(),
    now()
  );

  update public.users
  set role = 'admin', referral_verified = true
  where id = v_admin_id;

  -- Spare single-use codes for signup testing (created by admin)
  insert into public.referral_codes (code, created_by)
  values
    ('WELCOME1', v_admin_id),
    ('WELCOME2', v_admin_id),
    ('WELCOME3', v_admin_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Sample collections: two domains owned by admin, active in their queue.
-- No review_state is seeded for any term — every term starts plain
-- never-engaged, so read/review/quiz counts always agree with the
-- review_events history behind them (a review_state row seeded directly,
-- without matching events, previously made the debug page's per-term event
-- history look broken for terms nobody had actually touched).
-- ---------------------------------------------------------------------------

do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_domain_ds uuid := '22222222-2222-2222-2222-222222222221';
  v_domain_pm uuid := '22222222-2222-2222-2222-222222222222';
begin
  insert into public.domains (id, name, description, visibility, owner_id)
  values
    (
      v_domain_ds,
      'Distributed Systems',
      'Core vocabulary for reasoning about systems that span multiple machines.',
      'private',
      v_admin_id
    ),
    (
      v_domain_pm,
      'Product Management',
      'Terms product managers throw around in planning and metrics reviews.',
      'private',
      v_admin_id
    );

  insert into public.terms (
    id, domain_id, term, category, definition, example, mental_model,
    discussion, anti_example, controversy
  )
  values
    (
      '33333333-3333-3333-3333-333333333301', v_domain_ds,
      'CAP Theorem', 'Theory',
      'A distributed data store can only guarantee two of three properties at once: consistency, availability, and partition tolerance.',
      'During a network partition, a system can either keep serving writes (availability) or refuse them until it can guarantee a consistent read (consistency), but not both.',
      'Think of it as a dial with only two working positions once the network is cut: you pick which failure you can live with, not whether to fail.',
      'Partitions are not optional in real networks, so in practice the real choice is CP versus AP, not whether to have a partition at all.',
      'Treating CAP as if you can tune all three properties independently, or claiming a system is simply "CA" without a partition assumption.',
      'Some argue CAP is overapplied to systems that rarely partition in practice, and that latency tradeoffs (PACELC) matter more day to day.'
    ),
    (
      '33333333-3333-3333-3333-333333333302', v_domain_ds,
      'Consensus', 'Coordination',
      'The process by which a group of nodes agrees on a single value or sequence of operations, even if some nodes fail.',
      'Raft and Paxos are consensus algorithms used to agree on the next entry in a replicated log.',
      'A group vote where you need a majority to commit, so the group keeps working even if a minority goes silent.',
      'Consensus is expensive: every agreed value costs a round trip to a majority of nodes, so it is used sparingly, not for every write.',
      'Assuming two nodes agreeing is enough consensus, without a majority quorum guarding against a split-brain minority.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333303', v_domain_ds,
      'Idempotency', 'Design',
      'An operation that produces the same result no matter how many times it is applied.',
      'Sending the same payment request twice with the same idempotency key charges the customer only once.',
      'A light switch that is already on stays on if you flip it "on" again; the second flip changes nothing.',
      'Idempotency is what makes safe retries possible over an unreliable network, where a client cannot tell if a request actually landed.',
      'Retrying a non-idempotent "increment balance by 10" call after a timeout, double-applying the change.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333304', v_domain_ds,
      'Eventual Consistency', 'Consistency',
      'A guarantee that, given no new writes, all replicas of data will eventually converge to the same value.',
      'A DNS record update takes a while to propagate to every resolver, but every resolver eventually agrees on the new value.',
      'Ripples settling on a pond: right after a write, replicas disagree briefly, then settle to the same state.',
      'It trades a short window of staleness for availability and lower latency, which is fine for data that tolerates being slightly out of date.',
      'Relying on eventual consistency for a bank balance check right before approving an overdraft.',
      'Whether "eventually" is a meaningful guarantee at all without a bound on how long convergence can take.'
    ),
    (
      '33333333-3333-3333-3333-333333333305', v_domain_ds,
      'Leader Election', 'Coordination',
      'The process nodes use to agree on which single node coordinates work for a group, especially after a failure.',
      'When a Kafka broker acting as controller crashes, the remaining brokers elect a new controller.',
      'A team that names one point of contact for a project, and re-elects a new one the moment that person is unreachable.',
      'Leader election avoids conflicting writes from multiple coordinators, but the election itself takes time, during which the system may be unavailable.',
      'Two nodes both believing they are leader after a network blip (split brain) because the election protocol lacked a fencing token.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333306', v_domain_ds,
      'Sharding', 'Scaling',
      'Splitting a dataset across multiple independent nodes so that no single node holds all the data.',
      'A "users" table is sharded by user ID range so each database instance holds only a slice of the customer base.',
      'Filing cabinets in different rooms: you need to know which room to walk into before you can find a folder.',
      'Sharding scales writes and storage horizontally, but cross-shard queries and rebalancing become genuinely hard problems.',
      'Choosing a shard key that is not evenly distributed, so one shard becomes a hot spot while others sit idle.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333307', v_domain_ds,
      'Backpressure', 'Flow control',
      'A signal from a slower downstream consumer that tells an upstream producer to slow down or stop sending.',
      'A queue that stops accepting new jobs and returns 429 once it is full, instead of buffering forever and running out of memory.',
      'A dam release: if the river below cannot handle full flow, you throttle the gate rather than flood the valley.',
      'Without backpressure, a fast producer and a slow consumer just grow an unbounded buffer until something crashes.',
      'Adding an unbounded in-memory queue "to handle spikes" instead of propagating a slow-down signal upstream.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333308', v_domain_ds,
      'Circuit Breaker', 'Resilience',
      'A pattern that stops calling a failing dependency for a cooldown period, instead failing fast, to give it room to recover.',
      'After five consecutive timeouts calling a payments API, the circuit "opens" and requests fail immediately for 30 seconds.',
      'A household fuse: after too many faults, it trips and cuts the circuit rather than letting the wiring keep overheating.',
      'It protects both the caller (avoids piling up slow requests) and the callee (avoids pile-on load during an outage).',
      'Retrying a dead dependency aggressively without ever tripping, amplifying an outage into a cascading failure.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333309', v_domain_ds,
      'Vector Clock', 'Consistency',
      'A mechanism that tracks per-node event counters so a system can tell whether two events are causally ordered or concurrent.',
      'Two replicas each bump their own counter on a write; comparing the two counter vectors later reveals whether one write happened before the other or they conflicted.',
      'Each person in a group chat keeps a private tally of messages they have seen from everyone else, so they can tell who replied to what.',
      'Vector clocks detect conflicts (concurrent writes) without needing a single global clock, at the cost of a counter per node.',
      'Using a single wall-clock timestamp to order events across machines whose clocks are not perfectly synchronized.',
      null
    ),
    (
      '33333333-3333-3333-3333-33333333330a', v_domain_ds,
      'Quorum', 'Coordination',
      'The minimum number of nodes that must agree before a read or write is considered successful.',
      'With replication factor 3 and a write quorum of 2, a write succeeds once any two of the three replicas confirm it.',
      'A committee rule that a decision needs a majority present to be valid, so no rogue subset can act alone.',
      'Choosing read and write quorums that overlap (R + W > N) guarantees a read always sees the latest write.',
      'Setting write quorum to 1 "for speed" and then being surprised reads do not reliably see recent writes.',
      null
    );

  insert into public.terms (
    id, domain_id, term, category, definition, example, mental_model,
    discussion, anti_example, controversy
  )
  values
    (
      '44444444-4444-4444-4444-444444444401', v_domain_pm,
      'North Star Metric', 'Metrics',
      'The single metric a team agrees best captures the core value delivered to customers, used to align decisions.',
      'A ride-share app might pick "completed rides per week" as its North Star, over vanity metrics like app downloads.',
      'A compass heading everyone on the team can check before deciding whether a project is worth doing.',
      'A good North Star correlates with long-term revenue and is something the team can actually move, not just observe.',
      'Picking a metric that is easy to game (like signups) instead of one tied to real, retained value.',
      'Some argue a single North Star oversimplifies tradeoffs a team actually has to balance day to day.'
    ),
    (
      '44444444-4444-4444-4444-444444444402', v_domain_pm,
      'MVP', 'Strategy',
      'The smallest version of a product that lets a team test a core hypothesis with real users.',
      'Launching a waitlist landing page before building the full product, to test whether anyone wants it.',
      'A sketch before a painting: rough, but enough to tell if the composition works before investing in detail.',
      'The point of an MVP is learning, not shipping something impressive; "minimum" and "viable" are both load-bearing words.',
      'Building a polished, feature-complete "MVP" that took six months and tested nothing early.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444403', v_domain_pm,
      'User Story', 'Process',
      'A short, plain-language description of a feature from the perspective of the person who wants it.',
      '"As a returning customer, I want my saved address to autofill at checkout, so I can order faster."',
      'A one-sentence pitch that keeps the "who" and the "why" attached to the "what," so the reason survives into implementation.',
      'Good user stories keep engineering grounded in a real need, rather than a disconnected technical task.',
      'Writing a story like "As a developer, I want to refactor the API," which describes no user need at all.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444404', v_domain_pm,
      'Kanban', 'Process',
      'A workflow method that visualizes work as cards moving through columns, with limits on how much can be in progress at once.',
      'A board with To Do, In Progress, and Done columns, where In Progress is capped at three cards per person.',
      'A single-lane highway: limiting how many cars merge in keeps traffic actually moving instead of gridlocked.',
      'The work-in-progress limit is the whole point; without it, Kanban is just a to-do list with columns.',
      'Running a "Kanban board" with no WIP limits, so everything sits "in progress" indefinitely.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444405', v_domain_pm,
      'OKR', 'Planning',
      'Objectives and Key Results: a goal-setting framework pairing a qualitative objective with measurable key results.',
      'Objective: "Make onboarding effortless." Key result: "Cut time-to-first-value from 10 minutes to 3."',
      'A destination (objective) plus a speedometer (key results) that tells you whether you are actually getting closer.',
      'Key results should be outcomes you can measure, not a checklist of tasks you plan to do.',
      'Writing a key result like "Ship the new onboarding flow," which is a task, not a measurable outcome.',
      'Whether OKRs are worth the quarterly overhead for smaller teams that can just talk to each other.'
    ),
    (
      '44444444-4444-4444-4444-444444444406', v_domain_pm,
      'Retention Curve', 'Metrics',
      'A chart of the percentage of users still active N days after signup, used to see whether a product sticks.',
      'A curve that drops sharply in the first week, then flattens near 20% — the flat part is the "retained core."',
      'Water in a leaky bucket: the curve shows how fast it drains and where the leaking finally slows down.',
      'What matters most is where the curve flattens, not the day-one number — a flat tail means real habitual use.',
      'Reporting only day-1 retention and ignoring whether the curve ever flattens at all.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444407', v_domain_pm,
      'Churn', 'Metrics',
      'The rate at which customers stop using a product or cancel a subscription over a given period.',
      'A subscription service with 5% monthly churn loses about 5 of every 100 subscribers each month.',
      'A bathtub with the drain open: growth is the faucet, churn is the drain, and net growth needs the faucet to win.',
      'Small differences in monthly churn compound dramatically over a year, so it deserves more attention than its size suggests.',
      'Celebrating strong new signups while ignoring that churn is quietly erasing most of the gain.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444408', v_domain_pm,
      'Feature Flag', 'Engineering',
      'A toggle that lets a team turn a feature on or off, or roll it out gradually, without deploying new code.',
      'Shipping a redesign behind a flag enabled for 5% of users, then ramping to 100% if metrics hold up.',
      'A dimmer switch for a feature, rather than an all-or-nothing light switch tied to a deploy.',
      'Flags decouple deploying code from releasing a feature, which lets rollouts and rollbacks happen independently of engineering cycles.',
      'Letting old, unused flags pile up in the codebase until nobody remembers what half of them control.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444409', v_domain_pm,
      'Product-Market Fit', 'Strategy',
      'The point at which a product satisfies strong market demand well enough that growth becomes easier to sustain.',
      'Users pulling the product into their workflow unprompted, and word of mouth outpacing paid acquisition.',
      'A key finally turning smoothly in a lock, instead of being forced — resistance drops once the shape actually matches.',
      'Before fit, most effort should go into learning and iterating; after fit, it shifts toward scaling what already works.',
      'Pouring marketing spend into growth before confirming anyone outside the founding team actually wants the product.',
      'There is no universally agreed way to measure it precisely, so teams often disagree about whether they have reached it.'
    ),
    (
      '44444444-4444-4444-4444-44444444440a', v_domain_pm,
      'Roadmap', 'Planning',
      'A high-level plan showing the direction and rough sequence of what a product team intends to build.',
      'A quarter-by-quarter view showing "onboarding revamp" next quarter and "billing overhaul" the quarter after.',
      'A trail map, not a train schedule: it shows the intended route, not a guaranteed arrival time for every stop.',
      'A roadmap communicates priority and sequencing to stakeholders without over-promising exact dates.',
      'Publishing a roadmap with fixed dates for every item, then treating any slip as a broken promise.',
      null
    );

  insert into public.term_relationships (source_term_id, target_term_id, relationship_type, description)
  values
    (
      '33333333-3333-3333-3333-333333333301', '33333333-3333-3333-3333-333333333304',
      'relates_to', 'CAP theorem is the reason AP systems lean on eventual consistency instead of strict consistency.'
    ),
    (
      '33333333-3333-3333-3333-333333333302', '33333333-3333-3333-3333-33333333330a',
      'depends_on', 'Consensus algorithms use a quorum of nodes to agree on the next value.'
    ),
    (
      '44444444-4444-4444-4444-444444444402', '44444444-4444-4444-4444-444444444409',
      'leads_to', 'Shipping an MVP is how a team gathers the signal needed to find product-market fit.'
    );

  -- Both collections active in admin's own queue.
  insert into public.user_active_domains (user_id, domain_id)
  values
    (v_admin_id, v_domain_ds),
    (v_admin_id, v_domain_pm);
end;
$$;
