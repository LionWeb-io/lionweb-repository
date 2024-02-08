import { runWithTry, } from "@lionweb/repository-dbadmin";
import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"

import { createInspectionApiWorker, InspectionApiWorker } from "./database/InspectionApiWorker.js"
import { createInspectionApi, InspectionApi } from "./controllers/InspectionApi.js"
import { InspectionQueries } from "./database/InspectionQueries.js";

export class InspectionContext {
    dbConnection: pgPromise.IDatabase<object, pg.IClient>
    pgp: pgPromise.IMain<object, pg.IClient>
    inspectionApi: InspectionApi
    inspectionQueries: InspectionQueries
    inspectionApiWorker: InspectionApiWorker

    constructor(dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.inspectionApi = createInspectionApi(this)
        this.inspectionQueries = new InspectionQueries()
        this.inspectionApiWorker = createInspectionApiWorker(this)
    }
}

export function registerInspection(app: Express, dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
    console.log("Registering Inspection");
    // Create all objects 
    const context = new InspectionContext(dbConnection, pgp)

    // Add routes to application
    app.get("/inspection/nodesByClassifier", runWithTry(context.inspectionApi.nodesByClassifier))
    app.get("/inspection/nodesByLanguage", runWithTry(context.inspectionApi.nodesByLanguage))
}
