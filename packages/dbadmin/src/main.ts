import { Express } from "express"
import { createDBAdminApi, DBAdminApi } from "./controllers/DBAdminApi.js"
import pgPromise from "pg-promise"
import { createDBAdminApiWorker } from "./database/DBAdminApiWorker.js"

export function registerDBAdmin(app: Express, dbConnection: pgPromise.IDatabase<object>) {
    console.log("Registering DB Admin Module");
    createDBAdminApiWorker(dbConnection)
    const dbAdminApi: DBAdminApi = createDBAdminApi();
    app.post("/init", dbAdminApi.init)
}
