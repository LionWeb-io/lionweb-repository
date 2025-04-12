import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"

import { DbConnection, requestLogger, runWithTry } from "@lionweb/repository-common"
import { createInspectionApiWorker, InspectionApiWorker } from "./database/InspectionApiWorker.js"
import { createInspectionApi, InspectionApi } from "./controllers/InspectionApi.js"
import { InspectionQueries } from "./database/InspectionQueries.js"

/**
 * Object containing 'global' contextual objects for this API.
 * Avoids using glocal variables, as they easily get mixed up between the various API packages.
 */
export class InspectionContext {
    dbConnection: DbConnection
    pgp: pgPromise.IMain<object, pg.IClient>
    inspectionApi: InspectionApi
    inspectionQueries: InspectionQueries
    inspectionApiWorker: InspectionApiWorker

    constructor(dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.inspectionApi = createInspectionApi(this)
        this.inspectionQueries = new InspectionQueries()
        this.inspectionApiWorker = createInspectionApiWorker(this)
    }
}

/**
 * Register all api methods with the _app_
 * @param app           The app to which the api is registered
 * @param dbConnection  The database connection to be used by this API
 * @param pgp           The pg-promise object to gain access to the pg helpers
 */

export function registerInspection(app: Express, dbConnection: DbConnection, pgp: pgPromise.IMain<object, pg.IClient>) {
    requestLogger.info("Registering Inspection Module")
    // Create all objects
    const context = new InspectionContext(dbConnection, pgp)

    // Add routes to application
    app.get("/inspection/nodesByClassifier", runWithTry(context.inspectionApi.nodesByClassifier))
    app.get("/inspection/nodesByLanguage", runWithTry(context.inspectionApi.nodesByLanguage))
}
