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
        await INSPECTION_WORKER.nodesByClassifier(sql)
        throw new Error("Not implemented");
    }

    async nodesByLanguage(req: e.Request, res: e.Response) {
        const sql = INSPECTION_QUERIES.nodesByLanguage();
        await INSPECTION_WORKER.nodesByLanguage(sql)
        throw new Error("Not implemented");
    }
}

export function createInspectionApi() : InspectionApi {
    return new InspectionApiImpl();
}

