import { AdditionalApiContext } from "../main.js";

/**
 * Implementations of the additional non-LionWeb methods.
 */
export class AdditionalApiWorker {
    constructor(private context: AdditionalApiContext) {
    }
    getNodeTree = async (nodeIds: string[], depthLimit: number)=> {
        console.log("AdditionalApiWorker.getNodeTree for " + nodeIds + " with depth " + depthLimit)
        return await this.context.additionalApiWorker.getNodeTree(nodeIds, depthLimit)
    }

}