import e, { Request, Response } from "express"
import { InspectionContext } from "../main.js";

export interface InspectionApi {
    nodesByClassifier(req: Request, res: Response): void

    nodesByLanguage(req: Request, res: Response): void
}

class InspectionApiImpl implements InspectionApi {
    constructor(private context: InspectionContext) {
    }

    nodesByClassifier = async (req: e.Request, res: e.Response)=> {
        const sql = this.context.inspectionQueries.nodesByClassifier();
        const queryResult = await this.context.inspectionApiWorker.nodesByClassifier(sql)
        res.send(queryResult)
    }

    nodesByLanguage = async (req: e.Request, res: e.Response) => {
        const sql = this.context.inspectionQueries.nodesByLanguage();
        const queryResult = await this.context.inspectionApiWorker.nodesByLanguage(sql)
        res.send(queryResult)
    }
}

export function createInspectionApi(context: InspectionContext): InspectionApi {
    return new InspectionApiImpl(context);
}

