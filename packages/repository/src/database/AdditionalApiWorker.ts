import { dbConnection } from "./DbConnection.js"
import { LIONWEB_QUERIES } from "./LionWebQueries.js"

/**
 * Implementations of the additional non-LionWeb methods.
 */
class AdditionalApiWorker {
    async getNodeTree(nodeIds: string[], depthLimit: number) {
        console.log("AdditionalApiWorker.getNodeTree for " + nodeIds + " with depth " + depthLimit)
        return await LIONWEB_QUERIES.getNodeTree(nodeIds, depthLimit)
    }

    async init(sql: string) {
        return await dbConnection.query(sql)
    }
}

export const ADDITIONAL_API_WORKER = new AdditionalApiWorker()
