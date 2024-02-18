import { logger } from "@lionweb/repository-dbadmin";
import { LionWebJsonChunk } from "@lionweb/validation"
import { BulkApiContext } from "../BulkApiContext.js"
import { QueryReturnType } from "../database/LionWebQueries.js"
import { collectUsedLanguages } from "../database/UsedLanguages.js"

/**
 * Implementations of the LionWebBulkApi methods.
 */
export class BulkApiWorker {
    private context: BulkApiContext

    constructor(context: BulkApiContext) {
        this.context = context
    }

    async bulkPartitions(): Promise<QueryReturnType<LionWebJsonChunk>> {
        return await this.context.queries.getPartitions()
    }

    /**
     * @param chunk A LionWeb chunk containing all nodes that are to be created as partitions.
     */
    createPartitions = async (chunk: LionWebJsonChunk): Promise<QueryReturnType<string>> => {
        logger.requestLog("BulkApiWorker.createPartitions")
        const existingNodes = await this.context.queries.getNodesFromIdList(chunk.nodes.map(n => n.id))
        if (existingNodes.length > 0) {
            return { 
                status: 400, 
                query: "", 
                queryResult: `Nodes with ids "${existingNodes.map(n => n.id)}" cannot be created as partitions, because they already exist.` 
            }
        }
        return await this.context.queries.createPartitions(chunk)
    }

    /**
     * Delete all partitions 
     * @param idList The list iof node id's of partition nodes that are to be removed.
     */
    deletePartitions = async(idList: string[]): Promise<QueryReturnType<string[]>> => {
        const partitions = await this.context.queries.getNodesFromIdList(idList)
        const issues: string[] = []
        partitions.forEach(part => {
            if (part.parent !== null) {
                issues.push(`Node with id "${part.id}" cannot be deleted because it is not a partition, it has parent with id "${part.parent}"`)
            }
        })
        if (issues.length !== 0) {
            return { status: 400, query: "", queryResult: issues }
        }
        this.context.queries.deletePartitions(idList)
        return { status: 200, query: "", queryResult: [] }
    }

    bulkStore = async (chunk: LionWebJsonChunk): Promise<QueryReturnType<string>> => {
        return await this.context.queries.store(chunk)
    }

    /**
     * This implementation uses Postgres for querying
     * @param nodeIdList
     * @param mode
     * @param depthLimit
     */
    bulkRetrieve = async (nodeIdList: string[], mode: string, depthLimit: number): Promise<LionWebJsonChunk> => {
        if (nodeIdList.length === 0) {
            return {
                serializationFormatVersion: "2023.1",
                languages: [],
                nodes: [],
            }
        }
        const allNodes = await this.context.queries.getNodeTree(nodeIdList, depthLimit)
        if (allNodes.queryResult.length === 0) {
            return {
                serializationFormatVersion: "2023.1",
                languages: [],
                nodes: [],
            }
        }
        const nodes = await this.context.queries.getNodesFromIdList(allNodes.queryResult.map(node => node.id))
        return {
            serializationFormatVersion: "2023.1",
            languages: collectUsedLanguages(nodes),
            nodes: nodes,
        }
    }
}
