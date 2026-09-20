-- Remove the throwaway CI probe now that production deploy has been verified.

drop schema if exists ci_migration_probe cascade;
