import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { runWithTry } from "@lionweb/repository-dbadmin";
import { AdditionalApiWorker } from "./controllers/AdditionalApiWorker.js";
import { AdditionalApiImpl } from "./controllers/index.js";
import { AdditionalQueries } from "./database/index.js";

export class AdditionalApiContext {
    dbConnection: pgPromise.IDatabase<object, pg.IClient>
    pgp: pgPromise.IMain<object, pg.IClient>
    additionalApiWorker: AdditionalApiWorker
    additionalApi: AdditionalApiImpl
    queries: AdditionalQueries

    constructor(dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.additionalApi = new AdditionalApiImpl(this)
        this.additionalApiWorker = new AdditionalApiWorker(this)
        this.queries = new AdditionalQueries(this)
    }
}

export function registerAdditionalApi(app: Express, dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
    console.log("Registering Additional API");
    // Create all objects 
    const context = new AdditionalApiContext(dbConnection, pgp)

    // Add routes to application
    app.get("/additional/getNodeTree", runWithTry(context.additionalApi.getNodeTree))
}
