import {
    EMPTY_CHUNKS,
    HttpSuccessCodes,
    nodesToChunk,
    ListPartitionsResponse,
    QueryReturnType,
    RepositoryData,
    RetrieveResponse,
    traceLogger,
    LionWebTask
} from "@lionweb/repository-common"
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
    async bulkPartitions(
        task: LionWebTask,
        repoData: RepositoryData,
        repoVersion: number
    ): Promise<QueryReturnType<ListPartitionsResponse>> {
        return await this.context.queries.getPartitionsForVersion(task, repoData, repoVersion)
    }

    /**
     * This implementation uses Postgres for querying
     * @param nodeIdList
     * @param depthLimit
     */
    bulkRetrieve = async (
        task: LionWebTask,
        repoData: RepositoryData,
        nodeIdList: string[],
        depthLimit: number,
        repoVersion: number
    ): Promise<QueryReturnType<RetrieveResponse>> => {
        traceLogger.info("HistoryApiWorker.bulkRetrieve")
        if (nodeIdList.length === 0) {
            return {
                status: HttpSuccessCodes.Ok,
                query: "",
                queryResult: {
                    success: true,
                    messages: [{ kind: "EmptyIdList", message: "The list of ids is empty, empty chunk returned" }],
                    chunk: EMPTY_CHUNKS[repoData.repository.lionweb_version]
                }
            }
        }
        const allNodes = await this.context.queries.getNodeTree(task, repoData, nodeIdList, depthLimit, repoVersion)
        if (allNodes.queryResult.length === 0) {
            return {
                status: HttpSuccessCodes.Ok,
                query: "",
                queryResult: {
                    success: true,
                    messages: [{ kind: "IdsNotFound", message: "None of the ids can be found, empty chunk returned" }],
                    chunk: EMPTY_CHUNKS[repoData.repository.lionweb_version]
                }
            }
        }
        const nodes = await this.context.queries.getNodesFromIdList(
            task,
            repoData,
            allNodes.queryResult.map(node => node.id),
            repoVersion
        )
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: {
                success: true,
                messages: [],
                chunk: nodesToChunk(nodes, repoData.repository.lionweb_version)
            }
        }
    }
}
