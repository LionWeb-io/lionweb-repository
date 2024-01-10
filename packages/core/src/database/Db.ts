// const pgp = require("pg-promise")();
import {
    ChildAdded, ChildOrderChanged,
    ChildRemoved,
    isEqualMetaPointer,
    LionWebJsonChunkWrapper,
    LionWebJsonNode,
    LionWebJsonReferenceTarget, NodeUtils,
    PropertyValueChanged,
    ReferenceChange,
    TargetAdded, TargetOrderChanged,
    TargetRemoved
} from "@lionweb/validation"
import { dbConnection } from "./DbConnection.js"
import { postgresArrayFromStringArray, sqlArrayFromStringArray } from "./QueryNode.js"
import { CONTAINMENTS_COLUMNSET, NODES_COLUMNSET, pgp, PROPERTIES_COLUMNSET, REFERENCES_COLUMNSET } from "./TableDefinitions.js"


export type NodeTreeResultType = {
    id: string
    parent: string
    depth: number
}

/**
 * Function that build SQL queries.
 */
export class Db {
    constructor() {}

    public makeQueriesForOrphans(orphanIds: string[]) {
        if (orphanIds.length === 0) {
            return ""
        }
        const sqlIds = sqlArrayFromStringArray(orphanIds)
        return `-- Remove orphans by moving them to the orphan tables
                WITH orphan AS (
                    DELETE FROM lionweb_nodes n
                    WHERE n.id IN ${sqlIds}
                    RETURNING *
                )
                INSERT INTO lionweb_nodes_orphans
                    SELECT * FROM orphan;
                
                WITH orphan AS (
                    DELETE FROM lionweb_properties p
                    WHERE p.node_id IN ${sqlIds}
                    RETURNING *
                )
                INSERT INTO lionweb_properties_orphans
                    SELECT * FROM orphan;

                WITH orphan AS (
                    DELETE FROM lionweb_containments c
                    WHERE c.node_id IN ${sqlIds}
                    RETURNING *
                )                
                INSERT INTO lionweb_containments_orphans
                    SELECT * FROM orphan;

                WITH orphan AS (
                    DELETE FROM lionweb_references r
                    WHERE r.node_id IN ${sqlIds}
                    RETURNING *
                )
                INSERT INTO lionweb_references_orphans
                    SELECT * FROM orphan;
                `
    }

    public upsertQueriesForPropertyChanges(propertyChanged: PropertyValueChanged[]) {
        let queries = ""
        propertyChanged.forEach(propertyChange => {
            // Using Postgres Upsert
            queries += pgp.helpers.insert(
                {
                    node_id: propertyChange.nodeId,
                    property: propertyChange.property,
                    value: propertyChange.newValue
                },
                PROPERTIES_COLUMNSET
            )
            queries += `
                ON CONFLICT (node_id, property)
                DO UPDATE 
                    SET value = '${propertyChange.newValue}';
                `
        })
        return queries
    }

