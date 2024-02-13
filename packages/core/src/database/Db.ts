// const pgp = require("pg-promise")();
import {
    CONTAINMENTS_TABLE,
    NODES_TABLE,
    ORPHANS_CONTAINMENTS_TABLE,
    ORPHANS_NODES_TABLE,
    ORPHANS_PROPERTIES_TABLE,
    ORPHANS_REFERENCES_TABLE,
    PROPERTIES_TABLE,
    REFERENCES_TABLE
} from "@lionweb/repository-dbadmin"
import {
    ChildAdded,
    ChildOrderChanged,
    ChildRemoved,
    isEqualMetaPointer,
    LionWebJsonChunkWrapper,
    LionWebJsonNode,
    LionWebJsonReferenceTarget,
    PropertyValueChanged,
    ReferenceChange,
    TargetAdded,
    TargetOrderChanged,
    TargetRemoved
} from "@lionweb/validation"
import {dbConnection, pgp} from "./DbConnection.js"
import { sqlArrayFromNodeIdArray } from "./QueryNode.js"
import { CONTAINMENTS_COLUMN_SET, NODES_COLUMN_SET, PROPERTIES_COLUMN_SET, REFERENCES_COLUMN_SET } from "./TableDefinitions.js"
import {logger} from "../logging.js";

/**
 * Function that build SQL queries.
 */
export class Db {
    constructor() {
    }

    public makeQueriesForOrphans(orphanIds: string[]) {
        if (orphanIds.length === 0) {
            return ""
        }
        const sqlIds = sqlArrayFromNodeIdArray(orphanIds)
        return `-- Remove orphans by moving them to the orphan tables
                WITH orphan AS (
                    DELETE FROM ${NODES_TABLE} n
                    WHERE n.id IN ${sqlIds}
                    RETURNING *
                )
                INSERT INTO ${ORPHANS_NODES_TABLE}
                    SELECT * FROM orphan;
                
                WITH orphan AS (
                    DELETE FROM ${PROPERTIES_TABLE} p
                    WHERE p.node_id IN ${sqlIds}
                    RETURNING *
                )
                INSERT INTO ${ORPHANS_PROPERTIES_TABLE}
                    SELECT * FROM orphan;

                WITH orphan AS (
                    DELETE FROM ${CONTAINMENTS_TABLE} c
                    WHERE c.node_id IN ${sqlIds}
                    RETURNING *
                )                
                INSERT INTO ${ORPHANS_CONTAINMENTS_TABLE}
                    SELECT * FROM orphan;

                WITH orphan AS (
                    DELETE FROM ${REFERENCES_TABLE} r
                    WHERE r.node_id IN ${sqlIds}
                    RETURNING *
                )
                INSERT INTO ${ORPHANS_REFERENCES_TABLE}
                    SELECT * FROM orphan;
                `
    }

    public upsertQueriesForPropertyChanges(propertyChanged: PropertyValueChanged[]) {
        let queries = ""
        propertyChanged.forEach(propertyChange => {
            // Using Postgres Upsert
            const data = {
                node_id: propertyChange.nodeId,
                property: propertyChange.property,
                value: propertyChange.newValue
            }
            const setColumns = pgp.helpers.sets(data, PROPERTIES_COLUMN_SET)
            queries += pgp.helpers.insert(data, PROPERTIES_COLUMN_SET)
            queries += `
                ON CONFLICT (node_id, property)
                DO UPDATE 
                    SET ${setColumns};
                `
        })
        return queries
    }

    public upsertQueriesForReferenceChanges(referenceChanges: ReferenceChange[]) {
        let queries = ""
        referenceChanges
            .filter(r => r instanceof TargetAdded)
            .forEach(referenceChange => {
                const data = {
                    node_id: referenceChange.node.id,
                    reference: referenceChange.afterReference.reference,
                    targets: referenceChange.afterReference.targets
                }
                const setColumns = pgp.helpers.sets(data, REFERENCES_COLUMN_SET)
                queries += pgp.helpers.insert(data, REFERENCES_COLUMN_SET)
                queries += `-- Update if not inserted
                ON CONFLICT (node_id, reference)
                DO UPDATE
                    SET ${setColumns};
                `
            })
        referenceChanges
            .filter(r => r instanceof TargetRemoved)
            .forEach(referenceChange => {
                const data = {
                    node_id: referenceChange.node.id,
                    reference: referenceChange.beforeReference?.reference || referenceChange?.afterReference.reference,
                    targets: referenceChange.afterReference?.targets || []
                }
                queries += pgp.helpers.insert(data, REFERENCES_COLUMN_SET)
                queries += `-- Update if not inserted
                ON CONFLICT (node_id, reference)
                DO UPDATE 
                    SET ${pgp.helpers.sets(data, REFERENCES_COLUMN_SET)};
                `
            })
        return queries
    }

