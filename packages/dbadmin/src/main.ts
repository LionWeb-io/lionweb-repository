import { Express } from "express"
import { createDBAdminApi, DBAdminApi } from "./controllers/DBAdminApi.js"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"

export function registerDBAdmin(app: Express, dbConnection: pgPromise.IDatabase<{ } , pg.IClient>) {
    console.log("Registering DB Admin");
    const dbAdminApi: DBAdminApi = createDBAdminApi(dbConnection);
    app.post("/init", dbAdminApi.init)
}
