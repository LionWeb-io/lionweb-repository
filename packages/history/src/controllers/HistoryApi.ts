// functions implementing the LionWeb bulk API
// - unpack the request
// - call controller to do actual work
// - pack response
import { Request, Response } from "express"
import { HistoryContext } from "../main.js"
import {
    logger,
    PartitionsResponse,
    lionwebResponse,
    HttpClientErrors, getStringParam, getIntegerParam, isParameterError, StoreResponse, FOREVER
} from "@lionweb/repository-common"

export interface HistoryApi {
    listPartitions: (request: Request, response: Response) => void
    retrieve: (request: Request, response: Response) => void
}

export class HistoryApiImpl implements HistoryApi {
    
    constructor(private ctx: HistoryContext) {
    }
    /**
     * Bulk API: Get all partitions (nodes without parent) from the repo
     * @param request no `parameters` or `body`
     * @param response The list of all partition nodes, without children or annotations
     */
    listPartitions = async (request: Request, response: Response): Promise<void> => {
        logger.requestLog(` * history listPartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        const repoVersion = getIntegerParam(request, "repoVersion", FOREVER)
        if (isParameterError(clientId)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else if (isParameterError(repoVersion)) {
                lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                    success: false,
                    messages: [repoVersion.error]
                })
        } else {
            const result = await this.ctx.historyApiWorker.bulkPartitions(clientId, repoVersion)
            lionwebResponse<PartitionsResponse>(response, result.status, result.queryResult)
        }
    }
    
    /**
     * Bulk API: Retrieve a set of nodes including its parts to a given level
     * @param request `body.ids` contains the list of nodes to be found.
     *            parameter `depthLimit` contains the depth to which the parts are also found.
     * @param response
     */
    retrieve = async (request: Request, response: Response): Promise<void> => {
        logger.requestLog(` * retrieve request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        const depthLimit = getIntegerParam(request, "depthLimit", Number.MAX_SAFE_INTEGER)
        const idList = request.body.ids
        const repoVersion = getIntegerParam(request, "repoVersion", FOREVER)
        logger.requestLog("Api.getNodes: " + JSON.stringify(request.body) + " depth " + depthLimit + " clientId: " + clientId)
        if (isParameterError(depthLimit)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [depthLimit.error]
            })
        } else if (isParameterError(clientId)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else if (!Array.isArray(idList)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [{ kind: "IdsIncorrect", message: `parameter 'ids' is not an array` }]
            })
        } else if (isParameterError(repoVersion)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repoVersion.error]
            })
        } else {
            const result = await this.ctx.historyApiWorker.bulkRetrieve(clientId, idList, depthLimit, repoVersion)
            lionwebResponse(response, result.status, result.queryResult)
        }
    }


}

