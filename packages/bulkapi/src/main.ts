import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { DbConnection, requestLogger, runWithTry } from "@lionweb/repository-common"
import { BulkApiWorker } from "./controllers/BulkApiWorker.js"
import { BulkApi, BulkApiImpl } from "./controllers/index.js"
import { LionWebQueries, QueryMaker } from "./database/index.js"

/**
 * Object containing 'global' contextual objects for this API.
 * Avoids using glocal variables, as they easily get mixed up between the various API packages.
 */
export class BulkApiContext {
    dbConnection: DbConnection
    pgp: pgPromise.IMain<object, pg.IClient>
    bulkApiWorker: BulkApiWorker
    bulkApi: BulkApi
    queries: LionWebQueries
    queryMaker: QueryMaker

    /**
     * Create the object and initialize all its members.
     * @param dbConnection  The database connection to be used by this API.
     * @param pgp           The pg-promise object to gain access to the pg helpers.
     */
    constructor(dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.bulkApi = new BulkApiImpl(this)
        this.bulkApiWorker = new BulkApiWorker(this)
        this.queries = new LionWebQueries(this)
        this.queryMaker = new QueryMaker(this)
    }
}

/**
 * Register all api methods with the _app_
 * @param app           The app to which the api is registered
 * @param dbConnection  The database connection to be used by this API
 * @param pgp           The pg-promise object to gain access to the pg helpers
 */
export function registerBulkApi(app: Express, dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>) {
    requestLogger.info("Registering Bulk API Module")
    // Create all objects
    const context = new BulkApiContext(dbConnection, pgp)

    // Add routes to application
    app.post("/bulk/createPartitions", runWithTry(context.bulkApi.createPartitions))
    app.post("/bulk/deletePartitions", runWithTry(context.bulkApi.deletePartitions))
    app.post("/bulk/listPartitions", runWithTry(context.bulkApi.listPartitions))
    app.post("/bulk/ids", runWithTry(context.bulkApi.ids))
    app.post("/bulk/store", runWithTry(context.bulkApi.store))
    app.post("/bulk/retrieve", runWithTry(context.bulkApi.retrieve))
}
