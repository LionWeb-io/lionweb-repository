// functions implementing the LionWeb bulk API
import { getRepositoryData } from "@lionweb/repository-dbadmin"
// - unpack the request
// - call controller to do actual work
// - pack response
import { Request, Response } from "express"
import { HistoryContext } from "../main.js"
import {
    ListPartitionsResponse,
    lionwebResponse,
    HttpClientErrors,
    getIntegerParam,
    isParameterError,
    StoreResponse,
    FOREVER,
    dbLogger,
    requestLogger,
    LionWebTask
} from "@lionweb/repository-common"

export interface HistoryApi {
    listPartitions: (request: Request, response: Response) => void
    retrieve: (request: Request, response: Response) => void
}

export class HistoryApiImpl implements HistoryApi {
    constructor(private ctx: HistoryContext) {}
    /**
     * Bulk API: Get all partitions (nodes without parent) from the repo
     * @param request no `parameters` or `body`
     * @param response The list of all partition nodes, without children or annotations
     */
    listPartitions = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * history listPartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData = getRepositoryData(request)
        requestLogger.debug(`    ** repository data ${JSON.stringify(repositoryData)} bytes`)
        const repoVersion = getIntegerParam(request, "repoVersion", FOREVER)
        if (isParameterError(repositoryData)) {
            lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                chunk: null,
                messages: [repositoryData.error]
            })
        } else if (isParameterError(repoVersion)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repoVersion.error]
            })
        } else {
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                const result = await this.ctx.historyApiWorker.bulkPartitions(task, repositoryData, repoVersion)
                lionwebResponse<ListPartitionsResponse>(response, result.status, result.queryResult)
            })
        }
    }

    /**
     * Bulk API: Retrieve a set of nodes including its parts to a given level
     * @param request `body.ids` contains the list of nodes to be found.
     *            parameter `depthLimit` contains the depth to which the parts are also found.
     * @param response
     */
    retrieve = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * retrieve request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData = getRepositoryData(request)
        requestLogger.debug(`    ** repository data ${JSON.stringify(repositoryData)} bytes`)
        const depthLimit = getIntegerParam(request, "depthLimit", Number.MAX_SAFE_INTEGER)
        const idList = request.body.ids
        const repoVersion = getIntegerParam(request, "repoVersion", FOREVER)
        dbLogger.debug(
            "Api.getNodes: " + JSON.stringify(request.body) + " depth " + depthLimit + " repo: " + JSON.stringify(repositoryData)
        )
        if (isParameterError(depthLimit)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [depthLimit.error]
            })
        } else if (isParameterError(repositoryData)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repositoryData.error]
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
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                const result = await this.ctx.historyApiWorker.bulkRetrieve(task, repositoryData, idList, depthLimit, repoVersion)
                lionwebResponse(response, result.status, result.queryResult)
            })
        }
    }
}
