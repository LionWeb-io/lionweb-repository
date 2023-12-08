import { LionWebJsonNode } from "@lionweb/validation";
import { LIONWEB_QUERIES } from "./LionWebQueries.js";

/**
 * Implementations of the LionWebBulkApi methods.
 */
class LionWebBulkApiWorker {
    // private lionwebDb2: LionWebQueries ;
    
    constructor() {
        // this.lionwebDb2 = LIONWEB_QUERIES ;
    }
    
    async bulkPartitions(): Promise<LionWebJsonNode[]> {
        return await LIONWEB_QUERIES.getPartitions();
    }

    async bulkStore(nodes: LionWebJsonNode[]) {
        return await LIONWEB_QUERIES.store(nodes);
    }

    /**
     * This implementation uses Postgres for querying
     * @param nodeIdList
     * @param mode
     * @param depthLimit
     */
    async bulkRetrieve(nodeIdList: string[], mode: string, depthLimit: number) {
        const allNodes = await LIONWEB_QUERIES.getNodeTree(nodeIdList, depthLimit);
        console.log("LionWebBulkApiWorker.bulkRetrieve: all " + JSON.stringify(allNodes));
        if (allNodes.length === 0) {
            return [];
        } 
        return LIONWEB_QUERIES.getNodesFromIdList(allNodes.map(node => node.id));
    }
}

export const LIONWEB_BULKAPI_WORKER = new LionWebBulkApiWorker();
