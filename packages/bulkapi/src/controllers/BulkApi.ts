// functions implementing the LionWeb bulk API
// - unpack the request
// - call controller to do actual work
// - pack response
import { getLanguageRegistry } from "@lionweb/repository-languages"
import { Request, Response } from "express"
import { LionWebJsonChunk, LionWebValidator } from "@lionweb/validation"
import { BulkApiContext } from "../BulkApiContext.js"
import { logger } from "@lionweb/repository-dbadmin"

export interface BulkApi {
    partitions: (req: Request, res: Response) => void
    
    createPartitions: (req: Request, res: Response) => void
    deletePartitions: (req: Request, res: Response) => void
    store: (req: Request, res: Response) => void
    retrieve: (req: Request, res: Response) => void
}

export class BulkApiImpl implements BulkApi {
    
    constructor(private ctx: BulkApiContext) {
    }
    /**
     * Bulk API: Get all partitions (nodes without parent) from the repo
     * @param req no `parameters` or `body`
     * @param res The list of all partition nodes, without children or annotations
     */
    partitions = async (req: Request, res: Response): Promise<void> => {
        logger.requestLog(` * partitions request received, with body of ${req.headers["content-length"]} bytes`)
        const result = await this.ctx.bulkApiWorker.bulkPartitions()
        res.status(result.status)
        res.send(result.queryResult)
    }

    createPartitions = async (req: Request, res: Response): Promise<void> => {
        logger.requestLog(` * createPartitions request received, with body of ${req.headers["content-length"]} bytes`)
        const chunk: LionWebJsonChunk = req.body
        const validator = new LionWebValidator(chunk, getLanguageRegistry())
        validator.validateSyntax()
        validator.validateReferences()
        if (validator.validationResult.hasErrors()) {
            res.status(400)
            res.send({ issues: [validator.validationResult.issues.map(issue => issue.errorMsg())] })
        } else {
            const issues: string[] = []
            for (const node of chunk.nodes) {
                if (node.parent !== null && node.parent !== undefined) {
                    res.status(400)
                    issues.push(`Node ${node} cannot be created as partition because it has a parent.`)
                }
                for (const containment of node.containments) {
                    if (containment.children.length !== 0) {
                        issues.push(`Node ${node.id} cannot be created as a partition because it has children in containment ${containment.containment.key}`)
                    }
                }
                if (node.annotations.length !== 0) {
                    issues.push(`Node ${node.id} cannot be created as a partition because it has annotations`)
                }
            }
            if (issues.length !== 0) {
                res.status(400)
                res.send({ issues: issues })
                return
            }
            if (chunk.nodes.length === 0) {
                // do nothing, noi new partitions
                res.status(200)
                res.send({ status: 200, query: "-- empty partitions list, no query", queryResult: [] })
            }
            const x = await this.ctx.bulkApiWorker.createPartitions(chunk)
            res.status(x.status)
            res.send(x.queryResult)
        }
            
    }

    deletePartitions = async (req: Request, res: Response): Promise<void> => {
        const idList = req.body
        const x = await this.ctx.bulkApiWorker.deletePartitions(idList)
        res.send(x)
    }

    /**
     * Bulk API: Store all nodes in the request
     * @param req `body` contains the array of all nodes to store
     * @param res `ok`  if everything is correct
     */
    store = async (req: Request, res: Response): Promise<void> => {
        logger.requestLog(` * store request received, with body of ${req.headers["content-length"]} bytes`)
        const chunk: LionWebJsonChunk = req.body
        const validator = new LionWebValidator(chunk, getLanguageRegistry())
        validator.validateSyntax()
        validator.validateReferences()
        if (validator.validationResult.hasErrors()) {
            logger.requestLog("STORE VALIDATION ERROR " + validator.validationResult.issues.map(issue => issue.errorMsg()))
            res.status(400)
            res.send({ issues: [validator.validationResult.issues.map(issue => issue.errorMsg())] })
        } else {
            logger.requestLog("Calling bulkstore")
            const x = await this.ctx.bulkApiWorker.bulkStore(chunk)
            res.status(x.status)
            res.send({ result: x.queryResult} )
        }
    }

    /**
     * Bulk API: Retrieve a set of nodes including its parts to a given level
     * @param req `body.ids` contains the list of nodes to be found.
     *            parameter `depthLimit` contains the depth to which the parts are also found.
     * @param res
     */
    retrieve = async (req: Request, res: Response): Promise<void> => {
        logger.requestLog(` * retrieve request received, with body of ${req.headers["content-length"]} bytes`)
        const mode = req.query["mode"] as string
        const depthParam = req.query["depthLimit"]
        const depthLimit = (typeof depthParam === "string") ? Number.parseInt(depthParam) : Number.MAX_SAFE_INTEGER
        const idList = req.body.ids
        logger.requestLog("Api.getNodes: " + JSON.stringify(req.body) + " depth " + depthLimit)
        if (isNaN(depthLimit)) {
            res.status(400)
            res.send({ issues: [`parameter 'depthLimit' is not a number, but is '${req.query["depthLimit"]}' `] })
        } else if (!Array.isArray(idList)) {
            res.status(400)
            res.send({ issues: [`parameter 'ids' is not an array`] })
        } else {
            const result = await this.ctx.bulkApiWorker.bulkRetrieve(idList, mode, depthLimit)
            res.send(result)
        }
    }
}
