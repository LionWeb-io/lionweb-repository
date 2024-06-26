import { RepositoryData, requestLogger } from "@lionweb/repository-common";
import { AdditionalApiContext } from "../main.js";

/**
 * Implementations of the additional non-LionWeb methods.
 */
export class AdditionalApiWorker {
    constructor(private context: AdditionalApiContext) {
    }
    getNodeTree = async (repositoryData: RepositoryData, nodeIds: string[], depthLimit: number)=> {
        
        requestLogger.info("AdditionalApiWorker.getNodeTree for " + nodeIds + " with depth " + depthLimit)
        return await this.context.queries.getNodeTree(repositoryData, nodeIds, depthLimit)
    }

}
