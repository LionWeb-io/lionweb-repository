import {
    logger,
    PartitionsResponse,
    asError,
    QueryReturnType, nodesToChunk, HttpSuccessCodes, HttpClientErrors,
} from "@lionweb/repository-common"
import {
    LionWebJsonNode
} from "@lionweb/validation"
import { HistoryContext } from "../main.js"
import { makeQueryNodeTreeForIdList, QueryNodeForIdList } from "./QueryNodeHistory.js"

export type NodeTreeResultType = {
    id: string
    parent: string
    depth: number
}

/**
 * Database functions.
 */
export class HistoryQueries {
    constructor(private context: HistoryContext) {
    }

    /**
     * Get recursively the ids of all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (nodeIdList: string[], depthLimit: number, repoVersion: number): Promise<QueryReturnType<NodeTreeResultType[]>> => {
        logger.dbLog("LionWebQueries.getNodeTree for " + nodeIdList)
        let query = ""
        try {
            if (nodeIdList.length === 0) {
                return { status: HttpClientErrors.PreconditionFailed, query: "query", queryResult: [] }
            }
            query = makeQueryNodeTreeForIdList(nodeIdList, depthLimit, repoVersion)
            return { status: HttpSuccessCodes.Ok, query: query, queryResult: await this.context.dbConnection.query(query) }
        } catch (e) {
            const error = asError(e)
            console.error("Exception catched in LionWebQueries.getNodeTree(): " + error.message)
            logger.requestLog("======================================================================")
            logger.requestLog(query)
            throw error
        }
    }

    getNodesFromIdList = async (nodeIdList: string[], repoVersion: number): Promise<LionWebJsonNode[]> => {
        logger.dbLog("HistoryQueries.getNodesFromIdList: " + nodeIdList)
        // this is necessary as otherwise the query would crash as it is not intended to be run on an empty set
        if (nodeIdList.length == 0) {
            return []
        }
        const query = QueryNodeForIdList(nodeIdList, repoVersion)
        const result = await this.context.dbConnection.query(query)
        return result
    }

    /**
     * Get all partitions: this returns all nodes that have parent set to null or undefined
     */
    getPartitionsForVersion = async (repoVersion: number): Promise<QueryReturnType<PartitionsResponse>> => {
        logger.requestLog("HistoryQueries.getPartitions for version " + repoVersion)
        // TODO Combine both queries
        const query = `SELECT id FROM nodesForVersion(${repoVersion}) WHERE parent is null`
        const partitionIds = await await this.context.dbConnection.query(query) as { id: string }[]

        logger.dbLog("HistoryQueries.getPartitions.Result: " + JSON.stringify(partitionIds))
        const nodes = await this.getNodesFromIdList(partitionIds.map(n => n.id), repoVersion)
        return {
            status: HttpSuccessCodes.Ok,
            query: "query",
            queryResult:{ 
                chunk: nodesToChunk(nodes),
                success: true,
                messages: []
            }
        }
    }
}
