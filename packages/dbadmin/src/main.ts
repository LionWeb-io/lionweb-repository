import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { runWithTry, DbConnection, requestLogger } from "@lionweb/repository-common"
import { DBAdminApi, DBAdminApiImpl } from "./controllers/DBAdminApi.js"
import { DBAdminApiWorker } from "./database/DBAdminApiWorker.js"
import { repositoryStore } from "./database/index.js"

/**
 * Object containing 'global' contextual objects for this API.
 * Avoids using glocal variables, as they easily get mixed up between the various API packages.
 */
export class DbAdminApiContext {
    dbConnection: DbConnection
    /**
     * The _postgresConnection_ has no database in the config, so this can be used to create or drop databases
     */
    postgresConnection: pgPromise.IDatabase<object, pg.IClient>
    pgp: pgPromise.IMain<object, pg.IClient>
    dbAdminApi: DBAdminApi
    dbAdminApiWorker: DBAdminApiWorker

    constructor(
        dbConnection: DbConnection,
        pgConnection: pgPromise.IDatabase<object, pg.IClient>,
        pgp: pgPromise.IMain<object, pg.IClient>
    ) {
        this.dbConnection = dbConnection
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
 *
 * @return              The Api worker, can be used for internal server admin usage
 */
export function registerDBAdmin(
    app: Express,
    dbConnection: DbConnection,
    pgConnection: pgPromise.IDatabase<object, pg.IClient>,
    pgp: pgPromise.IMain<object, pg.IClient>
): DBAdminApiWorker {
    requestLogger.info("Registering DB Admin Module")
    // Create all objects
    const dbAdminApiContext = new DbAdminApiContext(dbConnection, pgConnection, pgp)
    repositoryStore.setContext(dbAdminApiContext)

    // Add routes to app
    app.post("/createRepository", runWithTry(dbAdminApiContext.dbAdminApi.createRepository))
    app.post("/deleteRepository", runWithTry(dbAdminApiContext.dbAdminApi.deleteRepository))
    app.post("/createDatabase", runWithTry(dbAdminApiContext.dbAdminApi.createDatabase))
    app.post("/listRepositories", runWithTry(dbAdminApiContext.dbAdminApi.listRepositories))

    return dbAdminApiContext.dbAdminApiWorker
}
