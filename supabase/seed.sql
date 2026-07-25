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
  set role = 'admin'
  where id = v_admin_id;

  -- Spare single-use codes for signup testing (created by admin)
  insert into public.referral_codes (code, created_by)
  values
    ('WELCOME1', v_admin_id),
    ('WELCOME2', v_admin_id),
    ('WELCOME3', v_admin_id);

  -- Sample domain + jargon terms
  insert into public.domains (id, name, created_by)
  values (
    '22222222-2222-2222-2222-222222222222',
    'Software Engineering',
    v_admin_id
  );

  insert into public.terms (
    term,
    category,
    definition,
    example,
    discussion,
    controversy,
    domain_id,
    created_by
  )
  values
    (
      'Coupling',
      'Architecture',
      $t$The degree to which one component depends on another's internals — the tighter the coupling, the more a change on one side risks breaking the other.$t$,
      $t$Billing code that directly reads fields from the user-profile table breaks if that table changes.$t$,
      $t$Teams usually reduce coupling by communicating through a stable API or event contract instead of reaching into another service's internal data model directly.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Cohesion',
      'Architecture',
      $t$How tightly a module's responsibilities relate to one single purpose, rather than being a grab-bag of unrelated tasks.$t$,
      $t$A module that only sends emails is more cohesive than one that also handles payments and analytics.$t$,
      $t$High cohesion and low coupling tend to go together — a module that does one thing well rarely needs to know much about its neighbors.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Separation of concerns',
      'Architecture',
      $t$Structuring a system so each part owns one distinct responsibility, with minimal overlap between parts.$t$,
      $t$The code that renders a page shouldn't also decide business rules like discount eligibility.$t$,
      $t$Layered architectures — presentation, business logic, data access — are a direct application of this; mixing layers is usually where tangled 'god classes' come from.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Single source of truth (SSOT)',
      'Architecture',
      $t$Designating one system or table as the definitive record for a piece of data, so every other copy defers to it instead of drifting out of sync.$t$,
      $t$Storing a user's email in one canonical table instead of three that can disagree.$t$,
      $t$Distributed systems complicate this ideal, since services often keep local copies for performance — the trick is making one source authoritative and treating the rest as derived caches.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Composition over inheritance',
      'Architecture',
      $t$Building behavior by assembling small, independent objects instead of extending a shared base class, avoiding deep and fragile class hierarchies.$t$,
      $t$Building with swappable Lego-like pieces instead of a rigid class hierarchy.$t$,
      $t$Inheritance tightly couples a subclass to its parent's implementation details, so a change deep in the hierarchy can ripple unpredictably; composition keeps that coupling explicit and swappable.$t$,
      $t$Not universal — this advice, popularized to fix inheritance abuse in Java-era OOP, is sometimes applied too dogmatically today, when a shallow, well-understood inheritance hierarchy is genuinely simpler than a pile of composed objects.$t$,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Dependency injection (DI)',
      'Architecture',
      $t$Supplying an object's dependencies from the outside instead of having it construct them itself, so those dependencies are easy to swap or mock.$t$,
      $t$Passing an Engine into a Car instead of the Car building its own, so you can swap engines later.$t$,
      $t$Frameworks like Spring, Angular, and NestJS implement this via a container that resolves and injects dependencies automatically by type, instead of requiring manual wiring everywhere.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Inversion of control (IoC)',
      'Architecture',
      $t$A design principle where a framework calls into your code (rather than your code calling the framework), so the framework — not you — drives the overall flow of execution.$t$,
      $t$A hotel's housekeeping schedule decides when your room gets serviced, not you.$t$,
      $t$Dependency injection is one specific form of IoC — the broader pattern also covers plugin architectures and template methods, where the framework decides when your code runs.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Interface',
      'Architecture',
      $t$A defined set of operations something promises to support, without specifying how those operations are implemented internally.$t$,
      $t$A USB port — any device that fits the shape and protocol works, regardless of what's inside.$t$,
      $t$Programming against an interface rather than a concrete class is what makes mocking, dependency injection, and swapping implementations at runtime possible in the first place.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Trade-off',
      'Design',
      $t$A decision where gaining more of one desirable property necessarily means giving up some of another.$t$,
      $t$Faster load times at the cost of higher memory use.$t$,
      $t$Naming the trade-off explicitly in a design doc or ADR is usually more valuable than debating which option is 'better' in the abstract, since the right answer depends on which cost the team can actually afford.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    ),
    (
      'Scalability',
      'Design',
      $t$A system's ability to handle growth in users, data, or traffic by adding resources, rather than needing a redesign.$t$,
      $t$A restaurant chain built to handle a rush of 500 vs. a food truck serving 20 people an hour.$t$,
      $t$Horizontal scaling (more machines) and vertical scaling (a bigger machine) solve this differently — horizontal scaling usually requires the system to be stateless or partition-aware first.$t$,
      null,
      '22222222-2222-2222-2222-222222222222',
      v_admin_id
    );

  insert into public.term_relationships (
    source_term_id,
    target_term_id,
    relationship_type,
    description,
    created_by
  )
  select
    source.id,
    target.id,
    'often confused with',
    '',
    v_admin_id
  from public.terms as source
  cross join public.terms as target
  where source.term = 'Coupling'
    and target.term = 'Cohesion';
end;
$$;
