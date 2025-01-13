import {
    createId,
    CreatePartitionsResponse,
    DeletePartitionsResponse,
    EMPTY_CHUNKS,
    EMPTY_SUCCES_RESPONSE,
    HttpClientErrors,
    HttpSuccessCodes,
    IdsResponse,
    LionWebTask,
    ListPartitionsResponse,
    nodesToChunk,
    QueryReturnType,
    RepositoryData,
    requestLogger,
    ResponseMessage,
    RetrieveResponse,
    StoreResponse,
    traceLogger
} from "@lionweb/repository-common"
import { LionWebJsonChunk } from "@lionweb/validation"
import { currentRepoVersionQuery, versionResultToResponse } from "../database/index.js"
import { retrieveWith } from "../database/RetrieveInOneQuery.js"
import { BulkApiContext } from "../main.js"

/**
 * Implementations of the LionWebBulkApi methods.
 */
export class BulkApiWorker {
    private context: BulkApiContext

    constructor(context: BulkApiContext) {
        this.context = context
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async bulkPartitions(task: LionWebTask, repositoryData: RepositoryData): Promise<QueryReturnType<ListPartitionsResponse>> {
        const result = await this.context.queries.getPartitions(task, repositoryData)
        return result
    }

    /**
     * @param chunk A LionWeb chunk containing all nodes that are to be created as partitions.
     */
    createPartitions = async (
        task: LionWebTask,
        repositoryData: RepositoryData,
        chunk: LionWebJsonChunk
    ): Promise<QueryReturnType<CreatePartitionsResponse>> => {
        requestLogger.info(`BulkApiWorker.createPartitions repo [${JSON.stringify(repositoryData)}]`)
        // TODO Optimize: This reuses the "getNodesFromIdList", but that retrieves full nodes, which is not needed here

        const existingNodes = await this.context.queries.getNodesFromIdListIncludingChildren(
            task,
            repositoryData,
            chunk.nodes.map(n => n.id)
        )
        if (existingNodes.length > 0) {
            return {
                status: HttpClientErrors.PreconditionFailed,
                query: "",
                queryResult: {
                    success: false,
                    messages: [
                        {
                            kind: "PartitionAlreadyExists",
                            message: `Nodes with ids "${existingNodes.map(
                                n => n.id
                            )}" cannot be created as partitions, because they already exist.`
                        }
                    ]
                }
            }
        }
        return await this.context.queries.createPartitions(task, repositoryData, chunk)
    }

    /**
     * Delete all partitions
     * @param idList The list of node id's of partition nodes that are to be removed.
     */
    deletePartitions = async (
        task: LionWebTask,
        repositoryData: RepositoryData,
        idList: string[]
    ): Promise<QueryReturnType<DeletePartitionsResponse>> => {
        // TODO Optimize: only need parent, all features are not needed, can be optimized.
        const partitions = await this.context.queries.getNodesFromIdListIncludingChildren(task, repositoryData, idList)
        const issues: ResponseMessage[] = []
        partitions.forEach(part => {
            if (part.parent !== null) {
                issues.push({
                    kind: "NodeIsNotPartition",
                    message: `Node with id "${part.id}" cannot be deleted because it is not a partition, it has parent with id "${part.parent}"`
                })
            }
        })
        if (issues.length !== 0) {
            return {
                status: HttpClientErrors.PreconditionFailed,
                query: "",
                queryResult: {
                    success: false,
                    messages: issues
                }
            }
        }
        await this.context.queries.deletePartitions(task, repositoryData, idList)
        return { status: HttpSuccessCodes.Ok, query: "", queryResult: EMPTY_SUCCES_RESPONSE }
    }

    bulkStore = async (
        task: LionWebTask,
        repositoryData: RepositoryData,
        chunk: LionWebJsonChunk
    ): Promise<QueryReturnType<StoreResponse>> => {
        return await this.context.queries.store(task, repositoryData, chunk)
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
        depthLimit: number
    ): Promise<QueryReturnType<RetrieveResponse>> => {
        traceLogger.info("BulkApiWorker.retrieve")
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

        const [versionResult, nodes] = await task.multi(repositoryData, currentRepoVersionQuery() + retrieveWith(nodeIdList, depthLimit))
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: {
                success: true,
                messages: [versionResultToResponse(versionResult)],
                chunk: nodesToChunk(nodes, repositoryData.repository.lionweb_version)
            }
        }
    }

    /**
     * Return _count_ free id's for _clientId_ and reserve these ids for this client only.
     * @param clientId
     * @param count
     */
    ids = async (task: LionWebTask, repositoryData: RepositoryData, count: number): Promise<QueryReturnType<IdsResponse>> => {
        requestLogger.info("Reserve Count ids " + count + " for " + repositoryData.clientId)
        const result: string[] = []
        // Create a bunch of ids, they are probably all free
        let done = false
        while (!done) {
            for (let i = 0; i < count; i++) {
                const id = createId(repositoryData.clientId)
                result.push(createId(id))
            }
            // Check for already used or reserved ids and remove them if needed
            const reservedByOtherClient = await this.context.queries.reservedNodeIdsByOtherClient(task, repositoryData, result)
            if (reservedByOtherClient.length > 0) {
                reservedByOtherClient.forEach(reservedId => {
                    const index = result.indexOf(reservedId.node_id)
                    result.splice(index, 1)
                })
            }
            // Remove ids that are already in use
            const usedIds = await this.context.queries.nodeIdsInUse(task, repositoryData, result)
            if (usedIds.length > 0) {
                usedIds.forEach(usedId => {
                    const index = result.indexOf(usedId.id)
                    result.splice(index, 1)
                })
            }
            if (result.length > 0) {
                done = true
            }
        }
        const returnValue = await this.context.queries.makeNodeIdsReservation(task, repositoryData, result)

        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: {
                success: returnValue.queryResult.success,
                messages: returnValue.queryResult.messages,
                ids: result
            }
        }
    }
}
