import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { DBAdminApi, DBAdminApiImpl } from "./controllers/DBAdminApi.js"
import { DBAdminApiWorker } from "./database/DBAdminApiWorker.js"

export class DbAdminApiContext {
    dbConnection: pgPromise.IDatabase<object, pg.IClient>
    pgp: pgPromise.IMain<object, pg.IClient>
    dbAdminApi: DBAdminApi
    dbAdminApiWorker: DBAdminApiWorker

    constructor(dbConnection: pgPromise.IDatabase<object, pg.IClient>, pgp: pgPromise.IMain<object, pg.IClient>) {
        this.dbConnection = dbConnection
        this.pgp = pgp
        this.dbAdminApi = new DBAdminApiImpl(this)
        this.dbAdminApiWorker = new DBAdminApiWorker(this)
    }
}

export function registerDBAdmin(
    app: Express, 
    dbConnection: pgPromise.IDatabase<object, pg.IClient>, 
    pgp: pgPromise.IMain<object, pg.IClient>) 
{
    console.log("Registering DB Admin");
    // Create all objects 
    const dbAdminApiContext = new DbAdminApiContext(dbConnection, pgp)
    
    // Add routes to app
    app.post("/init", dbAdminApiContext.dbAdminApi.init)
}
