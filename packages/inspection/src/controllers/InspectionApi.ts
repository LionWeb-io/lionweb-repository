import e, { Request, Response } from "express"
import { INSPECTION_WORKER } from "../database/InspectionApiWorker.js";
import { INSPECTION_QUERIES } from "../database/InspectionQueries.js"

export interface InspectionApi {
    nodesByConcept(req: Request, res: Response): void
}

class InspectionApiImpl implements InspectionApi {

    async nodesByConcept(req: e.Request, res: e.Response) {
        const sql = INSPECTION_QUERIES.nodesByConcept();
        await INSPECTION_WORKER.nodesByConcept(sql)
        throw new Error("Not implemented");
    }
}

export function createInspectionApi() : InspectionApi {
    return new InspectionApiImpl();
}

