import {
    logger,
    PartitionsResponse,
    CreatePartitionsResponse,
    StoreResponse,
    asError,
    QueryReturnType, nodesToChunk, HttpSuccessCodes, EMPTY_SUCCES_RESPONSE, HttpClientErrors,
    ReservedIdRecord, LionwebResponse, FOREVER, UNLIMITED_DEPTH, NODES_TABLE, NODES_TABLE_HISTORY
} from "@lionweb/repository-common"
import {
    LionWebJsonChunk,
    LionWebJsonNode,
    LionWebJsonChunkWrapper,
    NodeUtils,
    PropertyValueChanged,
    ReferenceChange,
    AnnotationAdded, AnnotationChange, AnnotationRemoved, ChildOrderChanged,
    NodeAdded, ChildAdded, ChildRemoved, LionWebJsonDiff, ParentChanged, AnnotationOrderChanged, JsonContext, NodeRemoved, createLwNode
} from "@lionweb/validation"
import { BulkApiContext } from "../main.js"
import { DbChanges } from "./DbChanges.js";
import {
    currentRepoVersionQuery,
    makeQueryNodeTreeForIdList,
    nextRepoVersionQuery,
    nodesForQueryQuery,
    QueryNodeForIdList,
    versionResultToResponse
} from "./QueryNode.js"

export type NodeTreeResultType = {
    id: string
    parent: string
    depth: number
}

/**
 * Database functions.
 */
export class LionWebQueries {
    constructor(private context: BulkApiContext) {
    }

    /**
     * Get recursively the ids of all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (nodeIdList: string[], depthLimit: number): Promise<QueryReturnType<NodeTreeResultType[]>> => {
        logger.dbLog("LionWebQueries.getNodeTree for " + nodeIdList)
        let query = ""
        try {
            if (nodeIdList.length === 0) {
                return { status: HttpClientErrors.PreconditionFailed, query: "query", queryResult: [] }
            }
            query = makeQueryNodeTreeForIdList(nodeIdList, depthLimit)
            return { status: HttpSuccessCodes.Ok, query: query, queryResult: await this.context.dbConnection.query(query) }
        } catch (e) {
            const error = asError(e)
            console.error("Exception catched in LionWebQueries.getNodeTree(): " + error.message)
            logger.dbLog("======================================================================")
            logger.requestLog(query)
            throw error
        }
    }

    getNodesFromIdList = async (nodeIdList: string[]): Promise<LionWebJsonNode[]> => {
        logger.dbLog("LionWebQueries.getNodesFromIdList: " + nodeIdList)
        // this is necessary as otherwise the query would crash as it is not intended to be run on an empty set
        if (nodeIdList.length == 0) {
            return []
        }
        return await this.context.dbConnection.query(QueryNodeForIdList(nodeIdList))
    }

    /**
     * Get all partitions: this returns all nodes that have parent set to null or undefined
     */
    getPartitions = async (): Promise<QueryReturnType<PartitionsResponse>> => {
        logger.requestLog("LionWebQueries.getPartitions")
        let query = currentRepoVersionQuery()
        query += nodesForQueryQuery(`SELECT * FROM ${NODES_TABLE} WHERE parent is null`)
        const [versionResult, result] = await this.context.dbConnection.multi(query)
        return {
            status: HttpSuccessCodes.Ok,
            query: "query",
            queryResult:{ 
                chunk: nodesToChunk(result),
                success: true,
                messages: [versionResultToResponse(versionResult)]
            }
        }
    }

    /**
     * Get the current version of the repo.
     * Should only be used by non-changing queries, as otherwise the _nextRepoVersion_ function should be used..
     */
    getRepoVersion = async (): Promise<number> => {
        const v = await this.context.dbConnection.one("SELECT value FROM current_data WHERE key = 'repo.version'")
        return Number.parseInt(v.value)
    }

