// const pgp = require("pg-promise")();
import pgPromise from "pg-promise"

const pgp = pgPromise()
import {
    JsonContext,
    LionWebJsonContainment,
    LionWebJsonChunk,
    LionWebJsonNode,
    LionWebJsonChunkWrapper,
    NodeUtils,
    PropertyValueChanged,
    TargetAdded,
    ReferenceChange
} from "@lionweb/validation"

import { NodeAdded, ChildAdded, ChildRemoved, LionWebJsonDiff, ParentChanged } from "@lionweb/validation"
import { db } from "./DbConnection.js"
import { LIONWEB_BULKAPI_WORKER } from "./LionWebBulkApiWorker.js"
import { queryNodeTreeForIdList, QueryNodeForIdList, postgresArrayFromStringArray } from "./QueryNode.js"
import { collectUsedLanguages } from "./UsedLanguages.js"

const NODES_TABLE: string = "lionweb_nodes"
const CONTAINMENTS_TABLE: string = "lionweb_containments"
const REFERENCES_TABLE: string = "lionweb_references"
const PROPERTIES_TABLE: string = "lionweb_properties"

// table definition for use with pg-promise helpers
const nodesColumnSet = new pgp.helpers.ColumnSet(["id", "classifier_language", "classifier_version", "classifier_key", "parent"], {
    table: NODES_TABLE
})

// table definition for use with pg-promise helpers
const containmentsColumnSet = new pgp.helpers.ColumnSet(["containment", "children", "node_id"], { table: CONTAINMENTS_TABLE })

// table definition for use with pg-promise helpers
const PROPERTIES_COLUMNSET = new pgp.helpers.ColumnSet(["property", "value", "node_id"], { table: PROPERTIES_TABLE })

