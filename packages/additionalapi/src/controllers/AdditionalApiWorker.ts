import { RepositoryData, requestLogger } from "@lionweb/repository-common";
import { AdditionalApiContext } from "../main.js";
import {BulkImport} from "../database/index.js";
import {FBBulkImport} from "../io/lionweb/serialization/flatbuffers/index.js";

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

    /**
     * When processing a bulk import operation specified through JSON or ProtoBuf, we convert the payload to a BulkImport
     * so that we can process both of them with the same logic.
     * @param repositoryData
     * @param bulkImport
     */
    bulkImport = async (repositoryData: RepositoryData, bulkImport: BulkImport)=> {

        requestLogger.info("AdditionalApiWorker.bulkImport")
        return await this.context.queries.bulkImport(repositoryData, bulkImport)
    }
    /**
     * This is a variant of bulkImport that operates directly on Flatbuffers data structures, instead of converting them
     * to the "neutral" format and invoke bulkImport. This choice has been made for performance reasons.
     */
    bulkImportFromFlatBuffers = async (repositoryData: RepositoryData, bulkImport: FBBulkImport)=> {

        requestLogger.info("AdditionalApiWorker.bulkImportFromFlatBuffers")
        return await this.context.queries.bulkImportFromFlatBuffers(repositoryData, bulkImport)
    }
}
