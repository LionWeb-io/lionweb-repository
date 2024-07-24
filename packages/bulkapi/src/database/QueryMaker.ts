// const pgp = require("pg-promise")();
import {
    CONTAINMENTS_TABLE,
    NODES_TABLE,
    PROPERTIES_TABLE,
    REFERENCES_TABLE,
    TableHelpers,
    RESERVED_IDS_TABLE,
    ReservedIdRecord,
    NodeRecord,
    NODES_TABLE_HISTORY,
    RepositoryData,
    dbLogger,
    METAPOINTERS_TABLE,
    DbConnection
} from "@lionweb/repository-common"
import {
    LionWebJsonNode,
    LionWebJsonReferenceTarget,
    ReferenceChange
} from "@lionweb/validation"
import { BulkApiContext } from "../main.js"
import { DbChanges } from "./DbChanges.js";
import { sqlArrayFromNodeIdArray } from "./QueryNode.js"
import {LionWebJsonMetaPointer} from "@lionweb/validation/src/json/LionWebJson";

/**
 * Class that builds SQL queries.
 */
export class QueryMaker {
    constructor(private context: BulkApiContext) {
    }

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

    public upsertQueriesForReferenceChanges(referenceChanges: ReferenceChange[]) {
        let queries = ""
        const db = new DbChanges(this.context)
        db.addChanges(referenceChanges)
        queries += db.createPostgresQuery() 
        return queries + "\n"
    }

    targetsAsPostgresArray(targets: LionWebJsonReferenceTarget[]): string {
        let result = "ARRAY["
        result += targets.map(target => "'" + JSON.stringify(target) + "'::jsonb").join(", ")
        return result + "]"
    }


    /**
     * Insert _tbsNodesToCreate_ in the lionweb_nodes table
     * These nodes are all new nodes, so all nodes,  properties, copntainmmentds and references are directly inserted
     * in their respective tables.
     * @param tbsNodesToCreate
     */
    public async dbInsertNodeArray(dbConnection: DbConnection, repositoryData: RepositoryData, tbsNodesToCreate: LionWebJsonNode[]): Promise<string> {
        // First, we find all metapointers
        const existingMetaPointers = await getExistingMetaPointers(dbConnection, repositoryData)
        const newMetaPointers = new Map<LionWebJsonMetaPointer, number>();

        function checkMetapointer(mp: LionWebJsonMetaPointer) {
            if (!existingMetaPointers.has(mp) && !newMetaPointers.has(mp)) {
                newMetaPointers.set(mp, existingMetaPointers.size + newMetaPointers.size + 1)
            }
        }

        function metapointerIndex(mp: LionWebJsonMetaPointer): number {
            let res = existingMetaPointers.get(mp)
            if (res !== undefined) {
                return res
            }
            res = newMetaPointers.get(mp);
            if (res !== undefined) {
                return res
            }
            throw new Error(`Cannot find metapointer ${JSON.stringify(mp)}`)
        }

        tbsNodesToCreate.forEach(node => {
            checkMetapointer(node.classifier);
            node.properties.forEach(prop => {
                checkMetapointer(prop.property)
            })
            node.containments.forEach(cont => {
                checkMetapointer(cont.containment)
            })
            node.references.forEach(ref => {
                checkMetapointer(ref.reference)
            })
        })

        if (newMetaPointers.size > 0) {
            console.log("newMetaPointers", newMetaPointers)
            const metapointers_rows = Array.from(newMetaPointers.entries()).map(entry => {
                return {
                    id: entry[1],
                    language: entry[0].language,
                    _version: entry[0].version,
                    key: entry[0].key,
                }
            })
            await dbConnection.query(repositoryData, this.context.pgp.helpers.insert(metapointers_rows, TableHelpers.METAPOINTERS_COLUMN_SET) + ";\n")
        }

        dbLogger.debug("Queries insert new nodes " + tbsNodesToCreate.map(n => n.id))
        {
            let query = "-- create new nodes\n"
            if (tbsNodesToCreate.length === 0) {
                return query
            }
            const node_rows: NodeRecord[] = tbsNodesToCreate.map(node => {
                return {
                    id: node.id,
                    classifier: metapointerIndex(node.classifier),
                    annotations: node.annotations,
                    parent: node.parent
                }
            })
            query += this.context.pgp.helpers.insert(node_rows, TableHelpers.NODES_COLUMN_SET) + ";\n"
            query += this.insertContainments(tbsNodesToCreate, metapointerIndex)

            // INSERT Properties
            const insertProperties = tbsNodesToCreate.flatMap(node =>
                node.properties.map(prop => ({ 
                    node_id: node.id,
                    property: metapointerIndex(prop.property),
                    value: prop.value }))
            )
            if (insertProperties.length !== 0) {
                query += this.context.pgp.helpers.insert(insertProperties, TableHelpers.PROPERTIES_COLUMN_SET) + ";\n"
            }

            // INSERT References
            const insertReferences = tbsNodesToCreate.flatMap(node =>
                node.references.map(reference => ({ 
                    node_id: node.id,
                    reference: metapointerIndex(reference.reference),
                    targets: reference.targets
                }))
            )
            if (insertReferences.length !== 0) {
                query += this.context.pgp.helpers.insert(insertReferences, TableHelpers.REFERENCES_COLUMN_SET) + ";\n"
            }
            return query
        }
    }

    public insertContainments(tbsNodesToCreate: LionWebJsonNode[], metapointerIndex: (mp: LionWebJsonMetaPointer) => number): string {
        let query = "-- insert containments for new node\n"
        // INSERT Containments
        const insertRowData = tbsNodesToCreate.flatMap(node =>
            node.containments.map(c => ({ 
                node_id: node.id,
                containment: metapointerIndex(c.containment),
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
        const insertReservation: ReservedIdRecord[]  = nodeIdList.map(id =>
            ({ 
                node_id: id,
                client_id: repositoryData.clientId
            })
        )
        if (insertReservation.length !== 0) {
            return this.context.pgp.helpers.insert(insertReservation, TableHelpers.RESERVED_IDS_COLUMN_SET) + ";\n"
        }

        return ""
    }
}

type MpEntry = {language:string, key:string, _version:string, id: number};

export async function getExistingMetaPointers(dbConnection: DbConnection, repositoryData: RepositoryData): Promise<Map<LionWebJsonMetaPointer, number>> {
    const rawResult = await dbConnection.query(repositoryData, `select * from ${METAPOINTERS_TABLE}`);
    const res =  new Map<LionWebJsonMetaPointer, number>();
    rawResult.forEach((entry:MpEntry) => {
        res.set({
            language: entry.language,
            key: entry.key,
            version: entry._version
        }, entry.id)
    });
    return res;
}