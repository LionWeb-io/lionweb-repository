// functions implementing the LionWeb bulk API
// - unpack the request
// - call controller to do actual work
// - pack response
import { Request, Response } from "express"
import { getLanguageRegistry } from "@lionweb/repository-languages"
import { LionWebJsonChunk, LionWebValidator } from "@lionweb/validation"
import { BulkApiContext } from "../BulkApiContext.js"
import {
    CreatePartitionsResponse,
    logger,
    PartitionsResponse,
    lionwebResponse,
    ResponseMessage,
    DeletePartitionsResponse,
    StoreResponse, HttpClientErrors, HttpSuccessCodes
} from "@lionweb/repository-common"

export interface BulkApi {
    partitions: (req: Request, response: Response) => void
    
    createPartitions: (req: Request, response: Response) => void
    deletePartitions: (req: Request, response: Response) => void
    store: (req: Request, response: Response) => void
    retrieve: (req: Request, response: Response) => void
}

export class BulkApiImpl implements BulkApi {
    
    constructor(private ctx: BulkApiContext) {
    }
    /**
     * Bulk API: Get all partitions (nodes without parent) from the repo
     * @param req no `parameters` or `body`
     * @param response The list of all partition nodes, without children or annotations
     */
    partitions = async (req: Request, response: Response): Promise<void> => {
        logger.requestLog(` * partitions request received, with body of ${req.headers["content-length"]} bytes`)
        const result = await this.ctx.bulkApiWorker.bulkPartitions()
        lionwebResponse<PartitionsResponse>(response, result.status, result.queryResult)
    }

    createPartitions = async (req: Request, response: Response): Promise<void> => {
        logger.requestLog(` * createPartitions request received, with body of ${req.headers["content-length"]} bytes`)
        const chunk: LionWebJsonChunk = req.body
        const validator = new LionWebValidator(chunk, getLanguageRegistry())
        validator.validateSyntax()
        validator.validateReferences()
        if (validator.validationResult.hasErrors()) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: validator.validationResult.issues.map(issue => ({kind: issue.issueType, message: issue.errorMsg()}))
            })
        } else {
            const issues: ResponseMessage[] = []
            for (const node of chunk.nodes) {
                if (node.parent !== null && node.parent !== undefined) {
                    issues.push({ kind: "PartitionHasParent", message: `Node ${node} cannot be created as partition because it has a parent.`})
                }
                for (const containment of node.containments) {
                    if (containment.children.length !== 0) {
                        issues.push({ kind: "PartitionHasChildren", message: `Node ${node.id} cannot be created as a partition because it has children in containment ${containment.containment.key}` })
                    }
                }
                if (node.annotations.length !== 0) {
                    issues.push({ kind: "PartitionHasAnnotations", message: `Node ${node.id} cannot be created as a partition because it has annotations`} )
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
                    messages: [{ kind: "EmptyChunk", message: "-- empty partitions list, no query"}]
                })
                return
            }
            const x = await this.ctx.bulkApiWorker.createPartitions(chunk)
            lionwebResponse<CreatePartitionsResponse>(response, x.status, x.queryResult)
        }
    }

    deletePartitions = async (req: Request, response: Response): Promise<void> => {
        logger.requestLog(` * deletePartitions request received, with body of ${req.headers["content-length"]} bytes`)
        const idList = req.body
        const x = await this.ctx.bulkApiWorker.deletePartitions(idList)
        lionwebResponse<DeletePartitionsResponse>(response, x.status, x.queryResult)
    }

    /**
     * Bulk API: Store all nodes in the request
     * @param req `body` contains the array of all nodes to store
     * @param response `ok`  if everything is correct
     */
    store = async (req: Request, response: Response): Promise<void> => {
        logger.requestLog(` * store request received, with body of ${req.headers["content-length"]} bytes`)
        const chunk: LionWebJsonChunk = req.body
        const validator = new LionWebValidator(chunk, getLanguageRegistry())
        validator.validateSyntax()
        validator.validateReferences()
        if (validator.validationResult.hasErrors()) {
            logger.requestLog("STORE VALIDATION ERROR " + validator.validationResult.issues.map(issue => issue.errorMsg()))
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: validator.validationResult.issues.map(issue => ({ kind: issue.issueType, message: issue.errorMsg() }))
            })
        } else {
            const result = await this.ctx.bulkApiWorker.bulkStore(chunk)
            lionwebResponse<StoreResponse>(response, result.status, result.queryResult)
        }
    }

    /**
     * Bulk API: Retrieve a set of nodes including its parts to a given level
     * @param req `body.ids` contains the list of nodes to be found.
     *            parameter `depthLimit` contains the depth to which the parts are also found.
     * @param response
     */
    retrieve = async (req: Request, response: Response): Promise<void> => {
        logger.requestLog(` * retrieve request received, with body of ${req.headers["content-length"]} bytes`)
        const mode = req.query["mode"] as string
        const depthParam = req.query["depthLimit"]
        const depthLimit = (typeof depthParam === "string") ? Number.parseInt(depthParam) : Number.MAX_SAFE_INTEGER
        const idList = req.body.ids
        logger.requestLog("Api.getNodes: " + JSON.stringify(req.body) + " depth " + depthLimit)
        if (isNaN(depthLimit)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [{ kind: "DepthLimitIncorrect", message: `parameter 'depthLimit' is not a number, but is '${req.query["depthLimit"]}' ` }]
            })
        } else if (!Array.isArray(idList)) {
            lionwebResponse(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [{ kind: "IdsIncorrect", message: `parameter 'ids' is not an array` }]
            })
        } else {
            const result = await this.ctx.bulkApiWorker.bulkRetrieve(idList, mode, depthLimit)
            lionwebResponse(response, result.status, result.queryResult)
        }
    }
}