    createPartitions = async (clientId: string, partitions: LionWebJsonChunk): Promise<QueryReturnType<CreatePartitionsResponse>> => {
        logger.requestLog("LionWebQueries.createPartitions")
        let query = nextRepoVersionQuery(clientId)
        query += this.context.queryMaker.dbInsertNodeArray(partitions.nodes)
        const [versionresult, result] = await this.context.dbConnection.multi(query)
        return {
            status: HttpSuccessCodes.Ok,
            query: query,
            queryResult:{
                success: true,
                messages: [versionResultToResponse(versionresult)]
            }
        }
    }

    /**
     * Store all nodes in the `nodes` collection in the nodes table.
     *
     * @param toBeStoredChunk
     */
    store = async (clientId: string, toBeStoredChunk: LionWebJsonChunk): Promise<QueryReturnType<StoreResponse>> => {
        logger.dbLog("LionWebQueries.store")
        return await this.context.dbConnection.tx(async task => {
            if (toBeStoredChunk === null || toBeStoredChunk === undefined) {
                return {
                    status: HttpClientErrors.PreconditionFailed, query: "", queryResult: {
                        success: false,
                        messages: [{ kind: "NullChunk", message: "null chunk not stored" }]
                    }
                }
            }
            // const toBeStoredChunkWrapper = new LionWebJsonChunkWrapper(toBeStoredChunk)
            const tbsNodeIds = toBeStoredChunk.nodes.map(node => node.id)
            const tbsContainedChildIds = this.getContainedIds(toBeStoredChunk.nodes)
            const tbsNodeAndChildIds = [...tbsNodeIds, ...tbsContainedChildIds.filter(cid => !tbsNodeIds.includes(cid))]
            logger.dbLog("tbsNodeAndChildIds " + tbsNodeAndChildIds)
            // Retrieve nodes for all id's that exist
            const databaseChunk = await this.context.bulkApiWorker.bulkRetrieve(clientId, tbsNodeAndChildIds, 0)
            logger.dbLog("Bulk retrieve done " )
            const databaseChunkWrapper = new LionWebJsonChunkWrapper(databaseChunk.queryResult.chunk)
            logger.dbLog("DBChunk " + JSON.stringify(databaseChunkWrapper.jsonChunk))
            
            // Check whether there are new nodes without a parent
            const newNodesWithoutParent = toBeStoredChunk.nodes
                .filter(node => node.parent === null)
                .filter(node => databaseChunkWrapper.getNode(node.id) === undefined)
            if (newNodesWithoutParent.length !== 0) {
                return {
                    status: HttpClientErrors.PreconditionFailed, query: "", queryResult: {
                        success: false,
                        messages: [{ kind: "ParentMissing", message: `Cannot create new nodes ${newNodesWithoutParent.map(n => n.id)} without parent` }]
                    }
                }
            }
    
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(databaseChunkWrapper.jsonChunk, toBeStoredChunk)
            logger.dbLog("STORE.CHANGES ")
            logger.dbLog(diff.diffResult.changes.map(ch => "    " + ch.changeMsg()))
    
            const toBeStoredNewNodes = diff.diffResult.changes.filter((ch): ch is NodeAdded => ch.changeType === "NodeAdded")
            const addedChildren: ChildAdded[] = diff.diffResult.changes.filter((ch): ch is ChildAdded => ch instanceof ChildAdded)
            const removedChildren = diff.diffResult.changes.filter((ch): ch is ChildRemoved => ch.changeType === "ChildRemoved")
            const childrenOrderChanged = diff.diffResult.changes.filter((ch): ch is ChildOrderChanged => ch instanceof ChildOrderChanged)
            const parentChanged = diff.diffResult.changes.filter((ch): ch is ParentChanged => ch.changeType === "ParentChanged")
            const propertyChanged = diff.diffResult.changes.filter((ch): ch is PropertyValueChanged => ch.changeType === "PropertyValueChanged")
            const targetsChanged = diff.diffResult.changes.filter((ch): ch is ReferenceChange => ch instanceof ReferenceChange)
            const addedAnnotations = diff.diffResult.changes.filter((ch): ch is AnnotationAdded => ch instanceof AnnotationAdded)
            const removedAnnotations = diff.diffResult.changes.filter((ch): ch is AnnotationRemoved => ch instanceof AnnotationRemoved)
            const annotationOrderChanged = diff.diffResult.changes.filter((ch): ch is AnnotationOrderChanged => ch instanceof AnnotationOrderChanged)
    
            // Only children that already exist in the database
            const databaseChildrenOfNewNodes = this.getContainedIds(toBeStoredNewNodes.map(ch => ch.node))
                .flatMap(id => {
                    const node = databaseChunkWrapper.getNode(id)
                    return node !== undefined ? [node] : []
                })
    
            // Orphans
            const removedAndNotAddedChildren = removedChildren.filter(removed => {
                return (
                    addedChildren.find(added => added.childId === removed.childId) === undefined &&
                    databaseChildrenOfNewNodes.find(child => child.id === removed.childId) === undefined
                )
            })
            // Orphaned annotations
            const removedAndNotAddedAnnotations = removedAnnotations.filter(removed => {
                return (
                    addedAnnotations.find(added => added.annotationId === removed.annotationId) === undefined &&
                    databaseChildrenOfNewNodes.find(child => child.id === removed.annotationId) === undefined
                )
            })
            // Now get all children of the orphans
            const orphansContainedChildren = await this.getNodeTree(
                removedAndNotAddedChildren.map(rm => rm.childId),
                UNLIMITED_DEPTH
            )
            const orphansContainedChildrenOrphans = orphansContainedChildren.queryResult.filter(contained => {
                return (
                    addedChildren.find(added => added.childId === contained.id) === undefined &&
                    databaseChildrenOfNewNodes.find(child => child.id === contained.id) === undefined
                )
            })
    
            // remove child: from old parent
            const addedAndNotRemovedChildren = addedChildren.filter(added => {
                return removedChildren.find(removed => removed.childId === added.childId) === undefined
            })
            // Child node itself needs updating its parent
            logger.dbLog("ADDED CHILDREN " + addedChildren.map(ch => ch.childId))
            // Existing nodes that have moved parent without the node being in the TBS chunk.
            const addedAndNotParentChangedChildren = addedChildren.filter(added => {
                return parentChanged.find(parentChange => parentChange.node.id === added.childId) === undefined &&
                    toBeStoredNewNodes.find(nodeAdded => nodeAdded.node.id === added.childId) === undefined
            })
    
            // implicit child remove, find all parents
            const implicitlyRemovedChildNodes = await this.context.bulkApiWorker.bulkRetrieve(
                clientId,
                addedAndNotRemovedChildren.map(ch => ch.childId),
                0
            )
            const parentsOfImplicitlyRemovedChildNodes = await this.context.bulkApiWorker.bulkRetrieve(
                clientId,
                implicitlyRemovedChildNodes.queryResult.chunk.nodes.map(node => node.parent),
                0
            )
            // Now all changes are turned into queries.
            const dbCommands = new DbChanges(this.context)
            let queries = ""
            dbCommands.addChanges(propertyChanged)
            dbCommands.addChanges([...addedChildren, ...removedChildren, ...childrenOrderChanged])
            dbCommands.addChanges(parentChanged)
            this.makeQueriesForImplicitParentChanged(dbCommands, addedAndNotParentChangedChildren, databaseChunkWrapper)
            dbCommands.addChanges(targetsChanged)
            dbCommands.addChanges([...addedAnnotations, ...removedAnnotations, ...annotationOrderChanged])
            // Now deletions
            dbCommands.addChanges(orphansContainedChildrenOrphans.map(oc => {
                // Create dummy node to avoid lookup, we only need the _id_ of the node
                const dummyNode = createLwNode()
                dummyNode.id = oc.id
                return new NodeRemoved(new JsonContext(null, ["implicit_orphan"]), dummyNode)
            }))
            dbCommands.addChanges(removedAndNotAddedAnnotations.map(oc => {
                // Create dummy node to avoid lookup, we only need the _id_ of the node
                const dummyNode2 = createLwNode()
                dummyNode2.id = oc.annotationId
                return new NodeRemoved(new JsonContext(null, ["implicit_orphan"]), dummyNode2)
            }))
            this.dbCommandsForImplicitlyRemovedChildNodes(dbCommands, implicitlyRemovedChildNodes.queryResult.chunk, parentsOfImplicitlyRemovedChildNodes.queryResult.chunk)
            queries += dbCommands.createPostgresQuery()
    
            // Check whether new node ids are not reserved for another client
            const reservedIds = await this.reservedNodeIdsByOtherClient(clientId, toBeStoredNewNodes.map(ch => ch.node.id))
            if (reservedIds !== undefined && reservedIds.length > 0) {
                return {
                    status: HttpClientErrors.PreconditionFailed,
                    query: "",
                    queryResult: {
                        success: false,
                        messages: [
                            { 
                                kind: "ReservedId",
                                message: `The following id's are reserved by other client(s): ${reservedIds.map(id => `{ node id ${id.node_id} by client ${id.client_id}`).join(', ')}.`,
                            }
                        ]
                    }
                }
            }
            queries += this.context.queryMaker.dbInsertNodeArray(toBeStoredNewNodes.map(ch => (ch as NodeAdded).node))
            // And run them on the database
            if (queries !== "") {
                queries = nextRepoVersionQuery(clientId) + queries
                logger.dbLog("QUERIES " + queries)
                const multiResult = await this.context.dbConnection.multi(queries)
                return {
                    status: HttpSuccessCodes.Ok,
                    query: queries,
                    queryResult: {
                        success: true,
                        messages: [
                            versionResultToResponse(multiResult[0]),
                            { kind: "QueryFromStore", message: queries }
                        ],
                    }
                }
            } else {
                // Nothing to change, empty query
                const version = await this.getRepoVersion()
                return {
                    status: HttpSuccessCodes.Ok,
                    query: queries,
                    queryResult: {
                        success: true,
                        messages: [
                            {
                                kind: "RepoVersion",
                                message: "RepositoryVersion at end of Transaction",
                                data: { "version": `${version}` }
                            },
                            {
                                kind: "RepoVersion",
                                message: "Nothing to store",
                                data: { "version": `${version}` }
                            },
                            { kind: "QueryFromStore", message: queries }
                        ],
                    }
                }
            }
        })
    }

    async reservedNodeIdsByOtherClient(clientId: string, addedNodes: string[]): Promise<ReservedIdRecord[]> {
        if (addedNodes.length > 0) {
            const query = this.context.queryMaker.findReservedNodesFromIdList(clientId, addedNodes)
            const result = await this.context.dbConnection.query(query) as ReservedIdRecord[]
            return result
        }
    }

    async nodeIdsInUse(nodeIds: string[]): Promise<{ id: string }[]> {
        if (nodeIds.length > 0) {
            const query = this.context.queryMaker.findNodeIdsInUse(nodeIds)
            const result = (await this.context.dbConnection.query(query)) as { id: string }[]
            return result
        }
    }

    async makeNodeIdsReservation(clientId: string, idsAdded: string[]): Promise<QueryReturnType<LionwebResponse>> {
        if (idsAdded.length > 0) {
            const query = this.context.queryMaker.storeReservedNodeIds(clientId, idsAdded)
            await this.context.dbConnection.query(query)
            return {
                status: HttpSuccessCodes.Ok,
                query: query,
                queryResult: { 
                    success: true,
                    messages: []
                }
            }
        }
    }

    private dbCommandsForImplicitlyRemovedChildNodes(
        dbCommands: DbChanges,
        implicitlyRemovedChildNodes: LionWebJsonChunk,
        parentsOfImplicitlyRemovedChildNodes: LionWebJsonChunk
    ) {
        implicitlyRemovedChildNodes.nodes.forEach(child => {
            const previousParentNode = parentsOfImplicitlyRemovedChildNodes.nodes.find(p => (p.id = child.parent))
            const changedContainment = NodeUtils.findContainmentContainingChild(previousParentNode.containments, child.id)
            const index = changedContainment.children.indexOf(child.id)
            const newChildren = [...changedContainment.children]
            newChildren.splice(index, 1)
            // Make a deep copy of the old parent node so we can change the children in there and create a Change object,
            const parentCopy: LionWebJsonNode = structuredClone(previousParentNode)
            // replace the containment with the removed child with a copy that does not have the child
            const changedContainmentCopy = NodeUtils.findContainmentContainingChild(parentCopy.containments, child.id)
            const indexCopy = changedContainmentCopy.children.indexOf(child.id)
            changedContainmentCopy.children.splice(indexCopy, 1)
            const change = new ChildRemoved(new JsonContext(null, ["implictlyRemovedChild"]), parentCopy, changedContainmentCopy.containment, changedContainmentCopy, child.id)
            dbCommands.addChanges([change])
        })
    }

    /**
     * Creates a set of ParentChanged diff objects, which are converted by DatabaseChanges to SQL.
     * @param addedAndNotParentChangedChildren
     * @param databaseChunkWrapper
     * @private
     */
    private makeQueriesForImplicitParentChanged(dbCommands: DbChanges, addedAndNotParentChangedChildren: ChildAdded[], databaseChunkWrapper : LionWebJsonChunkWrapper) {
        const changes: ParentChanged[] = []
        addedAndNotParentChangedChildren.forEach(added => {
            const node = databaseChunkWrapper.getNode(added.childId)
            if (node !== undefined) {
                logger.dbLog("FOUND CHILD PARENT " + JSON.stringify(node))
                changes.push(new ParentChanged(new JsonContext(null, ["implicitParentChange"]), node, node.parent, added.parentNode.id))
            } else {
                logger.dbLog("MISSING CHILD " + added.childId)
                throw new Error("MISSING CHILD " + added.childId + " in makeQueriesForImplicitParentChanged(...)")
            }
        })
        dbCommands.addChanges(changes)
    }

    private makeQueriesForAnnotationsChanged(annotationChanges: AnnotationChange[]) {
        const dbCommands = new DbChanges(this.context)
        dbCommands.addChanges(annotationChanges)
        return dbCommands.createPostgresQuery()
    }

    async deletePartitions(clientId: string, idList: string[]): Promise<void> {
        logger.dbLog(("LionWebQueries.deletePartitions: " + idList))
        // TODO combine in one query
        const partitions = await this.getNodesFromIdList(idList)
        // Validate that the nodes are partitions
        partitions.forEach(part => {
            if (part.parent !== null) {
                return { status: HttpClientErrors.PreconditionFailed, query: "", result: `Node with id "${part.id}" is not a partition, it has parent with id "${part.parent}"` }
            }
        })
        // Remove the partition nodes and all children/annotations
        const removedNodes = (await this.getNodeTree(idList, UNLIMITED_DEPTH)).queryResult.map(n => n.id)
        let query = nextRepoVersionQuery(clientId);
        query += this.context.queryMaker.makeQueriesForOrphans(removedNodes)
        logger.dbLog("DELETE PARTITIONS QUERY: " + query)
        return await this.context.dbConnection.query(query)
    }

    public async selectNodesIdsWithoutParent(): Promise<{ id: string }[]> {
        return (await this.context.dbConnection.query(this.context.queryMaker.selectNodesIdsWithoutParentQuery())) as { id: string }[]
    }

    /**
     * Recursively get all directly contained child ids in _nodes_, including annotation children.
     * @param nodes
     * @private
     */
    private getContainedIds(nodes: LionWebJsonNode[]) {
        return nodes
            .flatMap(node =>
                node.containments.flatMap(c => {
                    return c.children
                })
            )
            .concat(nodes.flatMap(node => node.annotations))
    }

}

export function printMap(map: Map<string, string>): string {
    let result = ""
    for (const entry of map.entries()) {
        result += `[${entry[0]} => ${entry[1]}]`
    }
    return result
}

