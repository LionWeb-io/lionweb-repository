import {
    EMPTY_CHUNK,
    HttpSuccessCodes, nodesToChunk,
    PartitionsResponse, QueryReturnType,
    RetrieveResponse
} from "@lionweb/repository-common";
import { HistoryContext } from "../main.js"

/**
 * Implementations of the LionWebBulkApi methods.
 */
export class HistoryApiWorker {
    private context: HistoryContext

    constructor(context: HistoryContext) {
        this.context = context
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async bulkPartitions(clientId: string, repoVersion: number): Promise<QueryReturnType<PartitionsResponse>> {
        return await this.context.queries.getPartitionsForVersion(repoVersion)
    }
    
    /**
     * This implementation uses Postgres for querying
     * @param nodeIdList
     * @param depthLimit
     */
    bulkRetrieve = async (clientId: string, nodeIdList: string[], depthLimit: number, repoVersion: number): Promise<QueryReturnType<RetrieveResponse>> => {
        if (nodeIdList.length === 0) {
            return {
                status: HttpSuccessCodes.Ok,
                query: "",
                queryResult: {
                    success: true,
                    messages: [{ kind: "EmptyIdList", message: "The list of ids is empty, empty chunk returned" }],
                    chunk: EMPTY_CHUNK
                }
            }
        }
        const allNodes = await this.context.queries.getNodeTree(nodeIdList, depthLimit, repoVersion)
        if (allNodes.queryResult.length === 0) {
            return {
                status: HttpSuccessCodes.Ok,
                query: "",
                queryResult: {
                    success: true,
                    messages: [{ kind: "IdsNotFound", message: "None of the ids can be found, empty chunk returned" }],
                    chunk: EMPTY_CHUNK
                }
            }
        }
        const nodes = await this.context.queries.getNodesFromIdList(allNodes.queryResult.map(node => node.id), repoVersion)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: {
                success: true,
                messages: [],
                chunk: nodesToChunk(nodes)
            }
        }
    }
}
