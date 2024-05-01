// functions implementing the LionWeb bulk API
// - unpack the request
// - call controller to do actual work
// - pack response
import { Request, Response } from "express"
import { getLanguageRegistry } from "@lionweb/repository-languages"
import { LionWebJsonChunk, LionWebValidator } from "@lionweb/validation"
import { BulkApiContext } from "../main.js"
import {
    CreatePartitionsResponse,
    logger,
    PartitionsResponse,
    lionwebResponse,
    ResponseMessage,
    DeletePartitionsResponse,
    StoreResponse, HttpClientErrors, HttpSuccessCodes, getStringParam, getIntegerParam, isParameterError, parse
} from "@lionweb/repository-common"

export interface BulkApi {
    listPartitions: (request: Request, response: Response) => void
    createPartitions: (request: Request, response: Response) => void
    deletePartitions: (request: Request, response: Response) => void

    store: (request: Request, response: Response) => void
    retrieve: (request: Request, response: Response) => void
    ids: (request: Request, response: Response) => void
}

export class BulkApiImpl implements BulkApi {
    
    constructor(private ctx: BulkApiContext) {
    }
    /**
     * Bulk API: Get all partitions (nodes without parent) from the repo
     * @param request no `parameters` or `body`
     * @param response The list of all partition nodes, without children or annotations
     */
    listPartitions = async (request: Request, response: Response): Promise<void> => {
        logger.requestLog(` * listPartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        if (isParameterError(clientId)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else {
            const result = await this.ctx.bulkApiWorker.bulkPartitions(clientId)
            lionwebResponse<PartitionsResponse>(response, result.status, result.queryResult)
        }
    }

    createPartitions = async (request: Request, response: Response): Promise<void> => {
        logger.requestLog(` * createPartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        // const chunk: LionWebJsonChunk = JSON.parse(request.body)
        let x = ((await parse(request)) as any)
        const chunk: LionWebJsonChunk =  x
        // const chunk: LionWebJsonChunk = {
        //     serializationFormatVersion: '2023.1',
        //     languages: [],
        //     nodes: await parse(request),
        // }
        if (isParameterError(clientId)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else {
            const validator = new LionWebValidator(chunk, getLanguageRegistry())
            validator.validateSyntax()
            validator.validateReferences()
            if (validator.validationResult.hasErrors()) {
                lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                    success: false,
                    messages: validator.validationResult.issues.map(issue => ({ kind: issue.issueType, message: issue.errorMsg() }))
                })
            } else {
                const issues: ResponseMessage[] = []
                for (const node of chunk.nodes) {
                    if (node.parent !== null && node.parent !== undefined) {
                        issues.push({ kind: "PartitionHasParent", message: `Node ${node} cannot be created as partition because it has a parent.` })
                    }
                    for (const containment of node.containments) {
                        if (containment.children.length !== 0) {
                            issues.push({
                                kind: "PartitionHasChildren",
                                message: `Node ${node.id} cannot be created as a partition because it has children in containment ${containment.containment.key}`
                            })
                        }
                    }
                    if (node.annotations.length !== 0) {
                        issues.push({ kind: "PartitionHasAnnotations", message: `Node ${node.id} cannot be created as a partition because it has annotations` })
                    }
                }
                if (issues.length !== 0) {
                    lionwebResponse<CreatePartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                        success: false,
                        messages: issues
                    })
                    return
                }
                if (chunk.nodes.length === 0) {
                    // do nothing, no new partitions
                    lionwebResponse<CreatePartitionsResponse>(response, HttpSuccessCodes.Ok, {
                        success: true,
                        messages: [{ kind: "EmptyChunk", message: "-- empty partitions list, no query" }]
                    })
                    return
                }
                const x = await this.ctx.bulkApiWorker.createPartitions(clientId, chunk)
                lionwebResponse<CreatePartitionsResponse>(response, x.status, x.queryResult)
            }
        }
    }

    deletePartitions = async (request: Request, response: Response): Promise<void> => {
        logger.requestLog(` * deletePartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        const idList = ((await parse(request)) as any)
        if (isParameterError(clientId)) {
            logger.requestLog("STORE CLIENT ID ERROR: clientId incorrect: " + JSON.stringify(clientId))
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else {
            const x = await this.ctx.bulkApiWorker.deletePartitions(clientId, idList)
            lionwebResponse<DeletePartitionsResponse>(response, x.status, x.queryResult)
        }
    }

    /**
     * Bulk API: Store all nodes in the request
     * @param request `body` contains the array of all nodes to store
     * @param response `ok`  if everything is correct
     */
    store = async (request: Request, response: Response): Promise<void> => {
        logger.requestLog(` * store request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        const chunk: LionWebJsonChunk = ((await parse(request)) as any)
        const validator = new LionWebValidator(chunk, getLanguageRegistry())
        validator.validateSyntax()
        validator.validateReferences()
        if (validator.validationResult.hasErrors()) {
            logger.requestLog("STORE VALIDATION ERROR " + validator.validationResult.issues.map(issue => issue.errorMsg()))
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: validator.validationResult.issues.map(issue => ({ kind: issue.issueType, message: issue.errorMsg() }))
            })
        } else if (isParameterError(clientId)) {
            logger.requestLog("STORE CLIENT ID ERROR: clientId incorrect: " + JSON.stringify(clientId))
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else {
            const result = await this.ctx.bulkApiWorker.bulkStore(clientId, chunk)
            lionwebResponse<StoreResponse>(response, result.status, result.queryResult)
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
        const idList = ((await parse(request)) as any).ids
        logger.requestLog("Api.getNodes: " + request.body + " depth " + depthLimit + " clientId: " + clientId)
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
        } else {
            const result = await this.ctx.bulkApiWorker.bulkRetrieve(clientId, idList, depthLimit)
            lionwebResponse(response, result.status, result.queryResult)
        }
    }

    /**
     * TODO Implement this properly.
     * @param request
     * @param response
     */
    ids = async (request: Request, response: Response): Promise<void> => {
        logger.requestLog(` * ids request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        const count = getIntegerParam(request, "count", Number.MAX_SAFE_INTEGER)
        if (isParameterError(count)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [count.error]
            })
        } else if (isParameterError(clientId)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else {
            const result = await this.ctx.bulkApiWorker.ids(clientId, count)
            lionwebResponse(response, result.status, result.queryResult)
        }
    }

}

function streamToString (stream): Promise<string> {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
}
