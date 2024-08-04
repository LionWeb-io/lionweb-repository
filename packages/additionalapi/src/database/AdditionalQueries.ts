import {
    HttpClientErrors,
    HttpSuccessCodes,
    QueryReturnType,
    RepositoryData,
    requestLogger
} from "@lionweb/repository-common";
import { AdditionalApiContext } from "../main.js";
import {
    makeQueryNodeTreeForIdList, makeQueryToAttachNode,
    makeQueryToCheckHowManyDoNotExist,
    makeQueryToCheckHowManyExist
} from "./QueryNode.js"
import {performImportFromFlatBuffers, populateFromBulkImport, storeNodes} from "./ImportLogic.js";
import { LionWebJsonMetaPointer, LionWebJsonNode} from "@lionweb/validation";
import {FBBulkImport} from "../io/lionweb/serialization/flatbuffers/index.js";
import {MetaPointersTracker} from "@lionweb/repository-dbadmin";

export type NodeTreeResultType = {
    id: string
    parent: string
    depth: number
}

export type BulkImportResultType = {
    status: number
    success: boolean
    description?: string
}

export type AttachPoint = {
    container: string
    containment: LionWebJsonMetaPointer
    root: string
}

export type BulkImport = {
    attachPoints: AttachPoint[]
    nodes: LionWebJsonNode[]
}

/**
 * Database functions.
 */
export class AdditionalQueries {
    constructor(private context: AdditionalApiContext) {
    }

    /**
     * Get recursively the ids of all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (repositoryData: RepositoryData, nodeIdList: string[], depthLimit: number): Promise<QueryReturnType<NodeTreeResultType[]>> => {
        requestLogger.info("AdditionalQueries.getNodeTree for " + nodeIdList)
        let query = ""
        if (nodeIdList.length === 0) {
            return { status: HttpSuccessCodes.NoContent, query: "query", queryResult: [] }
        }
        query = makeQueryNodeTreeForIdList(nodeIdList, depthLimit)
        return { status: HttpSuccessCodes.Ok, query: query, queryResult: await this.context.dbConnection.query(repositoryData, query) }
    }

    bulkImport = async (repositoryData: RepositoryData, bulkImport: BulkImport): Promise<BulkImportResultType> => {
        requestLogger.info("AdditionalQueries.bulkImport")

        // Check - We verify there are no duplicate IDs in the new nodes
        const newNodesSet = new Set<string>()
        const parentsSet : Set<string> = new Set<string>()
        for (const node of bulkImport.nodes) {
            if (newNodesSet.has(node.id)) {
                return { status: HttpClientErrors.BadRequest, success: false, description: `Node with ID ${node.id} is being inserted twice` }
            }
            newNodesSet.add(node.id)
            parentsSet.add(node.parent)
        }

        // Check - We verify all the parent nodes are either other new nodes or the attach points containers
        const attachPointContainers : Set<string> = new Set<string>()
        bulkImport.attachPoints.forEach(attachPoint => {
            attachPointContainers.add(attachPoint.container)
        })
        parentsSet.forEach(parent => {
           if (!newNodesSet.has(parent) && !attachPointContainers.has(parent)) {
               return { status: HttpClientErrors.BadRequest, success: false, description: `Invalid parent specified: ${parent}. It is not one of the new nodes being added or one of the attach points` }
           }
        });

        // Check - verify the root of the attach points are among the new nodes
        bulkImport.attachPoints.forEach(attachPoint => {
            if (!newNodesSet.has(attachPoint.root)) {
                return { status: HttpClientErrors.BadRequest, success: false, description: `Attach point root ${attachPoint.root} does not appear among the new nodes` }
            }
        })

        // Check - verify all the given new nodes are effectively new
        const allNewNodesResult = await this.context.dbConnection.query(repositoryData, makeQueryToCheckHowManyExist(newNodesSet));
        if (allNewNodesResult > 0) {
            return { status: HttpClientErrors.BadRequest, success: false, description: `Some of the given nodes already exist` }
        }

        // Check - verify the containers from the attach points are existing nodes
        const allExistingNodesResult = await this.context.dbConnection.query(repositoryData, makeQueryToCheckHowManyDoNotExist(attachPointContainers));
        if (allExistingNodesResult > 0) {
            return { status: HttpClientErrors.BadRequest, success: false, description: `Some of the attach point containers do not exist` }
        }

        // Add all the new nodes
        const pool = this.context.pgPool;
        const metaPointersTracker = new MetaPointersTracker(repositoryData);
        await populateFromBulkImport(metaPointersTracker, bulkImport, repositoryData, this.context.dbConnection);
        await storeNodes(await pool.connect(), repositoryData, bulkImport, metaPointersTracker)

        // Attach the root of the new nodes to existing containers
        for (const attachPoint of bulkImport.attachPoints) {
            await this.context.dbConnection.query(repositoryData, makeQueryToAttachNode(attachPoint, metaPointersTracker))
        }

        return { status: HttpSuccessCodes.Ok, success: true }
    }

    /**
     * This is a variant of bulkImport that operates directly on Flatbuffers data structures, instead of converting them
     * to the "neutral" format and invoke bulkImport. This choice has been made for performance reasons.
     */
    bulkImportFromFlatBuffers = async (repositoryData: RepositoryData, bulkImport: FBBulkImport): Promise<BulkImportResultType> => {
        requestLogger.info(`LionWebQueries.bulkImportFromFlatBuffers (nodes ${bulkImport.nodesLength()}, attach points: ${bulkImport.attachPointsLength()})`)
        const pool = this.context.pgPool;

        return await performImportFromFlatBuffers(await pool.connect(), this.context.dbConnection, bulkImport, repositoryData)
    }

}
