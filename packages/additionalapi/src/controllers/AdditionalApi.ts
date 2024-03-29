import { Request, Response } from "express"
import { AdditionalApiContext } from "../main.js"
import { HttpSuccessCodes, lionwebResponse, logger } from "@lionweb/repository-common"

export interface AdditionalApi {
    getNodeTree(req: Request, response: Response): void
}

export class AdditionalApiImpl implements AdditionalApi {
    constructor(private context: AdditionalApiContext) {
    }
    /**
     * Get the tree with root `id`, for one single node
     * @param req
     * @param response
     */
    getNodeTree = async (req: Request, response: Response): Promise<void> => {
        const idList = req.body.ids
        let depthLimit = Number.parseInt(req.query["depthLimit"] as string)
        if (isNaN(depthLimit)) {
            depthLimit = 99
        }
        logger.dbLog("API.getNodeTree is " + idList)
        const result = await this.context.additionalApiWorker.getNodeTree(idList, depthLimit)
        lionwebResponse(response, HttpSuccessCodes.Ok, {
            success: true,
            messages: [],
        })
        response.send(result)
    }
}
