// const pgp = require("pg-promise")();
import pgPromise from "pg-promise";
const pgp = pgPromise();
import { LionWebJsonChild as LionWebJsonContainment, LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation";

import { findContainmentContainingChild, LionWebJsonNodesWrapper } from "../lionweb/LionWebJsonNodesWrapper.js";
import { db } from "./DbConnection.js";
import { LIONWEB_BULKAPI_WORKER } from "./LionWebBulkApiWorker.js";
import { queryNodeTreeForIdList, QueryNodeForIdList } from "./QueryNode.js";
import { collectUsedLanguages } from "./UsedLanguages.js";

const NODES_TABLE: string = "lionweb_nodes";
const CONTAINMENTS_TABLE: string = "lionweb_containments";
const REFERENCES_TABLE: string = "lionweb_references";
const PROPERTIES_TABLE: string = "lionweb_properties";

// table definition for use with pg-promise helpers
const nodesColumnSet = new pgp.helpers.ColumnSet([
    "id",
    "classifier_language",
    "classifier_version",
    "classifier_key",
    "parent"
], {table: NODES_TABLE});

// table definition for use with pg-promise helpers
const containmentsColumnSet = new pgp.helpers.ColumnSet([
    "containment",
    "children",
    "node_id"
], {table: CONTAINMENTS_TABLE});

// table definition for use with pg-promise helpers
const PROPERTIES_COLUMNSET = new pgp.helpers.ColumnSet([
    "property",
    "value",
    "node_id"
], {table: PROPERTIES_TABLE});

// table definition for use with pg-promise helpers
const REFERENCES_COLUMNSET = new pgp.helpers.ColumnSet([
    "lw_reference",
    "targets",
    "node_id"
], {table: REFERENCES_TABLE});

export type NodeTreeResultType = {
    id: string;
    parent: string;
    depth: number;
};

export type ChildChange = {
    childId: string;
    addedTo: {
        parent: LionWebJsonNode;
        containment: LionWebJsonContainment;
    } | undefined ;
    removedFrom: {
        parent: LionWebJsonNode;
        containment: LionWebJsonContainment;
    } | undefined
};

/**
 * Simgle database functions.
 */
class LionWebQueries {
    
    constructor() {
    }
    /**
     * Get recursively all children/annotations of _nodeIdList_ with depth _depthLimit_
     * @param nodeIdList
     * @param depthLimit
     */
    getNodeTree = async (nodeIdList: string[], depthLimit: number): Promise<NodeTreeResultType[]> => {
        console.log("LionWebQueries.getNodeTree for " + nodeIdList)
        // TODO Currently only gives the node id's, should give full node.
        const result = await db.query( queryNodeTreeForIdList(nodeIdList, depthLimit));
        console.log("getNodeTree RESULT is " + JSON.stringify(result))
        return result;
    }

    /**
     * TODO: Not tested yet
     */
    getAllDbNodes = async (): Promise<LionWebJsonNode[]> => {
        console.log("LionWebQueries.getNodes");
        const queryResult = await db.query("SELECT id FROM lionweb_nodes") as string[];
        return this.getNodesFromIdList(queryResult);
    };

    getSingleNode = async (node_id: string): Promise<LionWebJsonNode> => {
        console.log("LionWebQueries.getNode " + node_id);
        const result = await db.query(QueryNodeForIdList([node_id]));
        console.log("LionWebQueries.getNode " + JSON.stringify(result, null, 2))
        return result;
    };

    getNodesFromIdList = async (nodeIdList: string[]): Promise<LionWebJsonNode[]> => {
        const nodes = await db.query(QueryNodeForIdList(nodeIdList));
        console.log("LionWebQueries.getNodesFromIdList " + JSON.stringify(nodes, null, 2))
        return nodes;
    }
    
    /**
     * Get all partitions: this returns all nodes that have parent set to null or undefined
     */
    getPartitions = async (): Promise<LionWebJsonChunk> => {
        console.log("LionWebQueries.getPartitions");
        // TODO Optimization?: The following WHERE can also directly be includes in the getNodesFromIdList
        const result = (await db.query("SELECT id FROM lionweb_nodes WHERE parent is null")) as {id: string}[];
        console.log("LionWebQueries.getPartitions.Result: " + JSON.stringify(result));
        const nodes = await this.getNodesFromIdList(result.map(n => n.id));
        return {
            serializationFormatVersion: "2023.1",
            languages: collectUsedLanguages(nodes),
            nodes: nodes
        };
    };

    // TODO This function is way too complex, should be simplified.
    /**
     * Store all nodes in the `nodes` collection in the nodes table.
     * 
     * @param toBeStoredNodes
     */
    store = async (toBeStoredNodes: LionWebJsonNode[])=> {
        const tbsNodesWrapper = new LionWebJsonNodesWrapper(toBeStoredNodes);
        // Map nodes to correct structure for the table
        const tbsDatarows = toBeStoredNodes.map(n => {
            return {
                id: n.id,
                classifier_language: n.classifier.language,
                classifier_version: n.classifier.version,
                classifier_key: n.classifier.key,
                parent: n.parent
            };
        });
        const tbsNodeIds = tbsDatarows.map(row=> row.id);
        console.log("STORE.NEW IDS " + tbsNodeIds.join(", "));
        
        // Find all id's that exist
        const databaseNodesToUpdate = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(tbsNodeIds, "", 0);
        const databaseNodesToUpdateWrapper = new LionWebJsonNodesWrapper(databaseNodesToUpdate.nodes);
        const databaseNodesToUpdateNodeIds = databaseNodesToUpdate.nodes.map(e => e.id);
        console.log("STORE.UPDATE IDS = " + JSON.stringify(databaseNodesToUpdateNodeIds));
        
        const childChanges: Map<string, ChildChange> = new Map<string, ChildChange>();
        // Logic to find diff between old eand new nodes (only ;looking at containment)
        // TODO do the same for annotations
        toBeStoredNodes.forEach(tbs => {
            const existing: LionWebJsonNode | undefined = databaseNodesToUpdateWrapper.getNode(tbs.id);
            tbs.containments.forEach(cont => {
                if (existing === undefined) {
                    console.log("STORE children of new node: " + cont.children);
                } else {
                    const unchangedChildren = cont.children.filter(child => existing.containments.flatMap(cont => cont.children).includes(child))
                    const addedChs = cont.children.filter(child =>
                        !existing.containments.flatMap(cont => cont.children).includes(child));
                    addedChs.forEach(addedChild => {
                        let change: ChildChange | undefined = childChanges.get(addedChild);
                        if (change === undefined) {
                            change = {
                                childId: addedChild,
                                addedTo: undefined,
                                removedFrom: undefined
                            }
                            childChanges.set(addedChild, change)
                            if (change.addedTo === undefined) {
                                change.addedTo = {
                                    parent: tbs,
                                    containment: cont
                                };
                            } else {
                                console.error("Node is added more than once !!!")
                            }
                        }
                    });
                    
                    // TODO need to find the correct containment in existing to find deleted ones
                    const existingCont = databaseNodesToUpdateWrapper.findContainment(existing, cont.containment);
                    const removedChs =  existingCont?.children?.filter(child => !cont.children.includes(child));
                    removedChs.forEach(removedChild => {
                        let change: ChildChange = childChanges.get(removedChild);
                        if (change === undefined) {
                            childChanges.set(removedChild, {
                                childId: removedChild,
                                addedTo: undefined,
                                removedFrom: undefined
                            });
                            change = childChanges.get(removedChild);
                            if (change.removedFrom === undefined) {
                                change.removedFrom = {
                                    parent: tbs,
                                    containment: cont
                                };
                            } else {
                                console.error("Node is removed more than once !!!")
                            }
                        }
                    });
                }
            }) ;
        });
        console.log("================================");
        // Map from child-id to parent-id
        const childrenToRetrieveAndSetParent: Map<string, string> = new Map<string, string>();
        const childrenToBecomeOrphans: string[] = [];
        // Map from parent-id to child-id
        const parentsToRemoveChild: Map<string, string> = new Map<string, string>();
        // child ids that need to be removed from their current p[arent containment
        const childrenToBeRemovedFromParent: string[] = [];
        for (const changed of childChanges.values()) {
            console.log("STORE.changed " + changed.childId + " added " + changed.addedTo?.containment.containment.key +
                " removed " + changed.removedFrom?.containment.containment.key);
            if (changed.addedTo !== undefined) {
                if (changed.removedFrom !== undefined) {
                    // CASE Added + removed in toBeStored
                    // Parent containments Ok, as it is both added and removed, but still need to check whether the parent property of the child has changed
                    if (changed.addedTo.parent !== changed.removedFrom.parent) {
                        if (tbsNodesWrapper.getNode(changed.childId) !== undefined) {
                            // New child node (with presumably new parent is in the to be stored collection
                            // Do nothing
                        } else {
                            childrenToRetrieveAndSetParent.set(changed.childId, changed.addedTo.parent.id);
                        }
                    } else {
                        // parent has not changed, is ok. Do nothing
                    }
                } else {
                    // CASE Added and **not** removed, so old parent is not in the tbs Nodes
                    // Update parent.containment (i.e. remove child from containment) && uoadet child.parent
                    const node = databaseNodesToUpdateWrapper.getNode(changed.childId)
                    if (node !== undefined) {
                        // If Chunk is correct, then  the next commented line isn't needed as the child will have the new parent
                        // childrenToRetrieveAndSetParent.set(changed.childId, changed.addedTo.parent.id);
                        if (node.parent !== null) {
                            parentsToRemoveChild.set(node.parent, changed.childId);
                        } else {
                            console.error("Parent should not be null !!!");
                        }
                    } else {
                        childrenToRetrieveAndSetParent.set(changed.childId, changed.addedTo.parent.id);
                        childrenToBeRemovedFromParent.push(changed.childId);
                    }
                }
            } else {
                if (changed.removedFrom !== undefined) {
                    // CASE Removed and not added
                    childrenToBecomeOrphans.push(changed.childId)
                } else {
                    // CASE Not added, nor removed: cannot happen
                    console.error("Not added and not removed child with id " + changed.childId);
                }
            }
        }

        // All rows that need to be inserted (i.e. they do not exist yet)
        const tbsNodesToCreate = toBeStoredNodes.filter(row => !databaseNodesToUpdateNodeIds.includes(row.id));
        console.log("STORE.LionWebQueries: new NodesToInsert = " + JSON.stringify(tbsNodesToCreate.map(n => n.id)));
        await this.dbInsert(tbsNodesToCreate);

        // TODO  Until the above line it seems to work => test it and test the rest
        const tbsNodesToUpdate = toBeStoredNodes.filter(row => databaseNodesToUpdateNodeIds.includes(row.id));
        console.log("STORE.LionWebQueries: existing NodesToUpdate = " + JSON.stringify(tbsNodesToUpdate.map(n => n.id)));
        
        const childrenToRetrieve = Array.from(childrenToRetrieveAndSetParent.keys());
        // const insert = `SELECT * FROM ${NODES_TABLE} WHERE id = ANY(${pgp.helpers.values(childrenToRetrieve)})`;
        console.log("STORE.LionWebQueries: childrenToTRetrieve: " + childrenToRetrieve);
        const databaseChildrenToSetParent = await db.query(
            `
SELECT containments.* FROM lionweb_nodes 
left join lionweb_containments containments on containments.node_id = lionweb_nodes.parent
WHERE lionweb_nodes.id IN ('example1-props_root_props_1', 'a') 
`);
        console.log("STORE.NEW QUERY is " + JSON.stringify(databaseChildrenToSetParent));
        console.log("STORE.CONTAINMENT  is " + JSON.stringify(findContainmentContainingChild(databaseChildrenToSetParent, 'example1-props_root_props_1' )));
        
        
        
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

    /**
     * Insert _tbsNodesToCreate in the lionweb_nodes table
     * @param tbsNodesToCreate
     */
    private async dbInsert(tbsNodesToCreate: LionWebJsonNode[]) {
        {
            // console.log("dbInsert");
            if (tbsNodesToCreate.length === 0) {
                return;
            }
            const node_rows = tbsNodesToCreate.map(node => { return {
                id: node.id,
                classifier_language: node.classifier.language,
                classifier_version: node.classifier.version,
                classifier_key: node.classifier.key,
                parent: node.parent
            };});
            const insert = pgp.helpers.insert(node_rows, nodesColumnSet);// + " ON CONFLICT (id) DO NOTHING RETURNING *";
            console.log("dbInsert.query is: " + insert);
            const dbResult = await db.query(insert);

            // INSERT Containments
            const insertRowData = tbsNodesToCreate.flatMap(node =>
                node.containments.map(c =>
                    ({ node_id: node.id, containment: c.containment, children: c.children })
                )
            );
            console.log("Insert containments: " + JSON.stringify(insertRowData))

            const insertContainments = pgp.helpers.insert(insertRowData, containmentsColumnSet);
            await db.query(insertContainments);

            // INSERT Properties 
            const insertProperties = tbsNodesToCreate.flatMap(node =>
                node.properties.map(prop =>
                    ({ node_id: node.id, property: prop.property, value: prop.value })
                )
            );
            console.log("Insert properties: " + JSON.stringify(insertProperties))
            if (insertProperties.length !== 0) {
                const insertQuery = pgp.helpers.insert(insertProperties, PROPERTIES_COLUMNSET);
                await db.query(insertQuery);
            }

            // INSERT REFERENCES
            const insertReferences = tbsNodesToCreate.flatMap(node =>
                node.references.map(reference =>
                    ({ node_id: node.id, lw_reference: reference.reference, targets: reference.targets })
                )
            );
            console.log("Insert references: " + JSON.stringify(insertReferences))
            if (insertReferences.length !== 0) {
                const insertReferencesQuery = pgp.helpers.insert(insertReferences, REFERENCES_COLUMNSET);
                await db.query(insertReferencesQuery);
            }
        }
    }
}

export const LIONWEB_QUERIES = new LionWebQueries();
