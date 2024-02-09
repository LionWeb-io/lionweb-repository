# Configuration

Environment variables can be used to configure the project:

## Database configuration

* **PGHOST** (default `postgres`): The address at which the Postgres server can be reached
* **PGPORT** (default `5432`): The port at which the Postgres server can be reached
* **PGDATABASE** (default `lionweb_test`): The name of the Postgres database to be used within the Postgres server
* **PGUSER** (default `postgres`): The username used to connect to the Postgres server
* **PGPASSWORD** (default `lionweb`): The password used to connect to the Postgres server

## Node application configuration

* **NODE_PORT** (default `3005`): Port at which the lionweb repository can be reached
* **BODY_LIMIT** (default `50mb`): Maximum size of the body requests accepted by the lionweb repository

## Other configuration parameters

* **DB_VERBOSITY** (default `false`): Print queries and other information related to the DB
