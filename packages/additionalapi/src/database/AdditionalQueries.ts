import { HttpSuccessCodes, QueryReturnType, RepositoryData, requestLogger } from "@lionweb/repository-common";
import { AdditionalApiContext } from "../main.js";
import { makeQueryNodeTreeForIdList } from "./QueryNode.js"

export type NodeTreeResultType = {
    id: string
    parent: string
    depth: number
}

/**
 * Database functions.
 */
export class AdditionalQueries {
    constructor(private context: AdditionalApiContext) {
    }

    /**
     * Get recursively the ids of all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (repositoryData: RepositoryData, nodeIdList: string[], depthLimit: number): Promise<QueryReturnType<NodeTreeResultType[]>> => {
        requestLogger.info("LionWebQueries.getNodeTree for " + nodeIdList)
        let query = ""
        if (nodeIdList.length === 0) {
            return { status: HttpSuccessCodes.NoContent, query: "query", queryResult: [] }
        }
        query = makeQueryNodeTreeForIdList(nodeIdList, depthLimit)
        return { status: HttpSuccessCodes.Ok, query: query, queryResult: await this.context.dbConnection.query(repositoryData, query) }
    }
}
