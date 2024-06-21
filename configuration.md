# Configuration

Environment variables can be used to configure the project:

## Database configuration

* **PGHOST** (default `postgres`): The address at which the Postgres server can be reached
* **PGPORT** (default `5432`): The port at which the Postgres server can be reached
* **PGDB** (default `lionweb`): The name of the Postgres database to be used within the Postgres server. 
  Please note that the variable **PGDATABASE** is instead _directly_ accessed by Postgres 
  (see [Postrgres references](https://www.postgresql.org/docs/current/libpq-envars.html). 
  This is an issue when running the database create script. In that case Postgress would use the **PGDATABASE**
  to determine the name of the database that it should connect to. However, we would use it as the name of the database
  to be created. This would cause a very confusing error because it would appear that the CREATE DATABASE statement 
  would fail precisely because the database we want to create does not exist. 
  To avoid such confusion, we use a different environment variable.
* **PGUSER** (default `postgres`): The username used to connect to the Postgres server
* **PGPASSWORD** (default `lionweb`): The password used to connect to the Postgres server
* **PGROOTCERT** (default _none_): If present, the root certificate is used to verify SSL connections. 
  It should indicate a file. It should not be used with `PGROOTCERTCONTENT`.
* **PGROOTCERTCONTENT** (default _none_): If present, the root certificate is used to verify SSL connections.
    It should indicate the content of the file certificate. It should not be used with `PGROOTCERT`.

## Node application configuration

* **NODE_PORT** (default `3005`): Port at which the lionweb repository can be reached
* **BODY_LIMIT** (default `50mb`): Maximum size of the body requests accepted by the lionweb repository

## Other configuration parameters

* **DB_VERBOSITY** (default `false`): Print queries and other information related to the DB
* **REQUESTS_VERBOSITY** (default `true`): Print logs about the requested received
* **EXPECTED_TOKEN** (default to _no token_): When a token is specified, it should be provided in all calls. 
  Otherwise they would be rejected.