// table definition for use with pg-promise helpers
const REFERENCES_COLUMNSET = new pgp.helpers.ColumnSet(["lw_reference", "targets", "node_id"], { table: REFERENCES_TABLE })

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
        // TODO Currently only gives the node id's, should give full node.
        const result = await db.query(queryNodeTreeForIdList(nodeIdList, depthLimit))
        console.log("getNodeTree RESULT is " + JSON.stringify(result))
        return result
    }

    /**
     * TODO: Not tested yet
     */
    getAllDbNodes = async (): Promise<LionWebJsonNode[]> => {
        console.log("LionWebQueries.getNodes")
        const queryResult = (await db.query("SELECT id FROM lionweb_nodes")) as string[]
        return this.getNodesFromIdList(queryResult)
    }

    getNodesFromIdList = async (nodeIdList: string[]): Promise<LionWebJsonNode[]> => {
        const nodes = await db.query(QueryNodeForIdList(nodeIdList))
        // console.log("LionWebQueries.getNodesFromIdList " + JSON.stringify(nodes, null, 2))
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
        const toBeStoredChunkWrapper = new LionWebJsonChunkWrapper(toBeStoredChunk)
        const tbsNodeIds = toBeStoredChunk.nodes.map(node => node.id)
        const tbsContainedChildIds = this.getContainedIds(toBeStoredChunk.nodes)
        // TODO do the same for annotations
        const tbsNodeAndChildIds = [...tbsNodeIds, ...tbsContainedChildIds.filter(cid => !tbsNodeIds.includes(cid))]
        // Retrieve nodes for all id's that exist
        const databaseChunk = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(tbsNodeAndChildIds, "", 0)
        const databaseChunkWrapper = new LionWebJsonChunkWrapper(databaseChunk)

        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(databaseChunk, toBeStoredChunk)
        console.log("STORE.CHANGES ")
        console.log(diff.diffResult.changes.map(ch => "    " + ch.changeMsg()))

        const toBeStoredNewNodes = diff.diffResult.changes.filter((ch): ch is NodeAdded => ch.id === "NodeAdded")
        const addedChildren: ChildAdded[] = diff.diffResult.changes.filter((ch): ch is ChildAdded => ch instanceof ChildAdded)
        const removedChildren = diff.diffResult.changes.filter((ch): ch is ChildRemoved => ch.id === "ChildRemoved")
        const parentChanged = diff.diffResult.changes.filter((ch): ch is ParentChanged => ch.id === "ParentChanged")
        const propertyChanged = diff.diffResult.changes.filter((ch): ch is PropertyValueChanged => ch.id === "PropertyValueChanged")
        const targetChanged = diff.diffResult.changes.filter((ch): ch is ReferenceChange => ch instanceof ReferenceChange)

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
        // Now add all children of the orphans to the removed children
        // TODO recursively
        // const implicitRemovedFromOrphan = this.removedChildrenFromRemovedNodes(
        //     removedAndNotAddedChildren.map(ch => ch.parentNode),
        //     toBeStoredChunkWrapper,
        //     databaseNodesWrapper,
        // )
        // removedAndNotAddedChildren.push(
        //     ...implicitRemovedFromOrphan.filter(removed => {
        //         return addedChildren.find(added => added.childId === removed.childId) === undefined
        //     }),
        // )

        // remove child: from old parent
        const addedAndNotRemovedChildren = addedChildren.filter(added => {
            return removedChildren.find(removed => removed.childId === added.childId) === undefined
        })
        // Child node itself needs updating its parent
        const addedAndNotParentChangedChildren = addedChildren.filter(added => {
            return parentChanged.find(parentChange => parentChange.node.id === added.childId) === undefined
        })
        // Orphan if not added, otherwise parent of child needs upodating
        // const removedAndNotParentChangedChildren = removedChildren.filter(removed => {
        //     return parentChanged.find(parent => parent.node.id === removed.childId) === undefined
        // })

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
        queries += this.makeQueriesForPropertyChanges(propertyChanged)
        queries += this.makeAddedChildrenQueries(addedChildren, toBeStoredChunkWrapper)
        queries += this.makeQueriesForRemovedChildren(removedChildren, toBeStoredChunkWrapper)
        queries += this.makeQueriesForParentChanged(parentChanged)
        queries += this.makeQueriesForImplicitlyRemovedChildNodes(implicitlyRemovedChildNodes, parentsOfImplicitlyRemovedChildNodes)
        queries += this.makeQueriesForImplicitParentChanged(addedAndNotParentChangedChildren)
        queries += this.makeQueriesForOrphans(removedAndNotAddedChildren)
        // And run them on the database
        if (queries !== "") {
            console.log("QUERIES ")
            await db.query(queries)
        }
        await this.dbInsertNodeArray(toBeStoredNewNodes.map(ch => (ch as NodeAdded).node))
        return [queries]
    }

    private makeQueriesForOrphans(removed: ChildRemoved[]) {
        let queries = ""
        removed.forEach(remove => {
            queries += `-- Implicit Orphan of parent of children that have been model
                DELETE FROM lionweb_nodes n
                WHERE
                    n.id = '${remove.childId}';
                `
        })
        return queries
    }
    private makeQueriesForPropertyChanges(propertyChanged: PropertyValueChanged[]) {
        let queries = ""
        propertyChanged.forEach(propertyChange => {
            queries += `-- Implicit Update of parent of children that have been model
                UPDATE lionweb_properties p 
                    SET value = '${propertyChange.newValue}'
                WHERE
                    p.node_id = '${propertyChange.nodeId}';
                `
        })
        return queries
    }

    private makeQueriesForImplicitlyRemovedChildNodes(
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
            queries += this.updateParentQuery(parentChanged.node.id, parentChanged.afterParentId)
        })
        return queries
    }

    private makeQueriesForImplicitParentChanged(addedAndNotParentChangedChildren: ChildAdded[]) {
        let queries = ""
        addedAndNotParentChangedChildren.forEach(added => {
            queries += this.updateParentQuery(added.childId, added.parentNode.id)
        })
        return queries
    }

    private updateParentQuery(nodeId: string, parent: string): string {
        return `-- Update of parent of children that have been moved
                UPDATE lionweb_nodes n 
                    SET parent = '${parent}'
                WHERE
                    n.id = '${nodeId}';
                `
    }

    private makeQueriesForRemovedChildren(removedChildren: ChildRemoved[], toBeStoredChunkWrapper: LionWebJsonChunkWrapper) {
        let queries = ""
        removedChildren.forEach(removed => {
            const afterNode = toBeStoredChunkWrapper.getNode(removed.parentNode.id)
            const afterContainment = afterNode.containments.find(cont => cont.containment.key === removed.containmentKey)
            queries += `-- Update node that has children removed.
                UPDATE lionweb_containments c 
                    SET children = '${postgresArrayFromStringArray(afterContainment.children)}'
                WHERE
                    c.node_id = '${afterNode.id}' AND
                    c.containment->>'key' = '${afterContainment.containment.key}' AND 
                    c.containment->>'version' = '${afterContainment.containment.version}'  AND
                    c.containment->>'language' = '${afterContainment.containment.language}' ;
                    
                `
        })
        return queries
    }

    private makeAddedChildrenQueries(addedChildren: ChildAdded[], toBeStoredChunkWrapper: LionWebJsonChunkWrapper) {
        let queries = ""
        addedChildren.forEach(added => {
            const afterNode = toBeStoredChunkWrapper.getNode(added.parentNode.id)
            if (afterNode === undefined) {
                console.error("Undefined node for id " + added.parentNode.id)
            }
            const afterContainment = afterNode.containments.find(cont => cont.containment.key === added.containmentKey)
            queries += `-- Update nodes that have children added
                UPDATE lionweb_containments c 
                    SET children = '${postgresArrayFromStringArray(afterContainment.children)}'
                WHERE
                    c.node_id = '${afterNode.id}' AND
                    c.containment->>'key' = '${afterContainment.containment.key}' AND 
                    c.containment->>'version' = '${afterContainment.containment.version}'  AND
                    c.containment->>'language' = '${afterContainment.containment.language}' ;
                `
        })
        return queries
    }

    /**
     * Recursively get all contained child ids.
     * @param nodes
     * @private
     */
    private getContainedIds(nodes: LionWebJsonNode[]) {
        return nodes.flatMap(node =>
            node.containments.flatMap(c => {
                return c.children
            })
        )
    }

    /**
     * This is a new node, so each child is an AddedChild change.
     * @param node
     */
    removedChildrenFromRemovedNodes(
        nodes: LionWebJsonNode[],
        tbsNodesWrapper: LionWebJsonChunkWrapper,
        databaseNodesWrapper: LionWebJsonChunkWrapper
    ): ChildRemoved[] {
        const result: ChildRemoved[] = []
        nodes.forEach((node: LionWebJsonNode, index: number) => {
            node.containments.forEach((containment: LionWebJsonContainment, index: number) => {
                const key = containment.containment.key
                for (const childId of containment.children) {
                    // const newchildNode = tbsNodesWrapper.getNode(childId)
                    result.push(
                        new ChildRemoved(new JsonContext(null, ["containments", index]), node, containment.containment.key, childId)
                    )
                    const childNode = databaseNodesWrapper.getNode(childId)
                    if (childNode !== undefined) {
                        result.push(...this.removedChildrenFromRemovedNodes([childNode], tbsNodesWrapper, databaseNodesWrapper))
                    }
                }
            })
        })
        console.log("removedChildrenFromRemovedNodes: " + result.map(r => `${r.childId} removed from ${r.parentNode.id}`))
        return result
    }

    /**
     * Insert _tbsNodesToCreate in the lionweb_nodes table
     * These nodes are all new nodes.
     * @param tbsNodesToCreate
     */
    private async dbInsertNodeArray(tbsNodesToCreate: LionWebJsonNode[]) {
        {
            if (tbsNodesToCreate.length === 0) {
                return
            }
            const node_rows = tbsNodesToCreate.map(node => {
                return {
                    id: node.id,
                    classifier_language: node.classifier.language,
                    classifier_version: node.classifier.version,
                    classifier_key: node.classifier.key,
                    parent: node.parent
                }
            })
            const insert = pgp.helpers.insert(node_rows, nodesColumnSet)
            const dbResult = await db.query(insert)

            // INSERT Containments
            const insertRowData = tbsNodesToCreate.flatMap(node =>
                node.containments.map(c => ({ node_id: node.id, containment: c.containment, children: c.children }))
            )
            const insertContainments = pgp.helpers.insert(insertRowData, containmentsColumnSet)
            await db.query(insertContainments)

            // INSERT Properties
            const insertProperties = tbsNodesToCreate.flatMap(node =>
                node.properties.map(prop => ({ node_id: node.id, property: prop.property, value: prop.value }))
            )
            if (insertProperties.length !== 0) {
                const insertQuery = pgp.helpers.insert(insertProperties, PROPERTIES_COLUMNSET)
                await db.query(insertQuery)
            }

            // INSERT REFERENCES
            const insertReferences = tbsNodesToCreate.flatMap(node =>
                node.references.map(reference => ({ node_id: node.id, lw_reference: reference.reference, targets: reference.targets }))
            )
            if (insertReferences.length !== 0) {
                const insertReferencesQuery = pgp.helpers.insert(insertReferences, REFERENCES_COLUMNSET)
                await db.query(insertReferencesQuery)
            }
        }
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
