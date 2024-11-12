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
    ListPartitionsResponse,
    lionwebResponse,
    ResponseMessage,
    DeletePartitionsResponse,
    StoreResponse,
    HttpClientErrors,
    HttpSuccessCodes,
    getStringParam,
    getIntegerParam,
    isParameterError, getRepositoryParameter, RepositoryData, requestLogger, dbLogger, traceLogger, LionwebTask
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
    constructor(private ctx: BulkApiContext) {}

    /**
     * Bulk API: Get all partitions (nodes without parent) from the repo
     * @param request no `parameters` or `body`
     * @param response The list of all partition nodes, without children or annotations
     */
    listPartitions = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * listPartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        if (isParameterError(clientId)) {
            lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                chunk: null,
                messages: [clientId.error]
            })
        } else {
            const repositoryData: RepositoryData = {clientId: clientId, repository: getRepositoryParameter(request)}
            await this.ctx.dbConnection.tx(async (task: LionwebTask) => {
                const result = await this.ctx.bulkApiWorker.bulkPartitions(task, repositoryData)
                lionwebResponse<ListPartitionsResponse>(response, result.status, result.queryResult)
            })
        }
    }

    createPartitions = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * createPartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        const chunk: LionWebJsonChunk = request.body
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
                        issues.push({
                            kind: "PartitionHasParent",
                            message: `Node ${node} cannot be created as partition because it has a parent.`
                        })
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
                        issues.push({
                            kind: "PartitionHasAnnotations",
                            message: `Node ${node.id} cannot be created as a partition because it has annotations`
                        })
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
                const repositoryData: RepositoryData = {clientId: clientId, repository: getRepositoryParameter(request)}
                await this.ctx.dbConnection.tx(async (task: LionwebTask) => {
                    const result = await this.ctx.bulkApiWorker.createPartitions(task, repositoryData, chunk)
                    lionwebResponse<CreatePartitionsResponse>(response, result.status, result.queryResult)
                })
            }
        }
    }

    deletePartitions = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * deletePartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const clientId = getStringParam(request, "clientId")
        const idList = request.body
        if (isParameterError(clientId)) {
            requestLogger.error("STORE CLIENT ID ERROR: clientId incorrect: " + JSON.stringify(clientId))
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else {
            const repositoryData: RepositoryData = {clientId: clientId, repository: getRepositoryParameter(request)}
            await this.ctx.dbConnection.tx(async (task: LionwebTask) => {
                const x = await this.ctx.bulkApiWorker.deletePartitions(task, repositoryData, idList)
                lionwebResponse<DeletePartitionsResponse>(response, x.status, x.queryResult)
            })
        }
    }

    /**
     * Bulk API: Store all nodes in the request
     * @param request `body` contains the array of all nodes to store
     * @param response `ok`  if everything is correct
     */
    store = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * store request received, with body of ${request.headers["content-length"]} bytes, params ${JSON.stringify(request.query)}`)
        const clientId = getStringParam(request, "clientId")
        const chunk: LionWebJsonChunk = request.body
        const validator = new LionWebValidator(chunk, getLanguageRegistry())
        validator.validateSyntax()
        validator.validateReferences()
        if (validator.validationResult.hasErrors()) {
            requestLogger.error("STORE VALIDATION ERROR " + validator.validationResult.issues.map(issue => issue.errorMsg()))
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: validator.validationResult.issues.map(issue => ({ kind: issue.issueType, message: issue.errorMsg() }))
            })
        } else if (isParameterError(clientId)) {
            requestLogger.error("STORE CLIENT ID ERROR: clientId incorrect: " + JSON.stringify(clientId))
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else {
            const repositoryData: RepositoryData = {clientId: clientId, repository: getRepositoryParameter(request)}
            await this.ctx.dbConnection.tx(async (task: LionwebTask) => {
                const result = await this.ctx.bulkApiWorker.bulkStore(task, repositoryData, chunk)
                result.queryResult.messages.push({ kind: "QueryFromApi", message: result.query })
                lionwebResponse<StoreResponse>(response, result.status, result.queryResult)
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
        const clientId = getStringParam(request, "clientId")
        const depthLimit = getIntegerParam(request, "depthLimit", Number.MAX_SAFE_INTEGER)
        const idList = request.body.ids
        if (isParameterError(depthLimit)) {
            traceLogger.info("   * retrieve request: depthlimit error")
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [depthLimit.error]
            })
        } else if (isParameterError(clientId)) {
            traceLogger.info("   * retrieve request: clientId error")
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [clientId.error]
            })
        } else if (!Array.isArray(idList)) {
            traceLogger.info("   * retrieve request: idlist error")
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [{ kind: "IdsIncorrect", message: `parameter 'ids' is not an array` }]
            })
        } else {
            traceLogger.info("   * retrieve request: calling worker")
            await this.ctx.dbConnection.tx( async (task: LionwebTask)  => {
                const repositoryData: RepositoryData = { clientId: clientId, repository: getRepositoryParameter(request) }
                const result = await this.ctx.bulkApiWorker.bulkRetrieve(task, repositoryData, idList, depthLimit)
                lionwebResponse(response, result.status, result.queryResult)
            })
        }
    }

    /**
     * Return a list of id's that are guaranteed to be free and not to be used by any other client.
     * @param request
     * @param response
     */
    ids = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * ids request received, with body of ${request.headers["content-length"]} bytes`)
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
            const repositoryData: RepositoryData = {clientId: clientId, repository: getRepositoryParameter(request)}
            await this.ctx.dbConnection.tx( async (task: LionwebTask)  => {
                const result = await this.ctx.bulkApiWorker.ids(task, repositoryData, count)
                lionwebResponse(response, result.status, result.queryResult)
            })
        }
    }
}