    public upsertQueriesForReferenceChanges(referenceChanges: ReferenceChange[]) {
        let queries = ""
        referenceChanges
            .filter(r => r instanceof TargetAdded)
            .forEach(referenceChange => {
                queries += pgp.helpers.insert(
                    {
                        node_id: referenceChange.node.id,
                        reference: referenceChange.afterReference.reference,
                        targets: referenceChange.afterReference.targets
                    },
                    REFERENCES_COLUMNSET
                )
                queries += `-- Update if not inserted
                ON CONFLICT (node_id, reference)
                DO UPDATE   
                    SET targets = ${this.targetsAsPostgresArray(referenceChange.afterReference.targets)};
                `
            })
        referenceChanges
            .filter(r => r instanceof TargetRemoved)
            .forEach(referenceChange => {
                queries += pgp.helpers.insert(
                    {
                        node_id: referenceChange.node.id,
                        reference: referenceChange.beforeReference?.reference || referenceChange?.afterReference.reference,
                        targets: referenceChange.afterReference?.targets || []
                    },
                    REFERENCES_COLUMNSET
                )
                const targets =
                    referenceChange.afterReference === null
                        ? "ARRAY[]::jsonb[]"
                        : this.targetsAsPostgresArray(referenceChange.beforeReference.targets)
                queries += `-- Update if not inserted
                ON CONFLICT (node_id, reference)
                DO UPDATE 
                    SET targets = ${targets};
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
                UPDATE lionweb_references r
                    SET targets = ${this.targetsAsPostgresArray(referenceChange.afterReference.targets)}
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
                    referenceChange.afterReference === null
                        ? "ARRAY[]::jsonb[]"
                        : this.targetsAsPostgresArray(referenceChange.beforeReference.targets)
                queries += `-- Reference has changed
                UPDATE lionweb_references r
                    SET targets = ${targets}
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
        ordersChanged
            .forEach(orderChange => {
                queries += `-- Reference has changed
                UPDATE lionweb_references r
                    SET targets = ${this.targetsAsPostgresArray(orderChange.afterReference.targets)}
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
                UPDATE lionweb_nodes n 
                    SET parent = '${parent}'
                WHERE
                    n.id = '${nodeId}';
                `
    }

    public updateAnnotationsQuery(nodeId: string, annotations: string[]): string {
        return `-- Update of annotations that have been moved
                UPDATE lionweb_nodes
                    SET annotations = '${postgresArrayFromStringArray(annotations)}'
                WHERE
                     id = '${nodeId}';
                `
    }

    public updateQueriesForChildOrder(childOrderChange: ChildOrderChanged[]): string {
        let queries = ""
        childOrderChange.forEach(orderChanged => {
            const afterContainment = orderChanged.afterContainment
            queries += `-- Order of children has changed
                UPDATE lionweb_containments
                    SET children = '${postgresArrayFromStringArray(afterContainment?.children)}'
                WHERE
                    node_id = '${orderChanged.parentNode.id}' AND
                    containment->>'key' = '${orderChanged.containment.key}' AND
                    containment->>'version' = '${orderChanged.containment.version}' AND
                    containment->>'language' = '${orderChanged.containment.language}';
        `
        })
        return queries
    }

    public updateQueriesForRemovedChildren(removedChildren: ChildRemoved[], toBeStoredChunkWrapper: LionWebJsonChunkWrapper) {
        let queries = ""
        removedChildren.forEach(removed => {
            const afterNode = toBeStoredChunkWrapper.getNode(removed.parentNode.id)
            const afterContainment = afterNode.containments.find(cont => isEqualMetaPointer(cont.containment, removed.containment))
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

    public upsertAddedChildrenQuery(addedChildren: ChildAdded[], toBeStoredChunkWrapper: LionWebJsonChunkWrapper) {
        let queries = ""
        addedChildren.forEach(added => {
            const afterNode = toBeStoredChunkWrapper.getNode(added.parentNode.id)
            if (afterNode === undefined) {
                console.error("Undefined node for id " + added.parentNode.id)
            }
            const afterContainment = afterNode.containments.find(cont => isEqualMetaPointer(cont.containment, added.containment))
            const children = postgresArrayFromStringArray(afterContainment.children)
            // UPSERT Containments
            const insertRowData = [
                { node_id: afterNode.id, containment: afterContainment.containment, children: afterContainment.children }
            ]
            if (insertRowData.length > 0) {
                const insertContainments = pgp.helpers.insert(insertRowData, CONTAINMENTS_COLUMNSET)
                queries += insertContainments
                queries += `\n-- Up date if not inserted
                ON CONFLICT (node_id, containment)
                DO UPDATE 
                    SET children = '${children}';
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
            const children = postgresArrayFromStringArray(afterContainment.children)
            query += `-- Update nodes that have children added
                UPDATE lionweb_containments c
                    SET children = '${children}'
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
        console.log("Queries insertnew nodes " + tbsNodesToCreate.map(n => n.id))
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
            const insert = pgp.helpers.insert(node_rows, NODES_COLUMNSET)
            await dbConnection.query(insert)
            await this.insertContainments(tbsNodesToCreate)

            // INSERT Properties
            const insertProperties = tbsNodesToCreate.flatMap(node =>
                node.properties.map(prop => ({ node_id: node.id, property: prop.property, value: prop.value }))
            )
            if (insertProperties.length !== 0) {
                const insertQuery = pgp.helpers.insert(insertProperties, PROPERTIES_COLUMNSET)
                await dbConnection.query(insertQuery)
            }

            // INSERT REFERENCES
            const insertReferences = tbsNodesToCreate.flatMap(node =>
                node.references.map(reference => ({ node_id: node.id, reference: reference.reference, targets: reference.targets }))
            )
            if (insertReferences.length !== 0) {
                const insertReferencesQuery = pgp.helpers.insert(insertReferences, REFERENCES_COLUMNSET)
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
            const insertContainments = pgp.helpers.insert(insertRowData, CONTAINMENTS_COLUMNSET)
            await dbConnection.query(insertContainments)
        }
    }

    public async selectNodesIdsWithoutParent(): Promise<{ id:string }[]> {
        const result = (await dbConnection.query("SELECT id FROM lionweb_nodes WHERE parent is null")) as { id: string }[]
        return result
    }
}

export const DB = new Db()