    /**
     * Old Update instead of Upsert method. keeping it in case this is needed.
     * @param referenceChanges
     */
    public updateQueriesForReferenceChanges(referenceChanges: ReferenceChange[]) {
        let queries = ""
        referenceChanges
            .filter(r => r instanceof TargetAdded)
            .forEach(referenceChange => {
                queries += `-- Reference has changed
                UPDATE ${REFERENCES_TABLE} r
                    SET ${pgp.helpers.sets({ targets: referenceChange.afterReference.targets }, REFERENCES_COLUMN_SET)}
                WHERE
                    r.node_id = '${referenceChange.node.id}' AND
                    r.reference->>'key' = '${referenceChange.afterReference.reference.key}' AND
                    r.reference->>'version' = '${referenceChange.afterReference.reference.version}'  AND
                    r.reference->>'language' = '${referenceChange.afterReference.reference.language}' ;
                `
            })
        referenceChanges
            .filter(r => r instanceof TargetRemoved)
            .forEach(referenceChange => {
                const targets =
                    referenceChange.afterReference === null ? null : referenceChange.afterReference.targets
                queries += `-- Reference has changed
                UPDATE ${REFERENCES_TABLE} r
                    SET ${pgp.helpers.sets({ targets: targets }, REFERENCES_COLUMN_SET)}
                WHERE
                    r.node_id = '${referenceChange.node.id}' AND
                    r.reference->>'key' = '${referenceChange.beforeReference.reference.key}' AND
                    r.reference->>'version' = '${referenceChange.beforeReference.reference.version}'  AND
                    r.reference->>'language' = '${referenceChange.beforeReference.reference.language}' ;
                `
            })
        return queries
    }

    /**
     * @param ordersChanged
     */
    public updateReferenceTargetOrder(ordersChanged: TargetOrderChanged[]) {
        let queries = ""
        ordersChanged.forEach(orderChange => {
            const setColumns = pgp.helpers.sets({ targets: orderChange.afterReference.targets }, REFERENCES_COLUMN_SET)
            queries += `-- Reference has changed
                UPDATE ${REFERENCES_TABLE} r
                    SET ${setColumns}
                WHERE
                    r.node_id = '${orderChange.node.id}' AND
                    r.reference->>'key' = '${orderChange.afterReference.reference.key}' AND
                    r.reference->>'version' = '${orderChange.afterReference.reference.version}'  AND
                    r.reference->>'language' = '${orderChange.afterReference.reference.language}' ;
                `
        })
        return queries
    }

    targetsAsPostgresArray(targets: LionWebJsonReferenceTarget[]): string {
        let result = "ARRAY["
        result += targets.map(target => "'" + JSON.stringify(target) + "'::jsonb").join(", ")
        return result + "]"
    }

    public updateParentQuery(nodeId: string, parent: string): string {
        return `-- Update of parent of children that have been moved
                UPDATE ${NODES_TABLE} 
                    SET ${pgp.helpers.sets({ parent: parent }, ["parent"])}
                WHERE
                    id = '${nodeId}';
                `
    }

    public updateAnnotationsQuery(nodeId: string, annotations: string[]): string {
        return `-- Update of annotations that have been moved
                UPDATE ${NODES_TABLE}
                    SET ${pgp.helpers.sets({ annotations: annotations }, ["annotations"])}
                WHERE
                     id = '${nodeId}';
                `
    }

    public updateQueriesForChildOrder(childOrderChange: ChildOrderChanged[]): string {
        let queries = ""
        childOrderChange.forEach(orderChanged => {
            const afterContainment = orderChanged.afterContainment
            queries += `-- Order of children has changed
                UPDATE ${CONTAINMENTS_TABLE}
                    SET ${pgp.helpers.sets({ children: afterContainment?.children }, CONTAINMENTS_COLUMN_SET)}
                WHERE
                    node_id = '${orderChanged.parentNode.id}' AND
                    containment->>'key' = '${afterContainment.containment.key}' AND
                    containment->>'version' = '${afterContainment.containment.version}' AND
                    containment->>'language' = '${afterContainment.containment.language}';
        `
        })
        return queries
    }

    public updateQueriesForRemovedChildren(removedChildren: ChildRemoved[], toBeStoredChunkWrapper: LionWebJsonChunkWrapper) {
        let queries = ""
        removedChildren.forEach(removed => {
            const afterNode = toBeStoredChunkWrapper.getNode(removed.parentNode.id)
            const afterContainment = afterNode.containments.find(cont => isEqualMetaPointer(cont.containment, removed.containment))
            const afterChildren = afterContainment === undefined ? [] : afterContainment.children
            queries += `-- Update node that has children removed.
                UPDATE ${CONTAINMENTS_TABLE} c 
                    SET ${pgp.helpers.sets({ children: afterChildren }, CONTAINMENTS_COLUMN_SET)}
                WHERE
                    c.node_id = '${afterNode.id}' AND
                    c.containment->>'key' = '${removed.containment.key}' AND 
                    c.containment->>'version' = '${removed.containment.version}'  AND
                    c.containment->>'language' = '${removed.containment.language}' ;
                    
                `
        })
        return queries
    }

