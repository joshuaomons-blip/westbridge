-- Security hardening: API roles never need TRUNCATE, TRIGGER or REFERENCES.
-- TRUNCATE in particular is not subject to row-level security.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;
