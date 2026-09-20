-- Temporary probe for the migration CI/deploy pipeline. Not used by the app.
-- A follow-up migration will drop this schema after we confirm it landed.

create schema ci_migration_probe;

create table ci_migration_probe.marker (
  id boolean primary key default true check (id),
  note text not null default 'ci-migration-probe'
);

insert into ci_migration_probe.marker (id, note)
values (true, 'ci-migration-probe');
