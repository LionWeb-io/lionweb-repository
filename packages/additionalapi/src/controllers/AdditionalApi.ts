import { Request, Response } from "express"
import { AdditionalApiContext } from "../main.js"
import { logger } from "@lionweb/repository-dbadmin"

export interface AdditionalApi {
    getNodeTree(req: Request, res: Response): void
}

export class AdditionalApiImpl implements AdditionalApi {
    constructor(private context: AdditionalApiContext) {
    }
    /**
     * Get the tree with root `id`, for one single node
     * @param req
     * @param res
     */
    getNodeTree = async (req: Request, res: Response)=> {
        const idList = req.body.ids
        let depthLimit = Number.parseInt(req.query["depthLimit"] as string)
        if (isNaN(depthLimit)) {
            depthLimit = 99
        }
        logger.dbLog("API.getNodeTree is " + idList)
        const result = await this.context.additionalApiWorker.getNodeTree(idList, depthLimit)
        res.send(result)
    }
}
