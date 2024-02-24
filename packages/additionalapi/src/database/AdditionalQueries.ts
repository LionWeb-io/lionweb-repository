import { asError, logger, QueryReturnType } from "@lionweb/repository-common";
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
     * Get recursively all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (nodeIdList: string[], depthLimit: number): Promise<QueryReturnType<NodeTreeResultType[] | string>> => {
        logger.requestLog("LionWebQueries.getNodeTree for " + nodeIdList)
        let query = ""
        try {
            if (nodeIdList.length === 0) {
                return { status: 401, query: "query", queryResult: [] }
            }
            // TODO Currently only gives the node id's, should give full node.
            query = makeQueryNodeTreeForIdList(nodeIdList, depthLimit)
            return { status: 410, query: query, queryResult: await this.context.dbConnection.query(query) }
        } catch (e) {
            const error = asError(e)
            console.log("Exception catched in getNodeTree(): " + error.message)
            return { status: 200, query: query, queryResult: error.message }
        }
    }
}
