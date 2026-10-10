-- Local bootstrap: one admin + spare referral codes for manual testing.
-- Admin login: admin@lobyas.local / password123

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
    'admin@lobyas.local',
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
      'admin@lobyas.local'
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
-- Sample collections: two collections owned by admin, active in their queue.
-- No review_state is seeded directly for most terms — every term starts
-- plain never-engaged, so read/review/quiz counts always agree with the
-- review_events history behind them (a review_state row seeded directly,
-- without matching events, previously made a term's event history look
-- broken for terms nobody had actually touched). The three
-- exceptions below (Idempotency, Leader Election, OKR) follow that same
-- rule the hard way: their review_state rows are the exact aggregate the
-- real record_review_event RPC would have produced from the review_events
-- history seeded alongside them (recall/recognition stability, difficulty,
-- and posterior were computed by actually replaying lib/trace's
-- applyReadEvent/applyReviewGrade/applyQuizAnswer over that history, not
-- guessed), so the Mastery page has one genuinely mastered term and two
-- mid-progress ones to look at without any manual DB surgery.
-- ---------------------------------------------------------------------------

do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_collection_ds uuid := '22222222-2222-2222-2222-222222222221';
  v_collection_pm uuid := '22222222-2222-2222-2222-222222222222';
begin
  insert into public.collections (id, name, description, visibility, owner_id)
  values
    (
      v_collection_ds,
      'Distributed Systems',
      'Core vocabulary for reasoning about systems that span multiple machines.',
      'private',
      v_admin_id
    ),
    (
      v_collection_pm,
      'Product Management',
      'Terms product managers throw around in planning and metrics reviews.',
      'private',
      v_admin_id
    );

  insert into public.terms (
    id, collection_id, term, category, definition, example, mental_model,
    discussion, anti_example, controversy
  )
  values
    (
      '33333333-3333-3333-3333-333333333301', v_collection_ds,
      'CAP Theorem', 'Theory',
      'A distributed data store can only guarantee two of three properties at once: consistency, availability, and partition tolerance.',
      'During a network partition, a system can either keep serving writes (availability) or refuse them until it can guarantee a consistent read (consistency), but not both.',
      'Think of it as a dial with only two working positions once the network is cut: you pick which failure you can live with, not whether to fail.',
      'Partitions are not optional in real networks, so in practice the real choice is CP versus AP, not whether to have a partition at all.',
      'Treating CAP as if you can tune all three properties independently, or claiming a system is simply "CA" without a partition assumption.',
      'Some argue CAP is overapplied to systems that rarely partition in practice, and that latency tradeoffs (PACELC) matter more day to day.'
    ),
    (
      '33333333-3333-3333-3333-333333333302', v_collection_ds,
      'Consensus', 'Coordination',
      'The process by which a group of nodes agrees on a single value or sequence of operations, even if some nodes fail.',
      'Raft and Paxos are consensus algorithms used to agree on the next entry in a replicated log.',
      'A group vote where you need a majority to commit, so the group keeps working even if a minority goes silent.',
      'Consensus is expensive: every agreed value costs a round trip to a majority of nodes, so it is used sparingly, not for every write.',
      'Assuming two nodes agreeing is enough consensus, without a majority quorum guarding against a split-brain minority.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333303', v_collection_ds,
      'Idempotency', 'Design',
      'An operation that produces the same result no matter how many times it is applied.',
      'Sending the same payment request twice with the same idempotency key charges the customer only once.',
      'A light switch that is already on stays on if you flip it "on" again; the second flip changes nothing.',
      'Idempotency is what makes safe retries possible over an unreliable network, where a client cannot tell if a request actually landed.',
      'Retrying a non-idempotent "increment balance by 10" call after a timeout, double-applying the change.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333304', v_collection_ds,
      'Eventual Consistency', 'Consistency',
      'A guarantee that, given no new writes, all replicas of data will eventually converge to the same value.',
      'A DNS record update takes a while to propagate to every resolver, but every resolver eventually agrees on the new value.',
      'Ripples settling on a pond: right after a write, replicas disagree briefly, then settle to the same state.',
      'It trades a short window of staleness for availability and lower latency, which is fine for data that tolerates being slightly out of date.',
      'Relying on eventual consistency for a bank balance check right before approving an overdraft.',
      'Whether "eventually" is a meaningful guarantee at all without a bound on how long convergence can take.'
    ),
    (
      '33333333-3333-3333-3333-333333333305', v_collection_ds,
      'Leader Election', 'Coordination',
      'The process nodes use to agree on which single node coordinates work for a group, especially after a failure.',
      'When a Kafka broker acting as controller crashes, the remaining brokers elect a new controller.',
      'A team that names one point of contact for a project, and re-elects a new one the moment that person is unreachable.',
      'Leader election avoids conflicting writes from multiple coordinators, but the election itself takes time, during which the system may be unavailable.',
      'Two nodes both believing they are leader after a network blip (split brain) because the election protocol lacked a fencing token.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333306', v_collection_ds,
      'Sharding', 'Scaling',
      'Splitting a dataset across multiple independent nodes so that no single node holds all the data.',
      'A "users" table is sharded by user ID range so each database instance holds only a slice of the customer base.',
      'Filing cabinets in different rooms: you need to know which room to walk into before you can find a folder.',
      'Sharding scales writes and storage horizontally, but cross-shard queries and rebalancing become genuinely hard problems.',
      'Choosing a shard key that is not evenly distributed, so one shard becomes a hot spot while others sit idle.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333307', v_collection_ds,
      'Backpressure', 'Flow control',
      'A signal from a slower downstream consumer that tells an upstream producer to slow down or stop sending.',
      'A queue that stops accepting new jobs and returns 429 once it is full, instead of buffering forever and running out of memory.',
      'A dam release: if the river below cannot handle full flow, you throttle the gate rather than flood the valley.',
      'Without backpressure, a fast producer and a slow consumer just grow an unbounded buffer until something crashes.',
      'Adding an unbounded in-memory queue "to handle spikes" instead of propagating a slow-down signal upstream.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333308', v_collection_ds,
      'Circuit Breaker', 'Resilience',
      'A pattern that stops calling a failing dependency for a cooldown period, instead failing fast, to give it room to recover.',
      'After five consecutive timeouts calling a payments API, the circuit "opens" and requests fail immediately for 30 seconds.',
      'A household fuse: after too many faults, it trips and cuts the circuit rather than letting the wiring keep overheating.',
      'It protects both the caller (avoids piling up slow requests) and the callee (avoids pile-on load during an outage).',
      'Retrying a dead dependency aggressively without ever tripping, amplifying an outage into a cascading failure.',
      null
    ),
    (
      '33333333-3333-3333-3333-333333333309', v_collection_ds,
      'Vector Clock', 'Consistency',
      'A mechanism that tracks per-node event counters so a system can tell whether two events are causally ordered or concurrent.',
      'Two replicas each bump their own counter on a write; comparing the two counter vectors later reveals whether one write happened before the other or they conflicted.',
      'Each person in a group chat keeps a private tally of messages they have seen from everyone else, so they can tell who replied to what.',
      'Vector clocks detect conflicts (concurrent writes) without needing a single global clock, at the cost of a counter per node.',
      'Using a single wall-clock timestamp to order events across machines whose clocks are not perfectly synchronized.',
      null
    ),
    (
      '33333333-3333-3333-3333-33333333330a', v_collection_ds,
      'Quorum', 'Coordination',
      'The minimum number of nodes that must agree before a read or write is considered successful.',
      'With replication factor 3 and a write quorum of 2, a write succeeds once any two of the three replicas confirm it.',
      'A committee rule that a decision needs a majority present to be valid, so no rogue subset can act alone.',
      'Choosing read and write quorums that overlap (R + W > N) guarantees a read always sees the latest write.',
      'Setting write quorum to 1 "for speed" and then being surprised reads do not reliably see recent writes.',
      null
    );

  insert into public.terms (
    id, collection_id, term, category, definition, example, mental_model,
    discussion, anti_example, controversy
  )
  values
    (
      '44444444-4444-4444-4444-444444444401', v_collection_pm,
      'North Star Metric', 'Metrics',
      'The single metric a team agrees best captures the core value delivered to customers, used to align decisions.',
      'A ride-share app might pick "completed rides per week" as its North Star, over vanity metrics like app downloads.',
      'A compass heading everyone on the team can check before deciding whether a project is worth doing.',
      'A good North Star correlates with long-term revenue and is something the team can actually move, not just observe.',
      'Picking a metric that is easy to game (like signups) instead of one tied to real, retained value.',
      'Some argue a single North Star oversimplifies tradeoffs a team actually has to balance day to day.'
    ),
    (
      '44444444-4444-4444-4444-444444444402', v_collection_pm,
      'MVP', 'Strategy',
      'The smallest version of a product that lets a team test a core hypothesis with real users.',
      'Launching a waitlist landing page before building the full product, to test whether anyone wants it.',
      'A sketch before a painting: rough, but enough to tell if the composition works before investing in detail.',
      'The point of an MVP is learning, not shipping something impressive; "minimum" and "viable" are both load-bearing words.',
      'Building a polished, feature-complete "MVP" that took six months and tested nothing early.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444403', v_collection_pm,
      'User Story', 'Process',
      'A short, plain-language description of a feature from the perspective of the person who wants it.',
      '"As a returning customer, I want my saved address to autofill at checkout, so I can order faster."',
      'A one-sentence pitch that keeps the "who" and the "why" attached to the "what," so the reason survives into implementation.',
      'Good user stories keep engineering grounded in a real need, rather than a disconnected technical task.',
      'Writing a story like "As a developer, I want to refactor the API," which describes no user need at all.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444404', v_collection_pm,
      'Kanban', 'Process',
      'A workflow method that visualizes work as cards moving through columns, with limits on how much can be in progress at once.',
      'A board with To Do, In Progress, and Done columns, where In Progress is capped at three cards per person.',
      'A single-lane highway: limiting how many cars merge in keeps traffic actually moving instead of gridlocked.',
      'The work-in-progress limit is the whole point; without it, Kanban is just a to-do list with columns.',
      'Running a "Kanban board" with no WIP limits, so everything sits "in progress" indefinitely.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444405', v_collection_pm,
      'OKR', 'Planning',
      'Objectives and Key Results: a goal-setting framework pairing a qualitative objective with measurable key results.',
      'Objective: "Make onboarding effortless." Key result: "Cut time-to-first-value from 10 minutes to 3."',
      'A destination (objective) plus a speedometer (key results) that tells you whether you are actually getting closer.',
      'Key results should be outcomes you can measure, not a checklist of tasks you plan to do.',
      'Writing a key result like "Ship the new onboarding flow," which is a task, not a measurable outcome.',
      'Whether OKRs are worth the quarterly overhead for smaller teams that can just talk to each other.'
    ),
    (
      '44444444-4444-4444-4444-444444444406', v_collection_pm,
      'Retention Curve', 'Metrics',
      'A chart of the percentage of users still active N days after signup, used to see whether a product sticks.',
      'A curve that drops sharply in the first week, then flattens near 20% — the flat part is the "retained core."',
      'Water in a leaky bucket: the curve shows how fast it drains and where the leaking finally slows down.',
      'What matters most is where the curve flattens, not the day-one number — a flat tail means real habitual use.',
      'Reporting only day-1 retention and ignoring whether the curve ever flattens at all.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444407', v_collection_pm,
      'Churn', 'Metrics',
      'The rate at which customers stop using a product or cancel a subscription over a given period.',
      'A subscription service with 5% monthly churn loses about 5 of every 100 subscribers each month.',
      'A bathtub with the drain open: growth is the faucet, churn is the drain, and net growth needs the faucet to win.',
      'Small differences in monthly churn compound dramatically over a year, so it deserves more attention than its size suggests.',
      'Celebrating strong new signups while ignoring that churn is quietly erasing most of the gain.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444408', v_collection_pm,
      'Feature Flag', 'Engineering',
      'A toggle that lets a team turn a feature on or off, or roll it out gradually, without deploying new code.',
      'Shipping a redesign behind a flag enabled for 5% of users, then ramping to 100% if metrics hold up.',
      'A dimmer switch for a feature, rather than an all-or-nothing light switch tied to a deploy.',
      'Flags decouple deploying code from releasing a feature, which lets rollouts and rollbacks happen independently of engineering cycles.',
      'Letting old, unused flags pile up in the codebase until nobody remembers what half of them control.',
      null
    ),
    (
      '44444444-4444-4444-4444-444444444409', v_collection_pm,
      'Product-Market Fit', 'Strategy',
      'The point at which a product satisfies strong market demand well enough that growth becomes easier to sustain.',
      'Users pulling the product into their workflow unprompted, and word of mouth outpacing paid acquisition.',
      'A key finally turning smoothly in a lock, instead of being forced — resistance drops once the shape actually matches.',
      'Before fit, most effort should go into learning and iterating; after fit, it shifts toward scaling what already works.',
      'Pouring marketing spend into growth before confirming anyone outside the founding team actually wants the product.',
      'There is no universally agreed way to measure it precisely, so teams often disagree about whether they have reached it.'
    ),
    (
      '44444444-4444-4444-4444-44444444440a', v_collection_pm,
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
  insert into public.user_active_collections (user_id, collection_id)
  values
    (v_admin_id, v_collection_ds),
    (v_admin_id, v_collection_pm);
end;
$$;

-- ---------------------------------------------------------------------------
-- Sample TRACE progress: one fully mastered term with a rich event log
-- (Idempotency), and two "in progress" terms sitting in the learning band
-- (Leader Election, OKR) — so the Mastery page isn't all-zero out of the
-- box. Every review_events row and its matching review_state aggregate
-- below is the real output of replaying lib/trace's pure functions
-- (applyReadEvent/applyReviewGrade/applyQuizAnswer/computeTraceSnapshot)
-- over a chosen history, not hand-picked numbers — see the comment above.
-- All timestamps are relative to whenever this seed is applied.
-- ---------------------------------------------------------------------------

do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_idempotency uuid := '33333333-3333-3333-3333-333333333303';
  v_leader_election uuid := '33333333-3333-3333-3333-333333333305';
  v_okr uuid := '44444444-4444-4444-4444-444444444405';
  v_cap uuid := '33333333-3333-3333-3333-333333333301';
begin
  -- Idempotency — mastered today, first seen 14 days ago.
  insert into public.review_events (
    user_id, term_id, event, grade, question_type, retrievability_before,
    recall_stability, recall_difficulty, quiz_knowledge_posterior, created_at
  )
  values
    (v_admin_id, v_idempotency, 'read', null, null, null, null, null, null, now() - interval '14 days'),
    (v_admin_id, v_idempotency, 'read', null, null, null, null, null, null, now() - interval '12 days'),
    (v_admin_id, v_idempotency, 'reveal', null, null, null, null, null, null, now() - interval '10 days'),
    (v_admin_id, v_idempotency, 'review_pass', 3, null, null, 3.7539920185492046, 4.51131249971455, null, now() - interval '10 days'),
    (v_admin_id, v_idempotency, 'quiz_pass', null, 'multiple_choice', null, null, null, 0.7916666666666666, now() - interval '10 days'),
    (v_admin_id, v_idempotency, 'reveal', null, null, null, null, null, null, now() - interval '7 days'),
    (v_admin_id, v_idempotency, 'review_pass', 3, null, 0.9184470761105898, 13.01854740644538, 4.482566629207395, null, now() - interval '7 days'),
    (v_admin_id, v_idempotency, 'quiz_pass', null, 'true_false', 0.9747634069400631, null, null, 0.8783454987834549, now() - interval '7 days'),
    (v_admin_id, v_idempotency, 'reveal', null, null, null, null, null, null, now() - interval '4 days'),
    (v_admin_id, v_idempotency, 'review_pass', 4, null, 0.9750347280784013, 38.577163290633266, 3.81681503258082, null, now() - interval '4 days'),
    (v_admin_id, v_idempotency, 'quiz_pass', null, 'multiple_choice', 0.9770249874224383, null, null, 0.9648333098888733, now() - interval '4 days'),
    (v_admin_id, v_idempotency, 'reveal', null, null, null, null, null, null, now() - interval '1 days'),
    (v_admin_id, v_idempotency, 'review_pass', 4, null, 0.991433331305054, 62.56272343334723, 3.089697659741007, null, now() - interval '1 days'),
    (v_admin_id, v_idempotency, 'quiz_pass', null, 'true_false', 0.9720772755213664, null, null, 0.9811776752170214, now()),
    (v_admin_id, v_idempotency, 'quiz_pass', null, 'multiple_choice', 1, null, null, 0.9949770935373677, now()),
    (v_admin_id, v_idempotency, 'quiz_pass', null, 'true_false', 1, null, null, 0.9973500600932171, now());

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    recall_stability, recall_difficulty, review_recall_count, last_review_recall_at,
    quiz_knowledge_posterior, quiz_test_count, last_quiz_tested_at, ever_mastered_at,
    last_review_grade
  )
  values (
    v_admin_id, v_idempotency, 2, now() - interval '12 days',
    62.56272343334723, 3.089697659741007, 4, now() - interval '1 days',
    0.9973500600932171, 6, now(), now(), 4
  );

  -- Leader Election — three reviews and a quiz, sitting mid-progress (learning band).
  insert into public.review_events (
    user_id, term_id, event, grade, question_type, retrievability_before,
    recall_stability, recall_difficulty, quiz_knowledge_posterior, created_at
  )
  values
    (v_admin_id, v_leader_election, 'read', null, null, null, null, null, null, now() - interval '6 days'),
    (v_admin_id, v_leader_election, 'reveal', null, null, null, null, null, null, now() - interval '6 days'),
    (v_admin_id, v_leader_election, 'review_pass', 3, null, null, 3.5951299999999997, 4.714577829570867, null, now() - interval '6 days'),
    (v_admin_id, v_leader_election, 'reveal', null, null, null, null, null, null, now() - interval '3 days'),
    (v_admin_id, v_leader_election, 'review_pass', 3, null, 0.9151491804683596, 12.621541188961016, 4.681075550345074, null, now() - interval '3 days'),
    (v_admin_id, v_leader_election, 'quiz_pass', null, 'multiple_choice', null, null, null, 0.7916666666666666, now() - interval '1 days'),
    (v_admin_id, v_leader_election, 'reveal', null, null, null, null, null, null, now()),
    (v_admin_id, v_leader_election, 'review_pass', 3, null, 0.9742696594428844, 20.32528090777927, 4.648357224453165, null, now());

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    recall_stability, recall_difficulty, review_recall_count, last_review_recall_at,
    quiz_knowledge_posterior, quiz_test_count, last_quiz_tested_at, ever_mastered_at,
    last_review_grade
  )
  values (
    v_admin_id, v_leader_election, 1, now() - interval '6 days',
    20.32528090777927, 4.648357224453165, 3, now(),
    0.7916666666666666, 1, now() - interval '1 days', null, 3
  );

  -- OKR — two reviews and two quizzes, also mid-progress (learning band).
  insert into public.review_events (
    user_id, term_id, event, grade, question_type, retrievability_before,
    recall_stability, recall_difficulty, quiz_knowledge_posterior, created_at
  )
  values
    (v_admin_id, v_okr, 'read', null, null, null, null, null, null, now() - interval '5 days'),
    (v_admin_id, v_okr, 'reveal', null, null, null, null, null, null, now() - interval '5 days'),
    (v_admin_id, v_okr, 'review_pass', 3, null, null, 3.5951299999999997, 4.714577829570867, null, now() - interval '5 days'),
    (v_admin_id, v_okr, 'quiz_pass', null, 'true_false', null, null, null, 0.6551724137931034, now() - interval '2 days'),
    (v_admin_id, v_okr, 'reveal', null, null, null, null, null, null, now()),
    (v_admin_id, v_okr, 'review_pass', 3, null, 0.8661533021184988, 18.223968588221556, 4.681075550345074, null, now()),
    (v_admin_id, v_okr, 'quiz_pass', null, 'multiple_choice', 0.9798890429958392, null, null, 0.878345498783455, now());

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    recall_stability, recall_difficulty, review_recall_count, last_review_recall_at,
    quiz_knowledge_posterior, quiz_test_count, last_quiz_tested_at, ever_mastered_at,
    last_review_grade
  )
  values (
    v_admin_id, v_okr, 1, now() - interval '5 days',
    18.223968588221556, 4.681075550345074, 2, now(),
    0.878345498783455, 2, now(), null, 3
  );

  -- CAP Theorem — one first review, so the admin has the 10 reviews the
  -- Mastery promo waits for. Same history shape as the first review above.
  insert into public.review_events (
    user_id, term_id, event, grade, question_type, retrievability_before,
    recall_stability, recall_difficulty, quiz_knowledge_posterior, created_at
  )
  values
    (v_admin_id, v_cap, 'read', null, null, null, null, null, null, now() - interval '4 days'),
    (v_admin_id, v_cap, 'reveal', null, null, null, null, null, null, now() - interval '4 days'),
    (v_admin_id, v_cap, 'review_pass', 3, null, null, 3.5951299999999997, 4.714577829570867, null, now() - interval '4 days');

  insert into public.review_state (
    user_id, term_id, read_count, last_read_at,
    recall_stability, recall_difficulty, review_recall_count, last_review_recall_at,
    last_review_grade
  )
  values (
    v_admin_id, v_cap, 1, now() - interval '4 days',
    3.5951299999999997, 4.714577829570867, 1, now() - interval '4 days', 3
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Shared collections owned by a second user, so Browse and the Add a
-- collection search have results for the admin to find and add.
-- Author login: author@lobyas.local / password123
-- ---------------------------------------------------------------------------

insert into public.referral_codes (code, created_by)
values ('SEEDAUTHOR', '11111111-1111-1111-1111-111111111111');

do $$
declare
  v_author_id uuid := '11111111-1111-1111-1111-111111111112';
  v_collection_fin uuid := '22222222-2222-2222-2222-222222222223';
  v_collection_ux uuid := '22222222-2222-2222-2222-222222222224';
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_author_id,
    'authenticated',
    'authenticated',
    'author@lobyas.local',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"referral_code":"SEEDAUTHOR"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_author_id,
    format(
      '{"sub":"%s","email":"%s","email_verified":true,"phone_verified":false}',
      v_author_id,
      'author@lobyas.local'
    )::jsonb,
    'email',
    v_author_id::text,
    now(), now(), now()
  );

  insert into public.collections (id, name, description, visibility, owner_id)
  values
    (
      v_collection_fin,
      'Startup Finance',
      'Funding, equity and metrics vocabulary for early-stage companies.',
      'shared',
      v_author_id
    ),
    (
      v_collection_ux,
      'UX Research',
      'Terms for planning and running user research.',
      'shared',
      v_author_id
    );

  insert into public.terms (collection_id, term, category, definition)
  values
    (v_collection_fin, 'Runway', 'Metrics', 'How many months a company can operate before it runs out of cash.'),
    (v_collection_fin, 'Burn rate', 'Metrics', 'The amount of cash a company spends each month.'),
    (v_collection_fin, 'Cap table', 'Equity', 'A table showing who owns how much of a company.'),
    (v_collection_ux, 'Usability test', 'Methods', 'Watching people try to complete tasks with a product to find where they struggle.'),
    (v_collection_ux, 'Affinity mapping', 'Methods', 'Grouping research notes by theme to find patterns.'),
    (v_collection_ux, 'Screener', 'Recruiting', 'A short survey used to pick the right participants for a study.');
