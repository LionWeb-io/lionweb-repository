import { nodesToChunk, QueryReturnType, RepositoryData, traceLogger, LionWebTask, EMPTY_CHUNKS } from "@lionweb/repository-common"
import { HttpSuccessCodes, ListPartitionsResponse, RetrieveResponse } from "@lionweb/repository-shared"
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
        repositoryData: RepositoryData,
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
                    chunk: EMPTY_CHUNKS[repositoryData.repository.lionweb_version]
                }
            }
        }
        const allNodes = await this.context.queries.getNodeTree(task, repositoryData, nodeIdList, depthLimit, repoVersion)
        if (allNodes.queryResult.length === 0) {
            return {
                status: HttpSuccessCodes.Ok,
                query: "",
                queryResult: {
                    success: true,
                    messages: [{ kind: "IdsNotFound", message: "None of the ids can be found, empty chunk returned" }],
                    chunk: EMPTY_CHUNKS[repositoryData.repository.lionweb_version]
                }
            }
        }
        const nodes = await this.context.queries.getNodesFromIdList(
            task,
            repositoryData,
            allNodes.queryResult.map(node => node.id),
            repoVersion
        )
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: {
                success: true,
                messages: [],
                chunk: nodesToChunk(nodes, repositoryData.repository.lionweb_version)
            }
        }
    }
}
