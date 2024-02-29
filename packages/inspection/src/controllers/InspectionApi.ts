import e, { Request, Response } from "express"
import { InspectionContext } from "../main.js";

export interface InspectionApi {
    nodesByClassifier(req: Request, response: Response): void

    nodesByLanguage(req: Request, response: Response): void
}

class InspectionApiImpl implements InspectionApi {
    constructor(private context: InspectionContext) {
    }

    nodesByClassifier = async (req: e.Request, response: e.Response)=> {
        const sql = this.context.inspectionQueries.nodesByClassifier();
        const queryResult = await this.context.inspectionApiWorker.nodesByClassifier(sql)
        response.send(queryResult)
    }

    nodesByLanguage = async (req: e.Request, response: e.Response) => {
        const sql = this.context.inspectionQueries.nodesByLanguage();
        const queryResult = await this.context.inspectionApiWorker.nodesByLanguage(sql)
        response.send(queryResult)
    }
}

export function createInspectionApi(context: InspectionContext): InspectionApi {
    return new InspectionApiImpl(context);
}

