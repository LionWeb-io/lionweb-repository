import {
    CreatePartitionsResponse,
    DeletePartitionsResponse, EMPTY_CHUNK,
    EMPTY_SUCCES_RESPONSE, HttpClientErrors, HttpSuccessCodes,
    logger, nodesToChunk,
    PartitionsResponse, QueryReturnType,
    ResponseMessage, RetrieveResponse, StoreResponse
} from "@lionweb/repository-common";
import { LionWebJsonChunk } from "@lionweb/validation"
import { BulkApiContext } from "../BulkApiContext.js"

/**
 * Implementations of the LionWebBulkApi methods.
 */
export class BulkApiWorker {
    private context: BulkApiContext

    constructor(context: BulkApiContext) {
        this.context = context
    }

    async bulkPartitions(): Promise<QueryReturnType<PartitionsResponse>> {
        return await this.context.queries.getPartitions()
    }

    /**
     * @param chunk A LionWeb chunk containing all nodes that are to be created as partitions.
     */
    createPartitions = async (chunk: LionWebJsonChunk): Promise<QueryReturnType<CreatePartitionsResponse>> => {
        logger.requestLog("BulkApiWorker.createPartitions")
        const existingNodes = await this.context.queries.getNodesFromIdList(chunk.nodes.map(n => n.id))
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
        return await this.context.queries.createPartitions(chunk)
    }

    /**
     * Delete all partitions 
     * @param idList The list of node id's of partition nodes that are to be removed.
     */
    deletePartitions = async(idList: string[]): Promise<QueryReturnType<DeletePartitionsResponse>> => {
        const partitions = await this.context.queries.getNodesFromIdList(idList)
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
        await this.context.queries.deletePartitions(idList)
        return { status: HttpSuccessCodes.Ok, query: "", queryResult: EMPTY_SUCCES_RESPONSE }
    }

    bulkStore = async (chunk: LionWebJsonChunk): Promise<QueryReturnType<StoreResponse>> => {
        return await this.context.queries.store(chunk)
    }

    /**
     * This implementation uses Postgres for querying
     * @param nodeIdList
     * @param mode
     * @param depthLimit
     */
    bulkRetrieve = async (nodeIdList: string[], mode: string, depthLimit: number): Promise<QueryReturnType<RetrieveResponse>> => {
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
        const allNodes = await this.context.queries.getNodeTree(nodeIdList, depthLimit)
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
        const nodes = await this.context.queries.getNodesFromIdList(allNodes.queryResult.map(node => node.id))
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
