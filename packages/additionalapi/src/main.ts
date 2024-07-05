import {Express, raw} from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { DbConnection, requestLogger, runWithTry } from "@lionweb/repository-common";
import { AdditionalApiWorker } from "./controllers/AdditionalApiWorker.js";
import { AdditionalApiImpl } from "./controllers/index.js";
import { AdditionalQueries } from "./database/index.js";
import {Pool} from "pg";

/**
 * Object containing 'global' contextual objects for this API.
 * Avoids using glocal variables, as they easily get mixed up between the various API packages.
 */
export class AdditionalApiContext {
    dbConnection: DbConnection
    pgp: pgPromise.IMain<object, pg.IClient>
    pgPool: Pool
    additionalApiWorker: AdditionalApiWorker
    additionalApi: AdditionalApiImpl
    queries: AdditionalQueries

    constructor(dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>, pgPool: Pool) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.pgPool = pgPool
        this.additionalApi = new AdditionalApiImpl(this)
        this.additionalApiWorker = new AdditionalApiWorker(this)
        this.queries = new AdditionalQueries(this)
    }
}

/**
 * Register all api methods with the _app_
 * @param app           The app to which the api is registered
 * @param dbConnection  The database connection to be used by this API
 * @param pgp           The pg-promise object to gain access to the pg helpers
 */
export function registerAdditionalApi(app: Express, dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>, pgPool: Pool) {
    requestLogger.info("Registering Additional API Module");
    // Create all objects 
    const context = new AdditionalApiContext(dbConnection, pgp, pgPool)

    // Add routes to application
    app.post("/additional/getNodeTree", runWithTry(context.additionalApi.getNodeTree))
    // app.post("/additional/bulkImport", runWithTry(context.additionalApi.bulkImport))
    app.post("/additional/bulkImport", runWithTry(context.additionalApi.bulkImport))
}
