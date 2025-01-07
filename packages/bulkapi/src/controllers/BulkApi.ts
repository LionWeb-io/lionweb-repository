// functions implementing the LionWeb bulk API
import {
    CreatePartitionsResponse,
    DeletePartitionsResponse,
    getIntegerParam,
    HttpClientErrors,
    HttpSuccessCodes,
    isParameterError,
    lionwebResponse,
    LionWebTask,
    ListPartitionsResponse,
    requestLogger,
    ResponseMessage,
    StoreResponse,
    traceLogger
} from "@lionweb/repository-common"
import { getRepositoryData, validateLionWebVersion } from "@lionweb/repository-dbadmin"
import { getLanguageRegistry } from "@lionweb/repository-languages"
import { LionWebJsonChunk, LionWebValidator } from "@lionweb/validation"
// - unpack the request
// - call controller to do actual work
// - pack response
import { Request, Response } from "express"
import { BulkApiContext } from "../main.js"

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
        const repositoryData = getRepositoryData(request)
        requestLogger.debug(`    ** repository data ${JSON.stringify(repositoryData)} bytes`)
        if (isParameterError(repositoryData)) {
            lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                chunk: null,
                messages: [repositoryData.error]
            })
        } else {
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                const result = await this.ctx.bulkApiWorker.bulkPartitions(task, repositoryData)
                lionwebResponse<ListPartitionsResponse>(response, result.status, result.queryResult)
            })
        }
    }

    createPartitions = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * createPartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData = getRepositoryData(request)
        requestLogger.debug(`    ** repository data ${JSON.stringify(repositoryData)} bytes`)
        const chunk: LionWebJsonChunk = request.body
        if (isParameterError(repositoryData)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repositoryData.error]
            })
        } else {
            const validator = new LionWebValidator(chunk, getLanguageRegistry())
            validateLionWebVersion(chunk, repositoryData, validator.validationResult)
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
                await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                    const result = await this.ctx.bulkApiWorker.createPartitions(task, repositoryData, chunk)
                    lionwebResponse<CreatePartitionsResponse>(response, result.status, result.queryResult)
                })
            }
        }
    }

    deletePartitions = async (request: Request, response: Response): Promise<void> => {
        requestLogger.info(` * deletePartitions request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData = getRepositoryData(request)
        requestLogger.debug(`    ** repository data ${JSON.stringify(repositoryData)} bytes`)
        if (isParameterError(repositoryData)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repositoryData.error]
            })
        } else {
            const idList = request.body
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
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
        requestLogger.info(` * store request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData = getRepositoryData(request)
        requestLogger.debug(`    ** repository data ${JSON.stringify(repositoryData)} bytes`)
        if (isParameterError(repositoryData)) {
            requestLogger.error("STORE ERROR: repository data incorrect: " + JSON.stringify(repositoryData))
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repositoryData.error]
            })
        } else {
            const chunk: LionWebJsonChunk = request.body
            const validator = new LionWebValidator(chunk, getLanguageRegistry())
            validateLionWebVersion(chunk, repositoryData, validator.validationResult)
            validator.validateSyntax()
            validator.validateReferences()
            if (validator.validationResult.hasErrors()) {
                requestLogger.error("BulkApi.store validation errors: " + validator.validationResult.issues.map(issue => issue.errorMsg()))
                lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                    success: false,
                    messages: validator.validationResult.issues.map(issue => ({ kind: issue.issueType, message: issue.errorMsg() }))
                })
            } else {
                await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                    const result = await this.ctx.bulkApiWorker.bulkStore(task, repositoryData, chunk)
                    result.queryResult.messages.push({ kind: "QueryFromApi", message: result.query })
                    lionwebResponse<StoreResponse>(response, result.status, result.queryResult)
                })
            }
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
        if (isParameterError(depthLimit)) {
            requestLogger.warn("   * retrieve request: depthlimit error")
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [depthLimit.error]
            })
        } else if (isParameterError(repositoryData)) {
            requestLogger.warn("   * retrieve request: clientId error")
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repositoryData.error]
            })
        } else if (!Array.isArray(idList)) {
            requestLogger.warn("   * retrieve request: idlist error")
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [{ kind: "IdsIncorrect", message: `parameter 'ids' is not an array` }]
            })
        } else {
            traceLogger.info("   * retrieve request: calling worker")
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
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
        const repositoryData = getRepositoryData(request)
        requestLogger.debug(`    ** repository data ${JSON.stringify(repositoryData)} bytes`)
        const count = getIntegerParam(request, "count", Number.MAX_SAFE_INTEGER)
        if (isParameterError(count)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [count.error]
            })
        } else if (isParameterError(repositoryData)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repositoryData.error]
            })
        } else {
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                const result = await this.ctx.bulkApiWorker.ids(task, repositoryData, count)
                lionwebResponse(response, result.status, result.queryResult)
            })
        }
    }
}
