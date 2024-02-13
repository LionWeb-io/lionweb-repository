import { CONTAINMENTS_TABLE, NODES_TABLE } from "@lionweb/repository-dbadmin"
import {
    LionWebJsonChunk,
    LionWebJsonNode,
    LionWebJsonChunkWrapper,
    NodeUtils,
    PropertyValueChanged,
    ReferenceChange,
    TargetOrderChanged,
    AnnotationAdded, AnnotationChange, AnnotationRemoved, ChildOrderChanged,
    NodeAdded, ChildAdded, ChildRemoved, LionWebJsonDiff, ParentChanged, AnnotationOrderChanged } from "@lionweb/validation"
import { BulkApiContext } from "../BulkApiContext.js"
import { makeQueryNodeTreeForIdList, QueryNodeForIdList } from "./QueryNode.js"
import { collectUsedLanguages } from "./UsedLanguages.js"
import { logger } from "@lionweb/repository-dbadmin"

export type NodeTreeResultType = {
    id: string
    parent: string
    depth: number
}

export type QueryReturnType<T> = {
    status: number
    query: string
    queryResult: T
} 

/**
 * Database functions.
 */
export class LionWebQueries {
    constructor(private context: BulkApiContext) {
    }

    /**
     * Get recursively all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (nodeIdList: string[], depthLimit: number): Promise<QueryReturnType<NodeTreeResultType[]>> => {
        logger.dbLog("LionWebQueries.getNodeTree for " + nodeIdList)
        let query = ""
        try {
            if (nodeIdList.length === 0) {
                return { status: 401, query: "query", queryResult: [] }
            }
            // TODO Currently only gives the node id's, should give full node.
            query = makeQueryNodeTreeForIdList(nodeIdList, depthLimit)
            return { status: 410, query: query, queryResult: await this.context.dbConnection.query(query) }
        } catch(e) {
            console.log("Exception catched in getNodeTree(): " + e.message)
            return { status: 200, query: query, queryResult: e.message }
        }
    }

    /**
     * TODO: Not tested yet
     */
    getAllDbNodes = async (): Promise<LionWebJsonNode[]> => {
        logger.dbLog("LionWebQueries.getAllDbNodes")
        const queryResult = (await this.context.dbConnection.query(`SELECT id FROM ${NODES_TABLE}`)) as string[]
        return this.getNodesFromIdList(queryResult)
    }

    getNodesFromIdList = async (nodeIdList: string[]): Promise<LionWebJsonNode[]> => {
        logger.dbLog("LionWebQueries.getNodesFromIdList: " + nodeIdList)
        // this is necessary as otherwise the query would crash as it is not intended to be run
        // on an empty set
        if (nodeIdList.length == 0) {
            return []
        }
        return await this.context.dbConnection.query(QueryNodeForIdList(nodeIdList))
    }

    /**
     * Get all partitions: this returns all nodes that have parent set to null or undefined
     */
    getPartitions = async (): Promise<QueryReturnType<LionWebJsonChunk>> => {
        logger.dbLog("LionWebQueries.getPartitions")
        // TODO Optimization?: The following WHERE can also directly be includes in the getNodesFromIdList
        const result = await this.selectNodesIdsWithoutParent()
        logger.dbLog("LionWebQueries.getPartitions.Result: " + JSON.stringify(result))
        const nodes = await this.getNodesFromIdList(result.map(n => n.id))
        return {
            status: 400,
            query: "query",
            queryResult: {
                serializationFormatVersion: "2023.1",
                languages: collectUsedLanguages(nodes),
                nodes: nodes
            }
        }
    }

