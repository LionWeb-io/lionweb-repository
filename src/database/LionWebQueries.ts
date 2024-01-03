import {
    LionWebJsonChunk,
    LionWebJsonNode,
    LionWebJsonChunkWrapper,
    NodeUtils,
    PropertyValueChanged,
    ReferenceChange,
    LionWebJsonReferenceTarget, AnnotationAdded, AnnotationChange, AnnotationRemoved
} from "@lionweb/validation"

import { NodeAdded, ChildAdded, ChildRemoved, LionWebJsonDiff, ParentChanged } from "@lionweb/validation"
import { DB } from "./Db.js";
import { db } from "./DbConnection.js"
import { LIONWEB_BULKAPI_WORKER } from "./LionWebBulkApiWorker.js"
import { queryNodeTreeForIdList, QueryNodeForIdList, postgresArrayFromStringArray } from "./QueryNode.js"
import { collectUsedLanguages } from "./UsedLanguages.js"

export type NodeTreeResultType = {
    id: string
    parent: string
    depth: number
}

/**
 * Database functions.
 */
class LionWebQueries {
    constructor() {}

    /**
     * Get recursively all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (nodeIdList: string[], depthLimit: number): Promise<NodeTreeResultType[]> => {
        console.log("LionWebQueries.getNodeTree for " + nodeIdList)
        if (nodeIdList.length === 0) {
            return []
        }
        // TODO Currently only gives the node id's, should give full node.
        const result = await db.query(queryNodeTreeForIdList(nodeIdList, depthLimit))
        // console.log("getNodeTree RESULT is " + JSON.stringify(result))
        return result
    }

    /**
     * TODO: Not tested yet
     */
    getAllDbNodes = async (): Promise<LionWebJsonNode[]> => {
        console.log("LionWebQueries.getAllDbNodes")
        const queryResult = (await db.query("SELECT id FROM lionweb_nodes")) as string[]
        return this.getNodesFromIdList(queryResult)
    }

    getNodesFromIdList = async (nodeIdList: string[]): Promise<LionWebJsonNode[]> => {
        console.log("LionWebQueries.getNodesFromIdList: " + nodeIdList)
        // this is necessary as otherwise the query would crash as it is not intended to be run
        // on an empty set
        if (nodeIdList.length == 0) {
            return []
        }
        const nodes = await db.query(QueryNodeForIdList(nodeIdList))
        return nodes
    }

    /**
     * Get all partitions: this returns all nodes that have parent set to null or undefined
     */
    getPartitions = async (): Promise<LionWebJsonChunk> => {
        console.log("LionWebQueries.getPartitions")
        // TODO Optimization?: The following WHERE can also directly be includes in the getNodesFromIdList
        const result = (await db.query("SELECT id FROM lionweb_nodes WHERE parent is null")) as { id: string }[]
        console.log("LionWebQueries.getPartitions.Result: " + JSON.stringify(result))
        const nodes = await this.getNodesFromIdList(result.map(n => n.id))
        return {
            serializationFormatVersion: "2023.1",
            languages: collectUsedLanguages(nodes),
            nodes: nodes
        }
    }

