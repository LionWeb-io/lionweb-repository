# lionweb-repository
Reference implementation of LionWeb repository

## Postgres
The database used for storage of models is Postgres, 
the easiest way to set up Postgres is through Docker.

The Postgres version currently being used is: postgres:16.1.
The `.env` file contains the user/database/port names and numbers being used.

![picture of database schema](docs/database-schema.svg "Database Schema")

The `lionweb_properties.property`, `lionweb_containments.containment` and `lionweb_references.reference` 
fields are LionWeb metapointers.

We use `pgAdmin 4` to test queries and look directly into the database. 

### How to start Postgres through docker

```
# download docker
docker pull postgres:16.1

# create a container and run it
docker run -d --name lionwebrepodb -p 5432:5432 -e POSTGRES_PASSWORD=lionweb postgres:16.1
```

### How to build

```
npm install
npm run build
npm run lint
```

### How to start the repository server
Ensure that Postgress is running.
The repository server is started with `npm run dev` in  the `packages/core` folder:

```
cd packages/core
npm run dev
```

### How to test
Ensure the Postgres server and the repository server are both running.
Then do

```
npm run test
```

## Status
This repository is Work In Progress, currently:
- Changes in children: adding, removing, moving are supported
- Changes of property values are supported
- Changes of reference targets are supported
- Changes of annotations are supported.
 
##  Packages

### dbadmin
Contains code to manipulate the Postgres database (create, initialize)

### core
The core repository

### test
Tests for the core package

## CI
In GitHub actions a Postgres server is started on a host named `postgres`.
In your local development environment, this hostname is also being used.
You need to ensure that this hostname points to the Postgres server. 
