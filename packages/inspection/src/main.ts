import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { createInspectionApiWorker } from "./database/InspectionApiWorker.js"
import { createInspectionApi, InspectionApi } from "./controllers/InspectionApi.js"

export function registerInspection(app: Express, dbConnection: pgPromise.IDatabase<object, pg.IClient>) {
    console.log("Registering Inspection Module");
    createInspectionApiWorker(dbConnection)
    const inspectionApi: InspectionApi = createInspectionApi();
    app.get("/inspection/nodesByClassifier", inspectionApi.nodesByClassifier)
    app.get("/inspection/nodesByLanguage", inspectionApi.nodesByLanguage)
}
