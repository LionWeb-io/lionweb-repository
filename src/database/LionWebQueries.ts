// const pgp = require("pg-promise")();
import pgPromise from "pg-promise"

const pgp = pgPromise()
import { JsonContext, LionWebJsonChild as LionWebJsonContainment, LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation"

import { findContainmentContainingChild, LionWebJsonNodesWrapper } from "../lionweb/LionWebJsonNodesWrapper.js"
import { NodeAdded } from "../test/diff/ChunkChange.js";
import { ChildAdded, ChildRemoved, ParentChanged } from "../test/diff/ContainmentChange.js";
import { LionWebJsonDiff } from "../test/diff/LionWebJsonDiff.js"
import { db } from "./DbConnection.js"
import { LIONWEB_BULKAPI_WORKER } from "./LionWebBulkApiWorker.js"
import { queryNodeTreeForIdList, QueryNodeForIdList } from "./QueryNode.js"
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

    getSingleNode = async (node_id: string): Promise<LionWebJsonNode> => {
        // console.log("LionWebQueries.getNode " + node_id);
        const result = await db.query(QueryNodeForIdList([node_id]))
        // console.log("LionWebQueries.getNode " + JSON.stringify(result, null, 2))
        return result
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
    store = async (toBeStoredNodes: LionWebJsonNode[]) => {
        const tbsNodesWrapper = new LionWebJsonNodesWrapper(toBeStoredNodes)
        // Map nodes to correct structure for the table
        const tbsDatarows = toBeStoredNodes.map((n) => {
            return {
                id: n.id,
                classifier_language: n.classifier.language,
                classifier_version: n.classifier.version,
                classifier_key: n.classifier.key,
                parent: n.parent,
            }
        })
        const tbsNodeIds = tbsDatarows.map((row) => row.id)
        console.log("STORE.NEW IDS " + tbsNodeIds.join(", "))
        const containedIds = toBeStoredNodes.flatMap((node) =>
            node.containments.flatMap((c) => {
                console.log(`CHILDREN node ${node.id} containment ${c.containment.key}: ${c.children}`)
                return c.children
            }),
        )
        console.log("ALL CHILDREN " + containedIds)
        const allIds = [...tbsNodeIds, ...containedIds.filter((cid) => !tbsNodeIds.includes(cid))]
        // Find all id's that exist
        const databaseNodesToUpdate = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(allIds, "", 0)
        const databaseNodesToUpdateWrapper = new LionWebJsonNodesWrapper(databaseNodesToUpdate.nodes)
        const databaseNodesToUpdateNodeIds = databaseNodesToUpdate.nodes.map((e) => e.id)
        console.log("STORE.UPDATE IDS = " + JSON.stringify(databaseNodesToUpdateNodeIds))

        const childChanges: Map<string, ChildChange> = new Map<string, ChildChange>()
        // Logic to find diff between old eand new nodes (only ;looking at containment)
        // TODO do the same for annotations
        toBeStoredNodes.forEach((tbs) => {
            const existing: LionWebJsonNode | undefined = databaseNodesToUpdateWrapper.getNode(tbs.id)
            tbs.containments.forEach((cont) => {
                if (existing === undefined) {
                    console.log("STORE children of new node: " + cont.children)
                } else {
                    const unchangedChildren = cont.children.filter((child) => existing.containments.flatMap((cont) => cont.children).includes(child))
                    const addedChs = cont.children.filter((child) => !existing.containments.flatMap((cont) => cont.children).includes(child))
                    addedChs.forEach((addedChild) => {
                        let change: ChildChange | undefined = childChanges.get(addedChild)
                        if (change === undefined) {
                            change = {
                                childId: addedChild,
                                addedTo: undefined,
                                removedFrom: undefined,
                            }
                            childChanges.set(addedChild, change)
                            if (change.addedTo === undefined) {
                                change.addedTo = {
                                    parent: tbs,
                                    containment: cont,
                                }
                            } else {
                                console.error("Node is added more than once !!!")
                            }
                        }
                    })

                    // TODO need to find the correct containment in existing to find deleted ones
                    const existingCont = databaseNodesToUpdateWrapper.findContainment(existing, cont.containment)
                    const removedChs = existingCont?.children?.filter((child) => !cont.children.includes(child))
                    removedChs.forEach((removedChild) => {
                        let change: ChildChange = childChanges.get(removedChild)
                        if (change === undefined) {
                            childChanges.set(removedChild, {
                                childId: removedChild,
                                addedTo: undefined,
                                removedFrom: undefined,
                            })
                            change = childChanges.get(removedChild)
                            if (change.removedFrom === undefined) {
                                change.removedFrom = {
                                    parent: tbs,
                                    containment: cont,
                                }
                            } else {
                                console.error("Node is removed more than once !!!")
                            }
                        }
                    })
                }
            })
        })
        console.log("================================")
        // Map from child-id to parent-id
        const childrenToRetrieveAndSetParent: Map<string, string> = new Map<string, string>()
        const childrenToBecomeOrphans: string[] = []
        // Map from parent-id to child-id
        const parentsToRemoveChild: Map<string, string> = new Map<string, string>()
        // child ids that need to be removed from their current parent containment
        const childrenToBeRemovedFromParent: string[] = []
        for (const changed of childChanges.values()) {
            console.log("STORE.changed " + toStringChange(changed))
            if (changed.addedTo !== undefined) {
                if (changed.removedFrom !== undefined) {
                    console.log("+++++++++++ added & removed " + changed.childId)
                    // CASE Added + removed in toBeStored
                    // Parent containments Ok, as it is both added and removed, but still need to check whether the parent property of the child has changed
                    if (changed.addedTo.parent !== changed.removedFrom.parent) {
                        if (tbsNodesWrapper.getNode(changed.childId) !== undefined) {
                            // New child node (with presumably new parent is in the to be stored collection
                            // Do nothing
                        } else {
                            childrenToRetrieveAndSetParent.set(changed.childId, changed.addedTo.parent.id)
                        }
                    } else {
                        // parent has not changed, is ok. Do nothing
                    }
                } else {
                    console.log("+++++++++++ added & !removed " + changed.childId)
                    // CASE Added and **not** removed, so old parent is not in the tbs Nodes
                    // Update parent.containment (i.e. remove child from containment) && uoadet child.parent
                    const existingChildNode = databaseNodesToUpdateWrapper.getNode(changed.childId)
                    console.log("node is " + existingChildNode)
                    if (existingChildNode !== undefined) {
                        // If Chunk is correct, then  the next commented line isn't needed as the child will have the new parent
                        // childrenToRetrieveAndSetParent.set(changed.childId, changed.addedTo.parent.id);
                        if (existingChildNode.parent !== null) {
                            console.log(`Parent ${existingChildNode.parent} remove child ${changed.childId}`)
                            parentsToRemoveChild.set(existingChildNode.parent, changed.childId)
                        } else {
                            console.error("Parent should not be null !!!")
                        }
                    } else {
                        console.log("+++++++++++ No such child in db " + changed.childId)
                        console.log(`22 Parent ${existingChildNode} remove child ${changed.childId}`)
                        // childrenToRetrieveAndSetParent.set(changed.childId, changed.addedTo.parent.id);
                        // childrenToBeRemovedFromParent.push(changed.childId);
                    }
                }
            } else {
                if (changed.removedFrom !== undefined) {
                    console.log("+++++++++++ !added & removed " + changed.childId)

                    // CASE Removed and not added
                    childrenToBecomeOrphans.push(changed.childId)
                } else {
                    console.log("+++++++++++ !added & !removed " + changed.childId)
                    // CASE Not added, nor removed: cannot happen
                    console.error("Not added and not removed child with id " + changed.childId)
                }
            }
        }

        console.log("STORE.orphans: " + childrenToBecomeOrphans)
        console.log("STORE.childrenToRetrieveAndSetParent: " + printMap(childrenToRetrieveAndSetParent))
        console.log("STORE.parentsToRemoveChild: " + printMap(parentsToRemoveChild))
        console.log("STORE.childrenToBeRemovedFromParent: " + childrenToBeRemovedFromParent)

        // All rows that need to be inserted (i.e. they do not exist yet)
        const tbsNodesToCreate = toBeStoredNodes.filter((row) => !databaseNodesToUpdateNodeIds.includes(row.id))
        console.log("STORE.LionWebQueries: new NodesToInsert = " + JSON.stringify(tbsNodesToCreate.map((n) => n.id)))
        await this.dbInsert(tbsNodesToCreate)

        // TODO  Until the above line it seems to work => test it and test the rest
        const tbsNodesToUpdate = toBeStoredNodes.filter((row) => databaseNodesToUpdateNodeIds.includes(row.id))
        console.log("STORE.LionWebQueries: existing NodesToUpdate = " + JSON.stringify(tbsNodesToUpdate.map((n) => n.id)))

        const childrenToRetrieve = Array.from(childrenToRetrieveAndSetParent.keys())
        // const insert = `SELECT * FROM ${NODES_TABLE} WHERE id = ANY(${pgp.helpers.values(childrenToRetrieve)})`;
        console.log("STORE.LionWebQueries: childrenToTRetrieve: " + childrenToRetrieve)
        const databaseChildrenToSetParent = await db.query(
            `
SELECT containments.* FROM lionweb_nodes 
left join lionweb_containments containments on containments.node_id = lionweb_nodes.parent
WHERE lionweb_nodes.id IN ('example1-props_root_props_1', 'a') 
`,
        )
        console.log("STORE.NEW QUERY is " + JSON.stringify(databaseChildrenToSetParent))
        console.log("STORE.CONTAINMENT  is " + JSON.stringify(findContainmentContainingChild(databaseChildrenToSetParent, "example1-props_root_props_1")))

        databaseChildrenToSetParent
        // All rows to be updated (row with given id already exists)
        // const existingNodesToUpdate = datarows.filter(row => existing.includes(row));
        // console.log("LionWebQueries.existingNodesToUpdate = " + JSON.stringify(existingNodesToUpdate));
        // if (existingNodesToUpdate.length !== 0) {
        //     let update = await pgp.helpers.update(existingNodesToUpdate, nodesColumnSet) + " WHERE v.id = t.id" ;
        //     console.log("LionWebQueries.UPDATE " + update)
        //     // Hack no longer needed: update = update.replace('v."node"', 'v."node"::jsonb')
        //     const dbResult = await db.query(update);
        // }
        // return null;
    }

    storeD = async (toBeStoredChunk: LionWebJsonChunk) => {
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
        // addedChildren.push(...this.addedChildrenInNewNodes(newNodes.map(ch => ch.node )))
        const removedChildren = diff.diffResult.changes.filter((change): change is ChildRemoved => change.id === "ChildRemoved")
        const parentChanged = diff.diffResult.changes.filter((change): change is ParentChanged => change.id === "ParentChanged")

        // Only children that already exist in the database
        const databaseChildrenOfNewNodes = this.getContainedIds(toBeStoredNewNodes.map(ch => ch.node))
            .filter(id => databaseNodesWrapper.getNode(id) !== undefined)
            .map(id => databaseNodesWrapper.getNode(id));

        console.log("newNodes          : " + toBeStoredNewNodes.map(ch => ch.node.id))
        console.log("childrenOfNewNodesInDatabase: " + databaseChildrenOfNewNodes.map(node => node.id))
        console.log("addedChildren     : " + addedChildren.map(ch => ch.childId + " to parent " + ch.parentNode.id).join(", "))
        console.log("removedChildren   : " + removedChildren.map(ch => ch.childId+ " from parent " + ch.parentNode.id).join(", "))
        console.log("parentChanged     : " + parentChanged.map(ch => `Node ${ch.node.id} parent ${ch.beforeParentId} => ${ch.afterParentId}`).join(", "))

        // Orphans
        const removedAndNotAddedChildren = removedChildren.filter(removed => {
            return addedChildren.find(added => added.childId === removed.childId) === undefined  &&
                    databaseChildrenOfNewNodes.find(child => child.id === removed.childId) === undefined
        })
        // Now add all children of the orphans to the removed children
        // TODO recursively
        const implicitRemovedFromOrphan = this.removedChildrenFromRemovedNodes(removedAndNotAddedChildren.map(ch => ch.parentNode ), toBeStoredNodesWrapper, databaseNodesWrapper)
        removedAndNotAddedChildren.push(...implicitRemovedFromOrphan.filter(removed => {
            return addedChildren.find(added => added.childId === removed.childId) === undefined
        }))

        // remove child: from old parent 
        const addedAndNotRemovedChildren = addedChildren.filter(added => {
            return removedChildren.find(removed => removed.childId === added.childId) === undefined
        })
        // Child node itself needs updating its parent
        const addedAndNotParentChangedChildren = addedChildren.filter(added => {
            return parentChanged.find(parent => parent.node.id === added.childId) === undefined
        })
        // Orphan if not added, otherwise parent of child needs upodating
        const removedAndNotParentChangedChildren = removedChildren.filter(removed => {
            return parentChanged.find(parent => parent.node.id === removed.childId) === undefined
        })
        
        console.log("DATABASE CHANGES")
        const result: string[] = [
            `Implicit remove       : ${addedAndNotRemovedChildren.map(added => `Added ${added.childId} to ${added.parentNode.id}`)}`,
            `Implicit parent change: ${addedAndNotParentChangedChildren.map(added => `Added ${added.childId} to ${added.parentNode.id}`)}`,
            `Orphaned              : ${removedAndNotAddedChildren.map(removed => `Removed ${removed.childId} from ${removed.parentNode.id}`)}`,
            `removedAndNotParentChangedChildren: ${removedAndNotParentChangedChildren.map(removed => `Removed ${removed.childId} from ${removed.parentNode.id}`)}`
        ]
        console.log(result)
        await this.dbInsert(toBeStoredNewNodes.map( ch => (ch as NodeAdded).node));
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
    addedChildrenInNewNodes(nodes: LionWebJsonNode[]): ChildAdded[] {
        const result = []
        nodes.forEach((node: LionWebJsonNode, index: number) => {
            node.containments.forEach((containment: LionWebJsonContainment, index: number) => {
                const key = containment.containment.key;
                for (const childId of containment.children) {
                    result.push(new ChildAdded(new JsonContext(null, ["containments", index]), node, containment.containment.key, childId))
                }
            })
        })
        return result;
    }
    /**
     * This is a new node, so each child is an AddedChild change.
     * @param node
     */
    removedChildrenFromRemovedNodes(nodes: LionWebJsonNode[], tbsNodesWrapper: LionWebJsonNodesWrapper, databaseNodesWrapper: LionWebJsonNodesWrapper): ChildRemoved[] {
        const result: ChildRemoved[] = []
        nodes.forEach((node: LionWebJsonNode, index: number) => {
            node.containments.forEach((containment: LionWebJsonContainment, index: number) => {
                const key = containment.containment.key;
                for (const childId of containment.children) {
                    // const newchildNode = tbsNodesWrapper.getNode(childId)
                    result.push(new ChildRemoved(new JsonContext(null, ["containments", index]), node, containment.containment.key, childId))
                    const childNode = databaseNodesWrapper.getNode(childId)
                    if (childNode !== undefined) {
                        result.push(...this.removedChildrenFromRemovedNodes([childNode], tbsNodesWrapper, databaseNodesWrapper));
                    }
                }
            })
        })
        console.log("removedChildrenFromRemovedNodes: " + result.map(r => `${r.childId} removed from ${r.parentNode.id}`))
        return result;
    }



    /**
     * Insert _tbsNodesToCreate in the lionweb_nodes table
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
