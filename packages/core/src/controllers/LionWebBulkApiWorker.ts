import { LionWebJsonChunk } from "@lionweb/validation"
import { LIONWEB_QUERIES } from "../database/LionWebQueries.js"
import { collectUsedLanguages } from "../database/UsedLanguages.js"
import {logger} from "../logging.js";

/**
 * Implementations of the LionWebBulkApi methods.
 */
class LionWebBulkApiWorker {

    constructor() {
    }

    async bulkPartitions(): Promise<LionWebJsonChunk> {
        return await LIONWEB_QUERIES.getPartitions()
    }

    async bulkStore(chunk: LionWebJsonChunk) {
        return await LIONWEB_QUERIES.store(chunk)
    }

    /**
     * This implementation uses Postgres for querying
     * @param nodeIdList
     * @param mode
     * @param depthLimit
     */
    async bulkRetrieve(nodeIdList: string[], mode: string, depthLimit: number): Promise<LionWebJsonChunk> {
        if (nodeIdList.length === 0) {
            return {
                serializationFormatVersion: "2023.1",
                languages: [],
                nodes: [],
            }
        }
        const allNodes = await LIONWEB_QUERIES.getNodeTree(nodeIdList, depthLimit)
        logger.dbLog("LionWebBulkApiWorker.bulkRetrieve: all " + allNodes.map(n => n.id))
        if (allNodes.length === 0) {
            return {
                serializationFormatVersion: "2023.1",
                languages: [],
                nodes: [],
            }
        }
        const nodes = await LIONWEB_QUERIES.getNodesFromIdList(allNodes.map(node => node.id))
        return {
            serializationFormatVersion: "2023.1",
            languages: collectUsedLanguages(nodes),
            nodes: nodes,
        }
    }
}

export const LIONWEB_BULKAPI_WORKER = new LionWebBulkApiWorker()
