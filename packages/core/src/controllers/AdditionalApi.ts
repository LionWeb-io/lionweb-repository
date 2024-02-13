import { Request, Response } from "express"
import { ADDITIONAL_API_WORKER } from "./AdditionalApiWorker.js"
import {logger} from "../logging.js";

export interface AdditionalApi {
    getNodeTree(req: Request, res: Response): void
}

class AdditionalApiImpl implements AdditionalApi {
    /**
     * Get the tree with root `id`, for one single node
     * @param req
     * @param res
     */
    async getNodeTree(req: Request, res: Response) {
        const idList = req.body.ids
        let depthLimit = Number.parseInt(req.query["depthLimit"] as string)
        if (isNaN(depthLimit)) {
            depthLimit = 99
        }
        logger.dbLog("API.getNodeTree is " + idList)
        const result = await ADDITIONAL_API_WORKER.getNodeTree(idList, depthLimit)
        res.send(result)
    }
}

export const ADDITIONAL_API: AdditionalApi = new AdditionalApiImpl()