    // TODO This function is way too complex, should be simplified.
    /**
     * Store all nodes in the `nodes` collection in the nodes table.
     *
     * @param toBeStoredNodes
     */
    store = async (toBeStoredChunk: LionWebJsonChunk) => {
        if (toBeStoredChunk === null || toBeStoredChunk === undefined) {
            return ["null chunk not stored"]
        }
        const toBeStoredChunkWrapper = new LionWebJsonChunkWrapper(toBeStoredChunk)
        const tbsNodeIds = toBeStoredChunk.nodes.map(node => node.id)
        const tbsContainedChildIds = this.getContainedIds(toBeStoredChunk.nodes)
        const tbsNodeAndChildIds = [...tbsNodeIds, ...tbsContainedChildIds.filter(cid => !tbsNodeIds.includes(cid))]
        // Retrieve nodes for all id's that exist
        const databaseChunk = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(tbsNodeAndChildIds, "", 0)
        const databaseChunkWrapper = new LionWebJsonChunkWrapper(databaseChunk)

        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(databaseChunk, toBeStoredChunk)
        console.log("STORE.CHANGES ")
        console.log(diff.diffResult.changes.map(ch => "    " + ch.changeMsg()))

        const toBeStoredNewNodes = diff.diffResult.changes.filter((ch): ch is NodeAdded => ch.changeType === "NodeAdded")
        const addedChildren: ChildAdded[] = diff.diffResult.changes.filter((ch): ch is ChildAdded => ch instanceof ChildAdded)
        const removedChildren = diff.diffResult.changes.filter((ch): ch is ChildRemoved => ch.changeType === "ChildRemoved")
        const parentChanged = diff.diffResult.changes.filter((ch): ch is ParentChanged => ch.changeType === "ParentChanged")
        const propertyChanged = diff.diffResult.changes.filter((ch): ch is PropertyValueChanged => ch.changeType === "PropertyValueChanged")
        const targetsChanged = diff.diffResult.changes.filter((ch): ch is ReferenceChange => ch instanceof ReferenceChange)
        const addedAnnotations = diff.diffResult.changes.filter((ch): ch is AnnotationAdded => ch instanceof AnnotationAdded)
        const removedAnnotations = diff.diffResult.changes.filter((ch): ch is AnnotationRemoved => ch instanceof AnnotationRemoved)

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
        // Orpjaned annotations
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
        const orphansContainedChildrenOrphans = orphansContainedChildren.filter(contained => {
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
        const implicitlyRemovedChildNodes = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(
            addedAndNotRemovedChildren.map(ch => ch.childId),
            "",
            0
        )
        const parentsOfImplicitlyRemovedChildNodes = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(
            implicitlyRemovedChildNodes.nodes.map(node => node.parent),
            "",
            0
        )
        // Now all changes are turned into queries.
        let queries = ""
        queries += DB.upsertQueriesForPropertyChanges(propertyChanged)
        queries += DB.upsertAddedChildrenQuery(addedChildren, toBeStoredChunkWrapper)
        queries += DB.updateQueriesForRemovedChildren(removedChildren, toBeStoredChunkWrapper)
        queries += this.makeQueriesForParentChanged(parentChanged)
        queries += this.updateQueriesForImplicitlyRemovedChildNodes(implicitlyRemovedChildNodes, parentsOfImplicitlyRemovedChildNodes)
        queries += this.makeQueriesForImplicitParentChanged(addedAndNotParentChangedChildren)
        // queries += this.makeQueriesForOrphans(removedAndNotAddedChildren.map(ra => ra.childId))
        queries += DB.makeQueriesForOrphans(orphansContainedChildrenOrphans.map(oc => oc.id))
        queries += DB.makeQueriesForOrphans(removedAndNotAddedAnnotations.map(oc => oc.annotationId))
        queries += DB.upsertQueriesForReferenceChanges(targetsChanged)
        queries += this.makeQueriesForAnnotationsChanged([...addedAnnotations, ...removedAnnotations])
        // And run them on the database
        if (queries !== "") {
            console.log("QUERIES " + queries)
            await db.query(queries)
        }
        await DB.dbInsertNodeArray(toBeStoredNewNodes.map(ch => (ch as NodeAdded).node))
        return [queries]
    }

    targetsAsPostgresArray(targets: LionWebJsonReferenceTarget[]): string {
        let result = "ARRAY["
        result += targets.map(target => "'" + JSON.stringify(target) + "'::jsonb").join(", ")
        return result + "]"
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
            queries += `-- Implicitly removed children
                UPDATE lionweb_containments c 
                    SET children = '${postgresArrayFromStringArray(newChildren)}'
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
        let queries = ""
        parentChanged.forEach(parentChanged => {
            queries += DB.updateParentQuery(parentChanged.node.id, parentChanged.afterParentId)
        })
        return queries
    }

    private makeQueriesForImplicitParentChanged(addedAndNotParentChangedChildren: ChildAdded[]) {
        let queries = ""
        addedAndNotParentChangedChildren.forEach(added => {
            queries += DB.updateParentQuery(added.childId, added.parentNode.id)
        })
        return queries
    }

    private makeQueriesForAnnotationsChanged(annotationChanges: AnnotationChange[]) {
        let queries = ""
        annotationChanges
            .filter((ch): ch is AnnotationRemoved => ch instanceof AnnotationRemoved)
            .forEach(annotationChange => {
                queries += DB.updateAnnotationsQuery(annotationChange.nodeBefore.id, annotationChange.nodeAfter.annotations)
            })
        annotationChanges
            .filter((ch): ch is AnnotationAdded => ch instanceof AnnotationAdded)
            .forEach(annotationChange => {
                queries += DB.updateAnnotationsQuery(annotationChange.nodeBefore.id, annotationChange.nodeAfter.annotations)
            })
        return queries
    }

    /**
     * Recursively get all contained child ids.
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

export const LIONWEB_QUERIES = new LionWebQueries()
