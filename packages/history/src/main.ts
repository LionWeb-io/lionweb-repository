import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { DbConnection, requestLogger, runWithTry } from "@lionweb/repository-common"
import { HistoryApiWorker } from "./controllers/HistoryApiWorker.js"
import { HistoryApi, HistoryApiImpl } from "./controllers/index.js"
import { HistoryQueries } from "./database/index.js"

/**
 * Object containing 'global' contextual objects for this API.
 * Avoids using glocal variables, as they easily get mixed up between the various API packages.
 */
export class HistoryContext {
    dbConnection: DbConnection
    pgp: pgPromise.IMain<object, pg.IClient>
    historyApiWorker: HistoryApiWorker
    historyApi: HistoryApi
    queries: HistoryQueries

    /**
     * Create the object and initialize all its members.
     * @param dbConnection  The database connection to be used by this API
     * @param pgp           The pg-promise object to gain access to the pg helpers
     */
    constructor(dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.historyApi = new HistoryApiImpl(this)
        this.historyApiWorker = new HistoryApiWorker(this)
        this.queries = new HistoryQueries(this)
    }
}

/**
 * Register all api methods with the _app_
 * @param app           The app to which the api is registered
 * @param dbConnection  The database connection to be used by this API
 * @param pgp           The pg-promise object to gain access to the pg helpers
 */
export function registerHistoryApi(app: Express, dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>) {
    requestLogger.info("Registering History API Module")
    // Create all objects
    const context = new HistoryContext(dbConnection, pgp)

    // Add routes to application
    app.post("/history/listPartitions", runWithTry(context.historyApi.listPartitions))
    app.post("/history/retrieve", runWithTry(context.historyApi.retrieve))
}
