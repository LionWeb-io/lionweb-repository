import { Request, Response } from "express"
import { AdditionalApiContext } from "../main.js"
import {
    dbLogger,
    EMPTY_SUCCES_RESPONSE,
    getIntegerParam, getRepositoryParameter, getStringParam,
    HttpClientErrors,
    HttpSuccessCodes, isParameterError,
    lionwebResponse, ParameterError,
    RepositoryData
} from "@lionweb/repository-common"

export interface AdditionalApi {
    getNodeTree(request: Request, response: Response): void
}

export class AdditionalApiImpl implements AdditionalApi {
    constructor(private context: AdditionalApiContext) {
    }
    /**
     * Get the tree with root `id`, for a list of node ids.
     * Note that the tree could be overlapping, and the same nodes could appear multiple times in the response.
     * @param request
     * @param response
     */
    getNodeTree = async (request: Request, response: Response): Promise<void> => {
        const idList = request.body.ids
        if (idList === undefined) {
            lionwebResponse(response, HttpClientErrors.BadRequest, {
                success: false,
                messages: [{
                    kind: "EmptyIdList",
                    message: "ids not found",
                    data: idList
                }]
            })
            return
        }
        const clientId = getStringParam(request, "clientId", "Dummy")
        if (isParameterError(clientId)) {
            lionwebResponse(response, HttpClientErrors.BadRequest, {
                success: false,
                messages: [(clientId as ParameterError).error]
            })
            return
        }
        const repositoryData: RepositoryData = { clientId: clientId, repository: getRepositoryParameter(request) }
        const depthLimit = getIntegerParam(request, "depthLimit", Number.MAX_SAFE_INTEGER)
        if (isParameterError(depthLimit)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [depthLimit.error]
            })
        } else {
            dbLogger.info("API.getNodeTree is " + idList)
            const result = await this.context.additionalApiWorker.getNodeTree(repositoryData, idList, depthLimit)
            lionwebResponse(response, HttpSuccessCodes.Ok, {
                success: true,
                messages: [],
                data: result.queryResult
            })
        }
    }
}
