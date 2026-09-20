-- Remove the throwaway CI probe tables and schema now that production
-- deploy has been verified.

drop table if exists ci_migration_probe.marker;
drop table if exists ci_migration_probe.deploy_fix;
drop schema if exists ci_migration_probe cascade;