    public upsertAddedChildrenQuery(addedChildren: ChildAdded[], toBeStoredChunkWrapper: LionWebJsonChunkWrapper) {
        let queries = ""
        addedChildren.forEach(added => {
            const afterNode = toBeStoredChunkWrapper.getNode(added.parentNode.id)
            if (afterNode === undefined) {
                console.error("Undefined node for id " + added.parentNode.id)
            }
            const afterContainment = afterNode.containments.find(cont => isEqualMetaPointer(cont.containment, added.containment))
            const setColumns = pgp.helpers.sets({ children: afterContainment.children }, CONTAINMENTS_COLUMN_SET)
            // UPSERT Containments
            const insertRowData = [
                { node_id: afterNode.id, containment: afterContainment.containment, children: afterContainment.children }
            ]
            if (insertRowData.length > 0) {
                const insertContainments = pgp.helpers.insert(insertRowData, CONTAINMENTS_COLUMN_SET)
                queries += insertContainments
                queries += `\n-- Up date if not inserted
                ON CONFLICT (node_id, containment)
                DO UPDATE 
                    SET ${setColumns};
                `
            }
        })
        return queries
    }

    public updateAddedChildrenQuery(addedChildren: ChildAdded[], toBeStoredChunkWrapper: LionWebJsonChunkWrapper) {
        let query = ""
        addedChildren.forEach(added => {
            const afterNode = toBeStoredChunkWrapper.getNode(added.parentNode.id)
            if (afterNode === undefined) {
                console.error("Undefined node for id " + added.parentNode.id)
            }
            const afterContainment = afterNode.containments.find(cont => isEqualMetaPointer(cont.containment, added.containment))
            const setChildren = pgp.helpers.sets({ children: afterContainment.children }, CONTAINMENTS_COLUMN_SET)
            query += `-- Update nodes that have children added
                UPDATE ${CONTAINMENTS_TABLE} c
                    SET ${setChildren}
                WHERE
                    c.node_id = '${afterNode.id}' AND
                    c.containment->>'key' = '${afterContainment.containment.key}' AND
                    c.containment->>'version' = '${afterContainment.containment.version}'  AND
                    c.containment->>'language' = '${afterContainment.containment.language}' ;
                `
        })
        return query
    }

    /**
     * Insert _tbsNodesToCreate in the lionweb_nodes table
     * These nodes are all new nodes.
     * @param tbsNodesToCreate
     */
    public async dbInsertNodeArray(tbsNodesToCreate: LionWebJsonNode[]) {
        logger.dbLog("Queries insert new nodes " + tbsNodesToCreate.map(n => n.id))
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
                    annotations: node.annotations,
                    parent: node.parent
                }
            })
            const insert = pgp.helpers.insert(node_rows, NODES_COLUMN_SET)
            await dbConnection.query(insert)
            await this.insertContainments(tbsNodesToCreate)

            // INSERT Properties
            const insertProperties = tbsNodesToCreate.flatMap(node =>
                node.properties.map(prop => ({ node_id: node.id, property: prop.property, value: prop.value }))
            )
            if (insertProperties.length !== 0) {
                const insertQuery = pgp.helpers.insert(insertProperties, PROPERTIES_COLUMN_SET)
                await dbConnection.query(insertQuery)
            }

            // INSERT References
            const insertReferences = tbsNodesToCreate.flatMap(node =>
                node.references.map(reference => ({ node_id: node.id, reference: reference.reference, targets: reference.targets }))
            )
            if (insertReferences.length !== 0) {
                const insertReferencesQuery = pgp.helpers.insert(insertReferences, REFERENCES_COLUMN_SET)
                await dbConnection.query(insertReferencesQuery)
            }
        }
    }

    public async insertContainments(tbsNodesToCreate: LionWebJsonNode[]) {
        // INSERT Containments
        const insertRowData = tbsNodesToCreate.flatMap(node =>
            node.containments.map(c => ({ node_id: node.id, containment: c.containment, children: c.children }))
        )
        if (insertRowData.length > 0) {
            const insertContainments = pgp.helpers.insert(insertRowData, CONTAINMENTS_COLUMN_SET)
            await dbConnection.query(insertContainments)
        }
    }

    public async selectNodesIdsWithoutParent(): Promise<{ id: string }[]> {
        return (await dbConnection.query(`SELECT id FROM ${NODES_TABLE} WHERE parent is null`)) as { id: string }[]
    }
}

export const DB = new Db()
