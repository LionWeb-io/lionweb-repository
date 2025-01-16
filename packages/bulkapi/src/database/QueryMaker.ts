import {
    CONTAINMENTS_TABLE,
    NODES_TABLE,
    PROPERTIES_TABLE,
    REFERENCES_TABLE,
    TableHelpers,
    RESERVED_IDS_TABLE,
    ReservedIdRecord,
    NODES_TABLE_HISTORY,
    RepositoryData,
    dbLogger
} from "@lionweb/repository-common"
import { LionWebJsonNode, LionWebJsonReferenceTarget, ReferenceChange } from "@lionweb/validation"
import { BulkApiContext } from "../main.js"
import { DbChanges } from "./DbChanges.js"
import { sqlArrayFromNodeIdArray } from "./QueryNode.js"
import { MetaPointersTracker } from "@lionweb/repository-dbadmin"

/**
 * Class that builds SQL queries.
 */
export class QueryMaker {
    constructor(private context: BulkApiContext) {}

    public makeQueriesForOrphans(orphanIds: string[]) {
        if (orphanIds.length === 0) {
            return ""
        }
        const sqlIds = sqlArrayFromNodeIdArray(orphanIds)
        return `-- Remove orphans by moving them to the orphan tables
                DELETE FROM ${NODES_TABLE} n
                WHERE n.id IN ${sqlIds};
                
                DELETE FROM ${PROPERTIES_TABLE} p
                WHERE p.node_id IN ${sqlIds};

                DELETE FROM ${CONTAINMENTS_TABLE} c
                WHERE c.node_id IN ${sqlIds};

                DELETE FROM ${REFERENCES_TABLE} r
                WHERE r.node_id IN ${sqlIds};
                `
    }

    public upsertQueriesForReferenceChanges(referenceChanges: ReferenceChange[], repositoryData: RepositoryData) {
        let queries = ""
        const db = new DbChanges(this.context)
        db.addChanges(referenceChanges)
        const metaPointersTracker = new MetaPointersTracker(repositoryData)
        queries += db.createPostgresQuery(metaPointersTracker)
        return queries + "\n"
    }

    targetsAsPostgresArray(targets: LionWebJsonReferenceTarget[]): string {
        let result = "ARRAY["
        result += targets.map(target => "'" + JSON.stringify(target) + "'::jsonb").join(", ")
        return result + "]"
    }

    /**
     * Create a query to insert _tbsNodesToCreate_ in the lionweb_nodes table
     * These nodes are all new nodes, so all nodes,  properties, containments and references are directly inserted
     * in their respective tables.
     * @param tbsNodesToCreate
     */
    public dbInsertNodeArray(tbsNodesToCreate: LionWebJsonNode[], metaPointersTracker: MetaPointersTracker): string {
        dbLogger.debug("Queries insert new nodes " + tbsNodesToCreate.map(n => n.id))
        {
            let query = "-- create new nodes\n"
            if (tbsNodesToCreate.length === 0) {
                return query
            }
            const node_rows = tbsNodesToCreate.map(node => {
                return {
                    id: node.id,
                    classifier: this.context.pgp.as.format(metaPointersTracker.forMetaPointer(node.classifier).toString()),
                    annotations: node.annotations,
                    parent: node.parent
                }
            })
            query += this.context.pgp.helpers.insert(node_rows, TableHelpers.NODES_COLUMN_SET) + ";\n"
            query += this.insertContainments(tbsNodesToCreate, metaPointersTracker)

            // INSERT Properties
            const insertProperties = tbsNodesToCreate.flatMap(node =>
                node.properties.map(prop => ({
                    node_id: node.id,
                    property: this.context.pgp.as.format(metaPointersTracker.forMetaPointer(prop.property).toString()),
                    value: prop.value
                }))
            )
            if (insertProperties.length !== 0) {
                query += this.context.pgp.helpers.insert(insertProperties, TableHelpers.PROPERTIES_COLUMN_SET) + ";\n"
            }

            // INSERT References
            const insertReferences = tbsNodesToCreate.flatMap(node =>
                node.references.map(reference => ({
                    node_id: node.id,
                    reference: this.context.pgp.as.format(metaPointersTracker.forMetaPointer(reference.reference).toString()),
                    targets: reference.targets
                }))
            )
            if (insertReferences.length !== 0) {
                query += this.context.pgp.helpers.insert(insertReferences, TableHelpers.REFERENCES_COLUMN_SET) + ";\n"
            }
            return query
        }
    }

    public insertContainments(tbsNodesToCreate: LionWebJsonNode[], metaPointersTracker: MetaPointersTracker): string {
        let query = "-- insert containments for new node\n"
        // INSERT Containments
        const insertRowData = tbsNodesToCreate.flatMap(node =>
            node.containments.map(c => ({
                node_id: node.id,
                containment: this.context.pgp.as.format(metaPointersTracker.forMetaPointer(c.containment).toString()),
                children: c.children
            }))
        )
        if (insertRowData.length > 0) {
            query += this.context.pgp.helpers.insert(insertRowData, TableHelpers.CONTAINMENTS_COLUMN_SET) + ";\n"
        }
        return query
    }

    public selectNodesIdsWithoutParentQuery(): string {
        return `SELECT id FROM ${NODES_TABLE} WHERE parent is null`
    }

    public makeSelectNodesIdsWithoutParentWithVersion(repo_version: number): string {
        return `SELECT id FROM ${NODES_TABLE_HISTORY} WHERE parent is null AND from_version <= ${repo_version} AND to_version >${repo_version}`
    }

    public findReservedNodesFromIdList(repositoryData: RepositoryData, nodeIdList: string[]): string {
        const sqlArray = sqlArrayFromNodeIdArray(nodeIdList)
        return `-- Retrieve node tree
            SELECT node_id, client_id
            FROM ${RESERVED_IDS_TABLE}
            WHERE node_id IN ${sqlArray}  AND client_id != '${repositoryData.clientId}'   
    `
    }

    /**
     * Return the subset of _nodeIdList_ that are currently in use in the repository.
     * @param nodeIdList The list of node is's to be checked.
     */
    public findNodeIdsInUse(nodeIdList: string[]): string {
        // This works ok as along as you don't mix old (deleted) nodes with newer node,
        // because it allows node id's to be reused.
        const sqlArray = sqlArrayFromNodeIdArray(nodeIdList)
        return `-- Retrieve node tree
            SELECT id
            FROM ${NODES_TABLE}
            WHERE id IN ${sqlArray}   
    `
    }

    public storeReservedNodeIds(repositoryData: RepositoryData, nodeIdList: string[]): string {
        const insertReservation: ReservedIdRecord[] = nodeIdList.map(id => ({
            node_id: id,
            client_id: repositoryData.clientId
        }))
        if (insertReservation.length !== 0) {
            return this.context.pgp.helpers.insert(insertReservation, TableHelpers.RESERVED_IDS_COLUMN_SET) + ";\n"
        }

        return ""
    }
}
