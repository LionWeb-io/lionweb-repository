# Configuration

The file `server-config.json` is used to configure the server:
It should be in the same folder where the server is started, if it does not exist, default values will be used.

It is possible to specify a different path for the configuration file.
For example:
```
npm run dev ../../../lwrepo-conf/server-config.json
```

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
    // Whether to create a new database at startup.
    // Note that the new database will overwrite any existing database  
    // Values are "always" | "never" | "if-not-exists"
    "createDatabase": "always",
    // The list of repositories to be created at start uo, can be empty
    "createRepositories": [
      {
        // Repository name
        "name": "default",
        //
        // Values are "always" | "never" | "if-not-exists"
        create: "if-not-exists"
        // Whether the repository should keep the history
        "history": false,
        // Values can be: "2023.1" | "2024.1"
        lionWebVersion: "2023.1"
      }
    ]
  },
  "logging": {
    // Logging level for reuests logging
    "request": "info",
    // Logging level for detailed tracing
    "trace": "silent",
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
      // The name of the admin database
      maintenanceDb: "postgres" ,
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

* **postgres.database** (default `lionweb`): The name of the Postgres database to be used within the Postgres server.

## Node application configuration

* **server.serverPort** (default `3005`): Port at which the lionweb repository can be reached
* **server.bodyLimit** (default `50mb`): Maximum size of the body requests accepted by the lionweb repository

## Other configuration parameters

* **logging.database** (default `silent`): Print queries and other information related to the DB
* **logging.request** (default `info`): Print logs about the requested received
* **server.expectedToken** (default to _no token_): When a token is specified, it should be provided in all calls. 
  Otherwise, they would be rejected.