    // TODO This function is way too complex, should be simplified.
    /**
     * Store all nodes in the `nodes` collection in the nodes table.
     *
     * @param toBeStoredChunk
     */
    store = async (toBeStoredChunk: LionWebJsonChunk): Promise<QueryReturnType<string>> => {
        if (toBeStoredChunk === null || toBeStoredChunk === undefined) {
            return { status: 400, query: "", queryResult: "null chunk not stored" }
        }
        const toBeStoredChunkWrapper = new LionWebJsonChunkWrapper(toBeStoredChunk)
        const tbsNodeIds = toBeStoredChunk.nodes.map(node => node.id)
        const tbsContainedChildIds = this.getContainedIds(toBeStoredChunk.nodes)
        const tbsNodeAndChildIds = [...tbsNodeIds, ...tbsContainedChildIds.filter(cid => !tbsNodeIds.includes(cid))]
        // Retrieve nodes for all id's that exist
        const databaseChunk = await this.context.bulkApiWorker.bulkRetrieve(tbsNodeAndChildIds, "", 0)
        const databaseChunkWrapper = new LionWebJsonChunkWrapper(databaseChunk)

        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(databaseChunk, toBeStoredChunk)
        logger.dbLog("STORE.CHANGES ")
        logger.dbLog(diff.diffResult.changes.map(ch => "    " + ch.changeMsg()))

        const toBeStoredNewNodes = diff.diffResult.changes.filter((ch): ch is NodeAdded => ch.changeType === "NodeAdded")
        const addedChildren: ChildAdded[] = diff.diffResult.changes.filter((ch): ch is ChildAdded => ch instanceof ChildAdded)
        const removedChildren = diff.diffResult.changes.filter((ch): ch is ChildRemoved => ch.changeType === "ChildRemoved")
        const parentChanged = diff.diffResult.changes.filter((ch): ch is ParentChanged => ch.changeType === "ParentChanged")
        const propertyChanged = diff.diffResult.changes.filter((ch): ch is PropertyValueChanged => ch.changeType === "PropertyValueChanged")
        const targetsChanged = diff.diffResult.changes.filter((ch): ch is ReferenceChange => ch instanceof ReferenceChange)
        const addedAnnotations = diff.diffResult.changes.filter((ch): ch is AnnotationAdded => ch instanceof AnnotationAdded)
        const removedAnnotations = diff.diffResult.changes.filter((ch): ch is AnnotationRemoved => ch instanceof AnnotationRemoved)
        const childrenOrderChanged = diff.diffResult.changes.filter((ch): ch is ChildOrderChanged => ch instanceof ChildOrderChanged)
        const annotationOrderChanged = diff.diffResult.changes.filter((ch): ch is AnnotationOrderChanged => ch instanceof AnnotationOrderChanged)
        const targetOrderChanged = diff.diffResult.changes.filter((ch): ch is TargetOrderChanged => ch instanceof TargetOrderChanged)

        // Only children that already exist in the database
        const databaseChildrenOfNewNodes = this.getContainedIds(toBeStoredNewNodes.map(ch => ch.node))
            .filter(id => databaseChunkWrapper.getNode(id) !== undefined)
            .map(id => databaseChunkWrapper.getNode(id))

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
            999
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
        const addedAndNotParentChangedChildren = addedChildren.filter(added => {
            return parentChanged.find(parentChange => parentChange.node.id === added.childId) === undefined
        })

        // implicit child remove, find all parents
        const implicitlyRemovedChildNodes = await this.context.bulkApiWorker.bulkRetrieve(
            addedAndNotRemovedChildren.map(ch => ch.childId),
            "",
            0
        )
        const parentsOfImplicitlyRemovedChildNodes = await this.context.bulkApiWorker.bulkRetrieve(
            implicitlyRemovedChildNodes.nodes.map(node => node.parent),
            "",
            0
        )
        // Now all changes are turned into queries.
        let queries = ""
        queries += this.context.queryMaker.upsertQueriesForPropertyChanges(propertyChanged)
        queries += this.context.queryMaker.upsertAddedChildrenQuery(addedChildren, toBeStoredChunkWrapper)
        queries += this.context.queryMaker.updateQueriesForRemovedChildren(removedChildren, toBeStoredChunkWrapper)
        queries += this.context.queryMaker.updateQueriesForChildOrder(childrenOrderChanged)
        queries += this.makeQueriesForParentChanged(parentChanged)
        queries += this.updateQueriesForImplicitlyRemovedChildNodes(implicitlyRemovedChildNodes, parentsOfImplicitlyRemovedChildNodes)
        queries += this.makeQueriesForImplicitParentChanged(addedAndNotParentChangedChildren)
        // queries += this.chro(removedAndNotAddedChildren.map(ra => ra.childId))
        queries += this.context.queryMaker.makeQueriesForOrphans(orphansContainedChildrenOrphans.map(oc => oc.id))
        queries += this.context.queryMaker.makeQueriesForOrphans(removedAndNotAddedAnnotations.map(oc => oc.annotationId))
        queries += this.context.queryMaker.upsertQueriesForReferenceChanges(targetsChanged)
        queries += this.context.queryMaker.updateReferenceTargetOrder(targetOrderChanged)
        queries += this.makeQueriesForAnnotationsChanged([...addedAnnotations, ...removedAnnotations, ...annotationOrderChanged])
        queries += this.context.queryMaker.dbInsertNodeArray(toBeStoredNewNodes.map(ch => (ch as NodeAdded).node))
        // And run them on the database
        if (queries !== "") {
            logger.dbLog("QUERIES " + queries)
            await this.context.dbConnection.query(queries)
        }
        return { status: 200, query: queries, queryResult: queries }
    }

