import { Request, Response } from "express"
import { AdditionalApiContext } from "../main.js"
import {
    EMPTY_SUCCES_RESPONSE,
    getIntegerParam, getRepositoryParameter, getStringParam,
    HttpClientErrors,
    HttpSuccessCodes, isParameterError,
    lionwebResponse,
    logger, RepositoryData
} from "@lionweb/repository-common"

export interface AdditionalApi {
    getNodeTree(request: Request, response: Response): void
}

export class AdditionalApiImpl implements AdditionalApi {
    constructor(private context: AdditionalApiContext) {
    }
    /**
     * Get the tree with root `id`, for one single node
     * @param request
     * @param response
     */
    getNodeTree = async (request: Request, response: Response): Promise<void> => {
        const idList = request.body.ids
        let clientId = getStringParam(request, "clientId")
        if (isParameterError(clientId)) {
            // Allow call without client id
            clientId = "Dummy"
        }
        const repositoryData: RepositoryData = { clientId: clientId, repository: getRepositoryParameter(request) }
        const depthLimit = getIntegerParam(request, "depthLimit", Number.MAX_SAFE_INTEGER)
        if (isParameterError(depthLimit)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [depthLimit.error]
            })
        } else {
            logger.dbLog("API.getNodeTree is " + idList)
            const result = await this.context.additionalApiWorker.getNodeTree(repositoryData, idList, depthLimit)
            lionwebResponse(response, HttpSuccessCodes.Ok, EMPTY_SUCCES_RESPONSE)
            response.send(result)
        }
    }
}
