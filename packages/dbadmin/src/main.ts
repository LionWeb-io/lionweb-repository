import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { runWithTry, DbConnection } from "@lionweb/repository-common";
import { DBAdminApi, DBAdminApiImpl } from "./controllers/DBAdminApi.js"
import { DBAdminApiWorker } from "./database/DBAdminApiWorker.js"

/**
 * Object containing 'global' contextual objects for this API.
 * Avoids using glocal variables, as they easily get mixed up between the various API packages.
 */
export class DbAdminApiContext {
    dbConnectionNew: DbConnection
    /**
     * The _postgresConnection_ has no database in the config, so this can be used to create or drop databases
     */
    postgresConnection: pgPromise.IDatabase<object, pg.IClient>
    pgp: pgPromise.IMain<object, pg.IClient>
    dbAdminApi: DBAdminApi
    dbAdminApiWorker: DBAdminApiWorker

    constructor(dbNew: DbConnection, pgConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnectionNew = dbNew
        this.postgresConnection = pgConnection
        this.pgp = pgp
        this.dbAdminApi = new DBAdminApiImpl(this)
        this.dbAdminApiWorker = new DBAdminApiWorker(this)
    }
}

/**
 * Register all api methods with the _app_
 * @param app           The app to which the api is registered
 * @param dbConnection  The database connection to be used by this API
 * @param pgp           The pg-promise object to gain access to the pg helpers
 */
export function registerDBAdmin(
    app: Express,
    dbNew: DbConnection,
    pgConnection: pgPromise.IDatabase<object, pg.IClient>,
    pgp: pgPromise.IMain<object, pg.IClient>) {
    console.log("Registering DB Admin Module");
    // Create all objects 
    const dbAdminApiContext = new DbAdminApiContext(dbNew, pgConnection, pgp)

    // Add routes to app
    app.post("/init", runWithTry(dbAdminApiContext.dbAdminApi.init))
    app.post("/initRepository", runWithTry(dbAdminApiContext.dbAdminApi.initRepository))
    app.post("/initRepositoryWithoutHistory", runWithTry(dbAdminApiContext.dbAdminApi.initRepositoryWithoutHistory))
    app.post("/initWithoutHistory", runWithTry(dbAdminApiContext.dbAdminApi.initWithoutHistory))
    app.post("/createDatabase", runWithTry(dbAdminApiContext.dbAdminApi.createDatabase))
}
