-- Luzanika database setup, step 2 of 2.
-- Run as the PostgreSQL superuser (postgres) TWICE: once connected to the
-- "luzanika" database and once connected to "luzanika_test".
-- (In pgAdmin: right-click the database > Query Tool, paste this file, run.)

-- Case-insensitive text for emails and coupon codes.
CREATE EXTENSION IF NOT EXISTS citext;

-- Only the migrator may create tables. The app may only use them.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO luzanika_migrator;
GRANT USAGE ON SCHEMA public TO luzanika_app;

-- Every table or sequence the migrator creates from now on is automatically
-- usable (but not alterable) by the app role. Migrations later take away
-- UPDATE/DELETE on append-only tables such as audit logs.
ALTER DEFAULT PRIVILEGES FOR ROLE luzanika_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO luzanika_app;
ALTER DEFAULT PRIVILEGES FOR ROLE luzanika_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO luzanika_app;
