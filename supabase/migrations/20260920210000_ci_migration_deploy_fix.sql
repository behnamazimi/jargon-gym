-- Second probe so the pooler-deploy fix PR has a migration of its own.
-- Dropped together with ci_migration_probe after we confirm it landed.

create table ci_migration_probe.deploy_fix (
  id boolean primary key default true check (id),
  note text not null default 'deploy-workflow-pooler-fix'
);

insert into ci_migration_probe.deploy_fix (id, note)
values (true, 'deploy-workflow-pooler-fix');
