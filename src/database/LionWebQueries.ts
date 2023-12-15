// const pgp = require("pg-promise")();
import pgPromise from "pg-promise"

const pgp = pgPromise()
import { JsonContext, LionWebJsonChild as LionWebJsonContainment, LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation"

import { findContainmentContainingChild, LionWebJsonNodesWrapper } from "../lionweb/LionWebJsonNodesWrapper.js"
import { NodeAdded } from "../test/diff/ChunkChange.js"
import { ChildAdded, ChildRemoved, ParentChanged } from "../test/diff/ContainmentChange.js"
import { LionWebJsonDiff } from "../test/diff/LionWebJsonDiff.js"
import { db } from "./DbConnection.js"
import { LIONWEB_BULKAPI_WORKER } from "./LionWebBulkApiWorker.js"
import { queryNodeTreeForIdList, QueryNodeForIdList, postgresArrayFromStringArray } from "./QueryNode.js"
import { collectUsedLanguages } from "./UsedLanguages.js"

const NODES_TABLE: string = "lionweb_nodes"
const CONTAINMENTS_TABLE: string = "lionweb_containments"
const REFERENCES_TABLE: string = "lionweb_references"
const PROPERTIES_TABLE: string = "lionweb_properties"

// table definition for use with pg-promise helpers
const nodesColumnSet = new pgp.helpers.ColumnSet(["id", "classifier_language", "classifier_version", "classifier_key", "parent"], { table: NODES_TABLE })

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

export type ChildChange = {
    childId: string
    addedTo:
        | {
              parent: LionWebJsonNode
              containment: LionWebJsonContainment
          }
        | undefined
    removedFrom:
        | {
              parent: LionWebJsonNode
              containment: LionWebJsonContainment
          }
        | undefined
}

function toStringChange(ch: ChildChange): string {
    return `child ${ch.childId} ${ch.removedFrom === undefined ? "" : `removed from ${ch.removedFrom.parent.id}`}  ${
        ch.addedTo === undefined ? "" : `added to ${ch.addedTo.parent.id}`
    }`
}

/**
 * Simgle database functions.
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
        const nodes = await this.getNodesFromIdList(result.map((n) => n.id))
        return {
            serializationFormatVersion: "2023.1",
            languages: collectUsedLanguages(nodes),
            nodes: nodes,
        }
    }

    // TODO This function is way too complex, should be simplified.
    /**
     * Store all nodes in the `nodes` collection in the nodes table.
     *
     * @param toBeStoredNodes
     */
    store = async (toBeStoredChunk: LionWebJsonChunk) => {
        const toBeStoredNodes = toBeStoredChunk.nodes
        const toBeStoredNodesWrapper = new LionWebJsonNodesWrapper(toBeStoredNodes)
        const tbsNodeIds = toBeStoredNodes.map((node) => node.id)
        console.log("STORE.CHUNK IDS " + tbsNodeIds.join(", "))
        const tbsContainedChildIds = this.getContainedIds(toBeStoredNodes)
        console.log("STORE.ALL CHILDREN " + tbsContainedChildIds)
        // TODO do the same for annotations
        const tbsNodeAndChildIds = [...tbsNodeIds, ...tbsContainedChildIds.filter((cid) => !tbsNodeIds.includes(cid))]
        // Retrieve nodes for all id's that exist
        const databaseChunk = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(tbsNodeAndChildIds, "", 0)
        const databaseNodesWrapper = new LionWebJsonNodesWrapper(databaseChunk.nodes)
        console.log("STORE.EXISTING DATABASE IDS = " + databaseChunk.nodes.map((e) => e.id))

        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(databaseChunk, toBeStoredChunk)
        console.log("STORE.CHANGES ")
        console.log(diff.errors)

        const toBeStoredNewNodes = diff.diffResult.changes.filter((change): change is NodeAdded => change.id === "NodeAdded")
        const addedChildren: ChildAdded[] = diff.diffResult.changes.filter((ch): ch is ChildAdded => ch instanceof ChildAdded)
        const removedChildren = diff.diffResult.changes.filter((change): change is ChildRemoved => change.id === "ChildRemoved")
        const parentChanged = diff.diffResult.changes.filter((change): change is ParentChanged => change.id === "ParentChanged")

        // Only children that already exist in the database
        const databaseChildrenOfNewNodes = this.getContainedIds(toBeStoredNewNodes.map((ch) => ch.node))
            .filter((id) => databaseNodesWrapper.getNode(id) !== undefined)
            .map((id) => databaseNodesWrapper.getNode(id))

        console.log("newNodes          : " + toBeStoredNewNodes.map((ch) => ch.node.id))
        console.log("childrenOfNewNodesInDatabase: " + databaseChildrenOfNewNodes.map((node) => node.id))
        console.log("addedChildren     : " + addedChildren.map((ch) => ch.childId + " to parent " + ch.parentNode.id).join(", "))
        console.log("removedChildren   : " + removedChildren.map((ch) => ch.childId + " from parent " + ch.parentNode.id).join(", "))
        console.log("parentChanged     : " + parentChanged.map((ch) => `Node ${ch.node.id} parent ${ch.beforeParentId} => ${ch.afterParentId}`).join(", "))

        // Orphans
        const removedAndNotAddedChildren = removedChildren.filter((removed) => {
            return (
                addedChildren.find((added) => added.childId === removed.childId) === undefined &&
                databaseChildrenOfNewNodes.find((child) => child.id === removed.childId) === undefined
            )
        })
        // Now add all children of the orphans to the removed children
        // TODO recursively
        const implicitRemovedFromOrphan = this.removedChildrenFromRemovedNodes(
            removedAndNotAddedChildren.map((ch) => ch.parentNode),
            toBeStoredNodesWrapper,
            databaseNodesWrapper,
        )
        removedAndNotAddedChildren.push(
            ...implicitRemovedFromOrphan.filter((removed) => {
                return addedChildren.find((added) => added.childId === removed.childId) === undefined
            }),
        )

        // remove child: from old parent
        const addedAndNotRemovedChildren = addedChildren.filter((added) => {
            return removedChildren.find((removed) => removed.childId === added.childId) === undefined
        })
        // Child node itself needs updating its parent
        const addedAndNotParentChangedChildren = addedChildren.filter((added) => {
            return parentChanged.find((parentChange) => parentChange.node.id === added.childId) === undefined
        })
        // Orphan if not added, otherwise parent of child needs upodating
        const removedAndNotParentChangedChildren = removedChildren.filter((removed) => {
            return parentChanged.find((parent) => parent.node.id === removed.childId) === undefined
        })

        console.log("DATABASE CHANGES")
        const result: string[] = [
            `Implicit removed child: ${addedAndNotRemovedChildren.map((added) => `Added ${added.childId} to ${added.parentNode.id}`)}`,
            `Implicit parent change: ${addedAndNotParentChangedChildren.map((added) => `Added ${added.childId} to ${added.parentNode.id}`)}`,
            `Orphaned              : ${removedAndNotAddedChildren.map((removed) => `Removed ${removed.childId} from ${removed.parentNode.id}`)}`,
            // `removedAndNotParentChangedChildren: ${removedAndNotParentChangedChildren.map(removed => `Removed ${removed.childId} from ${removed.parentNode.id}`)}`
        ]
        console.log(result)
        // implicit child remove, find all parents
        const implicitlyRemovedChildNodes = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(
            addedAndNotRemovedChildren.map((ch) => ch.childId),
            "",
            0,
        )
        const theirParents = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(
            implicitlyRemovedChildNodes.nodes.map((node) => node.parent),
            "",
            0,
        )
        // Now all implicit changes are turned into queries.
        let implicitQueries = "";
        implicitlyRemovedChildNodes.nodes.forEach( child => {
            const previousParentNode = theirParents.nodes.find(p => p.id = child.parent) 
            const changedContainment = findContainmentContainingChild(previousParentNode.containments, child.id)
            const index = changedContainment.children.indexOf(child.id)
            const newChildren = [...changedContainment.children]
            newChildren.splice(index, 1)
            implicitQueries += 
                `-- Implicitly removed children
                UPDATE lionweb_containments c 
                    SET children = '${postgresArrayFromStringArray(newChildren)}'
                WHERE
                    c.node_id = '${previousParentNode.id}' AND
                    c.containment->>'key' = '${changedContainment.containment.key}' AND 
                    c.containment->>'version' = '${changedContainment.containment.version}'  AND
                    c.containment->>'language' = '${changedContainment.containment.language}' ;
                    
                `
        })
        addedChildren.forEach(added => {
            const afterNode = toBeStoredNodesWrapper.getNode(added.parentNode.id)
            const changedContainment = afterNode.containments.find(cont => cont.containment.key=== added.containmentKey);
            implicitQueries +=
                `-- Update nodes that have children added
                UPDATE lionweb_containments c 
                    SET children = '${postgresArrayFromStringArray(changedContainment.children)}'
                WHERE
                    c.node_id = '${afterNode.id}' AND
                    c.containment->>'key' = '${changedContainment.containment.key}' AND 
                    c.containment->>'version' = '${changedContainment.containment.version}'  AND
                    c.containment->>'language' = '${changedContainment.containment.language}' ;
                    
                `
        })
        removedChildren.forEach(removed => {
            const afterNode = toBeStoredNodesWrapper.getNode(removed.parentNode.id)
            const changedContainment = afterNode.containments.find(cont => cont.containment.key=== removed.containmentKey);
            implicitQueries +=
                `-- Update node that has children removed.
                UPDATE lionweb_containments c 
                    SET children = '${postgresArrayFromStringArray(changedContainment.children)}'
                WHERE
                    c.node_id = '${afterNode.id}' AND
                    c.containment->>'key' = '${changedContainment.containment.key}' AND 
                    c.containment->>'version' = '${changedContainment.containment.version}'  AND
                    c.containment->>'language' = '${changedContainment.containment.language}' ;
                    
                `
        })
        parentChanged.forEach( added => {
            implicitQueries +=
                `-- Update parent of children that have been model
                UPDATE lionweb_nodes n 
                    SET parent = '${added.afterParentId}'
                WHERE
                    n.id = '${added.node.id}';
                    
                `
        })
        addedAndNotParentChangedChildren.forEach( added => {
            // const beforeNode = databaseNodesWrapper.getNode(added.childId)
            implicitQueries +=
                `-- Implicit Update of parent of children that have been model
                UPDATE lionweb_nodes n 
                    SET parent = '${added.parentNode.id}'
                WHERE
                    n.id = '${added.childId}';
                    
                `
        })
        console.log("AddedNoPCh: " + addedAndNotParentChangedChildren.length)
        result.push("IMPLICIT QUERY [[[\n" + implicitQueries + "\n]]]")
        if (implicitQueries !== "") {
            await db.query(implicitQueries)
        }

        await this.dbInsert(toBeStoredNewNodes.map((ch) => (ch as NodeAdded).node))
        return result
    }

    /**
     * Recursively get all contained child ids.
     * @param nodes
     * @private
     */
    private getContainedIds(nodes: LionWebJsonNode[]) {
        return nodes.flatMap((node) =>
            node.containments.flatMap((c) => {
                return c.children
            }),
        )
    }

    /**
     * This is a new node, so each child is an AddedChild change.
     * @param node
     */
    removedChildrenFromRemovedNodes(
        nodes: LionWebJsonNode[],
        tbsNodesWrapper: LionWebJsonNodesWrapper,
        databaseNodesWrapper: LionWebJsonNodesWrapper,
    ): ChildRemoved[] {
        const result: ChildRemoved[] = []
        nodes.forEach((node: LionWebJsonNode, index: number) => {
            node.containments.forEach((containment: LionWebJsonContainment, index: number) => {
                const key = containment.containment.key
                for (const childId of containment.children) {
                    // const newchildNode = tbsNodesWrapper.getNode(childId)
                    result.push(new ChildRemoved(new JsonContext(null, ["containments", index]), node, containment.containment.key, childId))
                    const childNode = databaseNodesWrapper.getNode(childId)
                    if (childNode !== undefined) {
                        result.push(...this.removedChildrenFromRemovedNodes([childNode], tbsNodesWrapper, databaseNodesWrapper))
                    }
                }
            })
        })
        console.log("removedChildrenFromRemovedNodes: " + result.map((r) => `${r.childId} removed from ${r.parentNode.id}`))
        return result
    }

    /**
     * Insert _tbsNodesToCreate in the lionweb_nodes table
     * These nodes are all new nodes.
     * @param tbsNodesToCreate
     */
    private async dbInsert(tbsNodesToCreate: LionWebJsonNode[]) {
        {
            // console.log("dbInsert");
            if (tbsNodesToCreate.length === 0) {
                return
            }
            const node_rows = tbsNodesToCreate.map((node) => {
                return {
                    id: node.id,
                    classifier_language: node.classifier.language,
                    classifier_version: node.classifier.version,
                    classifier_key: node.classifier.key,
                    parent: node.parent,
                }
            })
            const insert = pgp.helpers.insert(node_rows, nodesColumnSet) // + " ON CONFLICT (id) DO NOTHING RETURNING *";
            // console.log("dbInsert.query is: " + insert)
            const dbResult = await db.query(insert)

            // INSERT Containments
            const insertRowData = tbsNodesToCreate.flatMap((node) =>
                node.containments.map((c) => ({ node_id: node.id, containment: c.containment, children: c.children })),
            )
            // console.log("Insert containments: " + JSON.stringify(insertRowData))

            const insertContainments = pgp.helpers.insert(insertRowData, containmentsColumnSet)
            await db.query(insertContainments)

            // INSERT Properties
            const insertProperties = tbsNodesToCreate.flatMap((node) =>
                node.properties.map((prop) => ({ node_id: node.id, property: prop.property, value: prop.value })),
            )
            // console.log("Insert properties: " + JSON.stringify(insertProperties))
            if (insertProperties.length !== 0) {
                const insertQuery = pgp.helpers.insert(insertProperties, PROPERTIES_COLUMNSET)
                await db.query(insertQuery)
            }

            // INSERT REFERENCES
            const insertReferences = tbsNodesToCreate.flatMap((node) =>
                node.references.map((reference) => ({ node_id: node.id, lw_reference: reference.reference, targets: reference.targets })),
            )
            // console.log("Insert references: " + JSON.stringify(insertReferences))
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
