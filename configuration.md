# Configuration

The file server-config.json is used to configure the server:
It should be in the same folder where the  server is started, if it does not exists, default values will be used"

Below is the server-config.json with all default values

````json5
{
  "server": {
    // The port where the server can be reached
    "serverPort": 3005,
    // Token to use for minimal security
    "expectedToken": null,
    // maximum body size
    "bodyLimit": '50mb'

  },
  "startup": {
    // Whether to create a new databse at startup.
    // Note that the new dartabase will overwrite any existing database  
    "createDatabase": true,
    // The list of repositories to be created at start uo, can be empty
    "createRepositories": [
      {
        // Repository name
        "name": "default",
        // Whether the repository should keep the history
        "history": false
      }
    ]
  },
  "logging": {
    // Logging level for reuests logging
    "request": "info",
    // Logging level for database actions
    "database": "silent",
    // logging level for (automatic) request/response logging
    "express": "silent"
  },
  "postgres": {
    // Postgress configuration
    "database": {
      // The address at which the Postgres server can be reached
      "host": "postgres",
      // The username used to connect to the Postgres server
      "user": "postgres",
      // The name of the Postgres database to be used within the Postgres server.
      "db": "lionweb",
      // The password used to connect to the Postgres server
      "password": "lionweb",
      // The port at which the Postgres server can be reached
      "port": 5432
    },
    // NOTE that you can have at most one of rootcert and rootcertcontent
    "certificates": {
      // If present, the root certificate is used to verify SSL connections. 
      // It should indicate a file. It should not be used with `rootcertcontent`
      "rootcert": null,
      // If present, the root certificate is used to verify SSL connections.
      // It should indicate the content of the file certificate. It should not be used with `rootcert`.
      "rootcertcontent": null
    }
  }
}

````

## Database configuration

* **PGDB** (default `lionweb`): The name of the Postgres database to be used within the Postgres server. 
  Please note that the variable **PGDATABASE** is instead _directly_ accessed by Postgres 
  (see [Postrgres references](https://www.postgresql.org/docs/current/libpq-envars.html). 
  This is an issue when running the database create script. In that case Postgress would use the **PGDATABASE**
  to determine the name of the database that it should connect to. However, we would use it as the name of the database
  to be created. This would cause a very confusing error because it would appear that the CREATE DATABASE statement 
  would fail precisely because the database we want to create does not exist. 
  To avoid such confusion, we use a different environment variable.

## Node application configuration

* **NODE_PORT** (default `3005`): Port at which the lionweb repository can be reached
* **BODY_LIMIT** (default `50mb`): Maximum size of the body requests accepted by the lionweb repository

## Other configuration parameters

* **DB_VERBOSITY** (default `false`): Print queries and other information related to the DB
* **REQUESTS_VERBOSITY** (default `true`): Print logs about the requested received
* **EXPECTED_TOKEN** (default to _no token_): When a token is specified, it should be provided in all calls. 
  Otherwise they would be rejected.
