-- Luzanika database setup, step 1 of 2.
-- Run ONCE as the PostgreSQL superuser (postgres), connected to the "postgres" database.
--
-- Before running: replace the two passwords below. Use long random values with
-- only letters and digits (so they need no escaping in the connection URLs).
-- Keep them out of the repository: they go in .env.local only.
--
-- It creates:
--   luzanika_migrator  owns the databases, may change the schema (used only to run migrations)
--   luzanika_app       what the running website connects as: reads and writes rows, nothing else
--   luzanika           development database
--   luzanika_test      database used by the automated tests

CREATE ROLE luzanika_migrator LOGIN PASSWORD 'REPLACE_WITH_MIGRATOR_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

CREATE ROLE luzanika_app LOGIN PASSWORD 'REPLACE_WITH_APP_PASSWORD'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

-- If you already created the "luzanika" database yourself in pgAdmin, DELETE the
-- "CREATE DATABASE luzanika ..." line below and run this one instead (after the roles exist):
--   ALTER DATABASE luzanika OWNER TO luzanika_migrator;
CREATE DATABASE luzanika OWNER luzanika_migrator ENCODING 'UTF8' TEMPLATE template0;
CREATE DATABASE luzanika_test OWNER luzanika_migrator ENCODING 'UTF8' TEMPLATE template0;

-- Nobody else can connect; the app role may only connect, not create anything.
REVOKE ALL ON DATABASE luzanika FROM PUBLIC;
REVOKE ALL ON DATABASE luzanika_test FROM PUBLIC;
GRANT CONNECT ON DATABASE luzanika TO luzanika_app;
GRANT CONNECT ON DATABASE luzanika_test TO luzanika_app;
