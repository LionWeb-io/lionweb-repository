import {
    ListPartitionsResponse,
    asError,
    QueryReturnType,
    nodesToChunk,
    HttpSuccessCodes,
    HttpClientErrors,
    RepositoryData,
    dbLogger,
    requestLogger,
    LionWebTask
} from "@lionweb/repository-common"
import { LionWebJsonNode } from "@lionweb/validation"
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
    constructor(private context: HistoryContext) {}

    /**
     * Get recursively the ids of all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (
        task: LionWebTask,
        repoData: RepositoryData,
        nodeIdList: string[],
        depthLimit: number,
        repoVersion: number
    ): Promise<QueryReturnType<NodeTreeResultType[]>> => {
        dbLogger.debug("LionWebQueries.getNodeTree for " + nodeIdList)
        let query = ""
        try {
            if (nodeIdList.length === 0) {
                return { status: HttpClientErrors.PreconditionFailed, query: "query", queryResult: [] }
            }
            query = makeQueryNodeTreeForIdList(nodeIdList, depthLimit, repoVersion)
            return { status: HttpSuccessCodes.Ok, query: query, queryResult: await task.query(repoData, query) }
        } catch (e) {
            const error = asError(e)
            requestLogger.error("Exception catched in LionWebQueries.getNodeTree(): " + error.message)
            requestLogger.info("======================================================================")
            requestLogger.info(query)
            throw error
        }
    }

    getNodesFromIdList = async (
        task: LionWebTask,
        repoData: RepositoryData,
        nodeIdList: string[],
        repoVersion: number
    ): Promise<LionWebJsonNode[]> => {
        dbLogger.debug("HistoryQueries.getNodesFromIdList: " + nodeIdList)
        // this is necessary as otherwise the query would crash as it is not intended to be run on an empty set
        if (nodeIdList.length == 0) {
            return []
        }
        const query = QueryNodeForIdList(nodeIdList, repoVersion)
        const result = await task.query(repoData, query)
        return result
    }

    /**
     * Get all partitions: this returns all nodes that have parent set to null or undefined
     */
    getPartitionsForVersion = async (
        task: LionWebTask,
        repoData: RepositoryData,
        repoVersion: number
    ): Promise<QueryReturnType<ListPartitionsResponse>> => {
        requestLogger.info("HistoryQueries.getPartitions for version " + JSON.stringify(repoVersion))
        // TODO Combine both queries
        const query = `SELECT id FROM nodesForVersion(${repoVersion}) WHERE parent is null`
        const partitionIds = (await await task.query(repoData, query)) as { id: string }[]

        dbLogger.debug("HistoryQueries.getPartitions.Result: " + JSON.stringify(partitionIds))
        const nodes = await this.getNodesFromIdList(
            task,
            repoData,
            partitionIds.map(n => n.id),
            repoVersion
        )
        return {
            status: HttpSuccessCodes.Ok,
            query: "query",
            queryResult: {
                chunk: nodesToChunk(nodes, repoData.repository.lionweb_version),
                success: true,
                messages: []
            }
        }
    }
}