end;
$$;

-- ---------------------------------------------------------------------------
-- Public collections, so /collections and its pages have something to show:
-- one field's terms and one language's words and phrases. Published directly
-- (built-in, public, slugs on every term), the state admin publishing leaves.
-- ---------------------------------------------------------------------------

do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_collection_standup uuid := '22222222-2222-2222-2222-222222222225';
  v_collection_dutch uuid := '22222222-2222-2222-2222-222222222226';
begin
  insert into public.collections (
    id, name, description, visibility, owner_id, is_builtin, is_public, slug, kind, language
  )
  values
    (
      v_collection_standup,
      'Standup',
      'The vocabulary around daily standups and the agile ceremonies, roles, and artifacts around them.',
      'shared', v_admin_id, true, true, 'standup', 'terms', 'en'
    ),
    (
      v_collection_dutch,
      'Dutch basics',
      'Everyday Dutch words and the small words that make it sound natural.',
      'shared', v_admin_id, true, true, 'dutch-basics', 'vocabulary', 'nl'
    );

  insert into public.terms (collection_id, term, slug, category, definition, example)
  values
    (v_collection_standup, 'Blocker', 'blocker', 'Tracking',
      'Anything stopping a piece of work from moving that the person can''t clear alone.',
      '"I''m blocked until the API team deploys their fix."'),
    (v_collection_standup, 'Zombie ticket', 'zombie-ticket', 'Tracking',
      'A ticket marked in progress that hasn''t actually moved in days.',
      'It has been "In progress" for three sprints with the same update every morning.'),
    (v_collection_standup, 'Carryover', 'carryover', 'Tracking',
      'Unfinished work pushed into the next sprint.', null),
    (v_collection_standup, 'Parking lot', 'parking-lot', 'Meeting format',
      'Topics raised in standup that move to a separate conversation so the meeting stays short.',
      'Two people start debating a migration; someone says "parking lot" and they take it offline.'),
    (v_collection_standup, 'Walking the board', 'walking-the-board', 'Meeting format',
      'Running standup column by column on the board instead of person by person.', null),
    (v_collection_standup, 'Spike', 'spike', 'Planning',
      'A time-boxed task to answer a question or reduce uncertainty, not to ship anything.',
      '"Spike: can we reuse the existing auth library?"'),
    (v_collection_standup, 'Velocity', 'velocity', 'Metrics',
      'How many story points a team usually finishes per sprint.',
      'The team has averaged 30 points over the last three sprints.'),
    (v_collection_standup, 'Scope creep', 'scope-creep', 'Metrics',
      'Work quietly added to a sprint after it started, without replanning.', null),
    (v_collection_dutch, 'lopen', 'lopen', 'Verbs', 'to walk', 'Ik loop elke dag naar mijn werk.'),
    (v_collection_dutch, 'fietsen', 'fietsen', 'Verbs', 'to cycle', 'We fietsen naar het strand.'),
    (v_collection_dutch, 'gezellig', 'gezellig', 'Adjectives',
      'cosy, sociable, pleasant: about a place, a person or a moment', 'Wat een gezellige avond!'),
    (v_collection_dutch, 'eigenlijk', 'eigenlijk', 'Small words',
      'actually, really; softens or corrects what came before', 'Eigenlijk heb ik geen tijd.'),
    (v_collection_dutch, 'toch', 'toch', 'Small words',
      'after all, still; asks for agreement at the end of a sentence', 'Je komt toch?'),
    (v_collection_dutch, 'misschien', 'misschien', 'Small words', 'maybe, perhaps', null);
