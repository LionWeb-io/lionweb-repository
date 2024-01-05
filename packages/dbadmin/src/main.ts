import { Express } from "express"
import { createDBAdminApi, DBAdminApi } from "./controllers/DBAdminApi.js"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { createDBAdminApiWorker } from "./database/DBAdminApiWorker.js"

export function registerDBAdmin(app: Express, dbConnection: pgPromise.IDatabase<{ } , pg.IClient>) {
    console.log("Registering DB Admin");
    createDBAdminApiWorker(dbConnection)
    const dbAdminApi: DBAdminApi = createDBAdminApi();
    app.post("/init", dbAdminApi.init)
}
