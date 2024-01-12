import { Express } from "express"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { createInspectionApiWorker } from "./database/InspectionApiWorker.js"
import { createInspectionApi, InspectionApi } from "./controllers/InspectionApi.js"

export function registerInspection(app: Express, dbConnection: pgPromise.IDatabase<object , pg.IClient>) {
    console.log("Registering DB Admin");
    createInspectionApiWorker(dbConnection)
    const inspectionApi: InspectionApi = createInspectionApi();
    app.post("/inspection/nodesByClassifier", inspectionApi.nodesByClassifier)
    app.post("/inspection/nodesByLanguage", inspectionApi.nodesByLanguage)
}