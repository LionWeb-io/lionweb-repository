import e, { Request, Response } from "express"
import { INSPECTION_WORKER } from "../database/InspectionApiWorker.js";
import { INSPECTION_QUERIES } from "../database/InspectionQueries.js"

export interface InspectionApi {
    nodesByClassifier(req: Request, res: Response): void

    nodesByLanguage(req: Request, res: Response): void
}

class InspectionApiImpl implements InspectionApi {

    async nodesByClassifier(req: e.Request, res: e.Response) {
        const sql = INSPECTION_QUERIES.nodesByClassifier();
        const queryResult = await INSPECTION_WORKER.nodesByClassifier(sql)
        res.send(queryResult)
    }

    async nodesByLanguage(req: e.Request, res: e.Response) {
        const sql = INSPECTION_QUERIES.nodesByLanguage();
        const queryResult = await INSPECTION_WORKER.nodesByLanguage(sql)
        res.send(queryResult)
    }
}

export function createInspectionApi(): InspectionApi {
    return new InspectionApiImpl();
}