end;
$$;

-- ---------------------------------------------------------------------------
-- One small public collection per additional content language, each with a
-- single term, so every language has something to browse, read and narrate
-- locally. Same shape as "Dutch basics" above.
-- ---------------------------------------------------------------------------

do $$
declare
  v_admin_id uuid := '11111111-1111-1111-1111-111111111111';
  v_collection_es uuid := '22222222-2222-2222-2222-222222222227';
  v_collection_fr uuid := '22222222-2222-2222-2222-222222222228';
  v_collection_de uuid := '22222222-2222-2222-2222-222222222229';
  v_collection_it uuid := '22222222-2222-2222-2222-22222222222a';
  v_collection_pt uuid := '22222222-2222-2222-2222-22222222222b';
  v_collection_ru uuid := '22222222-2222-2222-2222-22222222222c';
  v_collection_tr uuid := '22222222-2222-2222-2222-22222222222d';
  v_collection_ja uuid := '22222222-2222-2222-2222-22222222222e';
  v_collection_ko uuid := '22222222-2222-2222-2222-22222222222f';
  v_collection_zh uuid := '22222222-2222-2222-2222-222222222230';
begin
  insert into public.collections (
    id, name, description, visibility, owner_id, is_builtin, is_public, slug, kind, language
  )
  values
    (v_collection_es, 'Spanish basics', 'A first Spanish word to try.',
      'shared', v_admin_id, true, true, 'spanish-basics', 'vocabulary', 'es'),
    (v_collection_fr, 'French basics', 'A first French word to try.',
      'shared', v_admin_id, true, true, 'french-basics', 'vocabulary', 'fr'),
    (v_collection_de, 'German basics', 'A first German word to try.',
      'shared', v_admin_id, true, true, 'german-basics', 'vocabulary', 'de'),
    (v_collection_it, 'Italian basics', 'A first Italian word to try.',
      'shared', v_admin_id, true, true, 'italian-basics', 'vocabulary', 'it'),
    (v_collection_pt, 'Portuguese basics', 'A first Portuguese word to try.',
      'shared', v_admin_id, true, true, 'portuguese-basics', 'vocabulary', 'pt'),
    (v_collection_ru, 'Russian basics', 'A first Russian word to try.',
      'shared', v_admin_id, true, true, 'russian-basics', 'vocabulary', 'ru'),
    (v_collection_tr, 'Turkish basics', 'A first Turkish word to try.',
      'shared', v_admin_id, true, true, 'turkish-basics', 'vocabulary', 'tr'),
    (v_collection_ja, 'Japanese basics', 'A first Japanese phrase to try.',
      'shared', v_admin_id, true, true, 'japanese-basics', 'vocabulary', 'ja'),
    (v_collection_ko, 'Korean basics', 'A first Korean word to try.',
      'shared', v_admin_id, true, true, 'korean-basics', 'vocabulary', 'ko'),
    (v_collection_zh, 'Mandarin basics', 'A first Mandarin phrase to try.',
      'shared', v_admin_id, true, true, 'mandarin-basics', 'vocabulary', 'zh');

  insert into public.terms (collection_id, term, slug, category, definition, example)
  values
    (v_collection_es, 'sobremesa', 'sobremesa', 'Everyday life',
      'time spent talking at the table after a meal is over',
      'Después de comer, nos quedamos de sobremesa una hora.'),
    (v_collection_fr, 'flâner', 'flaner', 'Verbs',
      'to stroll without a goal, enjoying the surroundings',
      'J''aime flâner dans les rues de Paris le dimanche.'),
    (v_collection_de, 'Feierabend', 'feierabend', 'Everyday life',
      'the end of the working day, and the free time that follows',
      'Nach Feierabend gehen wir noch etwas trinken.'),
    (v_collection_it, 'magari', 'magari', 'Small words',
      'maybe; also "if only", used to wish for something',
      'Magari avessi più tempo!'),
    (v_collection_pt, 'saudade', 'saudade', 'Feelings',
      'a warm longing for someone or something that is far away or in the past',
      'Tenho saudade da minha família.'),
    (v_collection_ru, 'соскучиться', 'soskuchitsya', 'Verbs',
      'to start missing someone or something; used with "по"',
      'Я соскучился по тебе.'),
    (v_collection_tr, 'afiyet olsun', 'afiyet-olsun', 'Phrases',
      'enjoy your meal; said to someone who is eating or about to eat',
      'Afiyet olsun! Yemek çok güzel görünüyor.'),
    (v_collection_ja, 'お疲れ様です', 'otsukaresama-desu', 'Phrases',
      'a greeting that thanks someone for their effort, used at work and with friends',
      '今日もお疲れ様です。'),
    (v_collection_ko, '눈치', 'nunchi', 'Everyday life',
      'the ability to sense what others feel and read the mood of a room',
      '그 사람은 눈치가 빨라요.'),
    (v_collection_zh, '加油', 'jiayou', 'Phrases',
      'come on, keep going; a cheer of encouragement (literally "add oil")',
      '考试加油！');
end;
$$;