    private updateQueriesForImplicitlyRemovedChildNodes(
        implicitlyRemovedChildNodes: LionWebJsonChunk,
        parentsOfImplicitlyRemovedChildNodes: LionWebJsonChunk
    ) {
        let queries = ""
        implicitlyRemovedChildNodes.nodes.forEach(child => {
            const previousParentNode = parentsOfImplicitlyRemovedChildNodes.nodes.find(p => (p.id = child.parent))
            const changedContainment = NodeUtils.findContainmentContainingChild(previousParentNode.containments, child.id)
            const index = changedContainment.children.indexOf(child.id)
            const newChildren = [...changedContainment.children]
            newChildren.splice(index, 1)
            const setChildren = this.context.pgp.helpers.sets({ children: newChildren }, this.context.tableDefinitions.CONTAINMENTS_COLUMN_SET)
            queries += `-- Implicitly removed children
                UPDATE ${CONTAINMENTS_TABLE} c 
                    SET ${setChildren}
                WHERE
                    c.node_id = '${previousParentNode.id}' AND
                    c.containment->>'key' = '${changedContainment.containment.key}' AND 
                    c.containment->>'version' = '${changedContainment.containment.version}'  AND
                    c.containment->>'language' = '${changedContainment.containment.language}' ;
                `
        })
        return queries
    }

    private makeQueriesForParentChanged(parentChanged: ParentChanged[]) {
        let queries = "-- makeQueriesForParentChanged"
        parentChanged.forEach(parentChanged => {
            queries += this.context.queryMaker.updateParentQuery(parentChanged.node.id, parentChanged.afterParentId)
        })
        return queries
    }

    private makeQueriesForImplicitParentChanged(addedAndNotParentChangedChildren: ChildAdded[]) {
        let queries = "-- makeQueriesForImplicitParentChanged\n"
        addedAndNotParentChangedChildren.forEach(added => {
            queries += this.context.queryMaker.updateParentQuery(added.childId, added.parentNode.id)
        })
        return queries
    }

    private makeQueriesForAnnotationsChanged(annotationChanges: AnnotationChange[]) {
        let queries = "-- makeQueriesForAnnotationsChanged\n"
        annotationChanges
            .forEach(annotationChange => {
                queries += this.context.queryMaker.updateAnnotationsQuery(annotationChange.nodeBefore.id, annotationChange.nodeAfter.annotations)
            })
        return queries
    }
    
    async deletePartitions(idList: string[]): Promise<void> {
        const partitions = await this.getNodesFromIdList(idList)
        // Validate that the nodes are partitions
        partitions.forEach(part => {
            if (part.parent !== null) {
                return { status: 200, query: "", result: `Node with id "${part.id}" is not a partition, it has parent with id "${part.parent}"` }
            }
        })
        // Remove the partition nodes and all children/annotations
        const removedNodes = (await this.getNodeTree(idList,   999)).queryResult.map(n => n.id)
        const query = this.context.queryMaker.makeQueriesForOrphans(removedNodes)
        return await this.context.dbConnection.query(query)
    }

    public async selectNodesIdsWithoutParent(): Promise<{ id: string }[]> {
        return (await this.context.dbConnection.query(this.context.queryMaker.makeSelectNodesIdsWithoutParent)) as { id: string }[]
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

// export const LIONWEB_QUERIES = new LionWebQueries()
