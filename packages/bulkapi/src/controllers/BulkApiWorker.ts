import {
    createId,
    CreatePartitionsResponse,
    DeletePartitionsResponse, EMPTY_CHUNK,
    EMPTY_SUCCES_RESPONSE, HttpClientErrors, HttpSuccessCodes, IdsResponse,
    logger, nodesToChunk,
    PartitionsResponse, QueryReturnType,
    ResponseMessage, RetrieveResponse, StoreResponse
} from "@lionweb/repository-common";
import { LionWebJsonChunk } from "@lionweb/validation"
import { currentRepoVersionQuery, versionResultToResponse } from "../database/index.js";
import { retrieveQuery } from "../database/RetrieveInOneQuery.js";
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
    async bulkPartitions(clientId: string): Promise<QueryReturnType<PartitionsResponse>> {
        return await this.context.queries.getPartitions()
    }

    /**
     * @param chunk A LionWeb chunk containing all nodes that are to be created as partitions.
     */
    createPartitions = async (clientId: string, chunk: LionWebJsonChunk): Promise<QueryReturnType<CreatePartitionsResponse>> => {
        logger.requestLog("BulkApiWorker.createPartitions")
        // TODO Optimize: This esues the "getNodesFromIdList", but that retrieves full nodes, which is not needed here
        return await this.context.dbConnection.tx(async task => {
            const existingNodes = await this.context.queries.getNodesFromIdList(task, chunk.nodes.map(n => n.id))
            if (existingNodes.length > 0) {
                return { 
                    status: HttpClientErrors.PreconditionFailed, 
                    query: "", 
                    queryResult: {
                        success: false,
                        messages: [{
                            kind: "PartitionAlreadyExists",
                            message: `Nodes with ids "${existingNodes.map(n => n.id)}" cannot be created as partitions, because they already exist.`
                        }]
                    } 
                }
            }
            return await this.context.queries.createPartitions(task, clientId, chunk)
        })
    }

    /**
     * Delete all partitions 
     * @param idList The list of node id's of partition nodes that are to be removed.
     */
    deletePartitions = async(clientId: string, idList: string[]): Promise<QueryReturnType<DeletePartitionsResponse>> => {
        // TODO Optimize: only need parent, all features are not needed, can be optimized.
        return await this.context.dbConnection.tx(async task => {
            const partitions = await this.context.queries.getNodesFromIdList(task, idList)
            const issues: ResponseMessage[] = []
            partitions.forEach(part => {
                if (part.parent !== null) {
                    issues.push({kind: "NodeIsNotPartition", message: `Node with id "${part.id}" cannot be deleted because it is not a partition, it has parent with id "${part.parent}"`})
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
            await this.context.queries.deletePartitions(task, clientId, idList)
            return { status: HttpSuccessCodes.Ok, query: "", queryResult: EMPTY_SUCCES_RESPONSE }
        })
    }
      
    bulkStore = async (clientId: string, chunk: LionWebJsonChunk): Promise<QueryReturnType<StoreResponse>> => {
        return await this.context.dbConnection.tx(async task => {
            return this.context.queries.store(task, clientId, chunk)
        })
    }

    /**
     * This implementation uses Postgres for querying
     * @param nodeIdList
     * @param depthLimit
     */
    bulkRetrieve = async (clientId: string, nodeIdList: string[], depthLimit: number): Promise<QueryReturnType<RetrieveResponse>> => {
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
        const [versionResult, nodes] = await this.context.dbConnection.multi(currentRepoVersionQuery() + retrieveQuery(nodeIdList, depthLimit))
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: {
                success: true,
                messages: [versionResultToResponse(versionResult)],
                chunk: nodesToChunk(nodes)
            }
        }
    }

    /**
     * Return _count_ free id's for _clientId_ and reserve these ids for this client only.
     * @param clientId
     * @param count
     */
    ids = async (clientId: string, count: number): Promise<QueryReturnType<IdsResponse>> => {
        logger.requestLog("Reserve Count ids " + count + " for " + clientId)
        return await this.context.dbConnection.tx(async task => {
            const result: string[] = []
            // Create a bunch of ids, they are probably all free 
            let done = false
            while (!done) {
                for (let i = 0; i < count; i++) {
                    const id = createId(clientId)
                    console.log("created id " + id)
                    result.push(createId(id))
                }
                // Check for already used or reserved ids and remove them if needed
                const reservedByOtherClient = await this.context.queries.reservedNodeIdsByOtherClient(task, clientId, result)
                if (reservedByOtherClient.length > 0) {
                    reservedByOtherClient.forEach(reservedId => {
                        const index = result.indexOf(reservedId.node_id)
                        result.splice(index, 1)
                    })
                }
                // Remove ids that are already in use
                const usedIds = await this.context.queries.nodeIdsInUse(task, result)
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
            const returnValue = await this.context.queries.makeNodeIdsReservation(task, clientId, result)

            return {
                status: HttpSuccessCodes.Ok,
                query: "",
                queryResult: {
                    success: returnValue.queryResult.success,
                    messages: returnValue.queryResult.messages,
                    ids: result
                }
            }
        })
    }
}
