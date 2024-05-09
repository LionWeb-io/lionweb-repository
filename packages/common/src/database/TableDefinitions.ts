/**
 * The table definitions for use with pg-promise helpers
 */
import pgPromise from "pg-promise";
import pg from "pg-promise/typescript/pg-subset.js";
import { CONTAINMENTS_TABLE, NODES_TABLE, PROPERTIES_TABLE, REFERENCES_TABLE, RESERVED_IDS_TABLE } from "./TableNames.js"

// NOTE: '?' at front of column name means that this column will not be updated by an UPDATE

export type ContainmentRowData = {
    containment_version: string
    containment_language: string
    containment_key: string
    children: string[]
    node_id: string
}
export type PropertyRowData = {
    property_version: string
    property_language: string
    property_key: string
    value: unknown
    node_id: string
}
export type ReferenceRowData = {
    reference_version: string
    reference_language: string
    reference_key: string
    targets: object[]
    node_id: string
}

export class TableDefinitions {
    NODES_COLUMN_SET: pgPromise.ColumnSet
    CONTAINMENTS_COLUMN_SET: pgPromise.ColumnSet
    PROPERTIES_COLUMN_SET: pgPromise.ColumnSet
    REFERENCES_COLUMN_SET: pgPromise.ColumnSet
    RESERVED_IDS_COLUMN_SET: pgPromise.ColumnSet
    
    constructor(private pgp: pgPromise.IMain<object, pg.IClient>) {
        this.pgp = pgp
        // prettier-ignore
        this.NODES_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                "?id",                   // The node id // Don't update this column
                "?classifier_language",  // The classifier of the node
                "?classifier_version",   // The classifier of the node
                "?classifier_key",       // The classifier of the node
                "annotations",          // The annotation(id)s
                "parent"                // The id of the parent node
            ],
            { table: NODES_TABLE }
        )
        // prettier-ignore
        this.CONTAINMENTS_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                "?containment_language",  // The classifier of the node
                "?containment_version",   // The classifier of the node
                "?containment_key",       // The classifier of the node
                "children",
                "?node_id"              // Don't update this column
            ],
            { table: CONTAINMENTS_TABLE }
        )
        // prettier-ignore
        this.PROPERTIES_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                "?property_language",  // The classifier of the node
                "?property_version",   // The classifier of the node
                "?property_key",       // The classifier of the node
                "value",
                "?node_id"      // Don't update this column
            ],
            { table: PROPERTIES_TABLE }
        )
        // prettier-ignore
        this.REFERENCES_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                "?reference_language",  // The classifier of the node
                "?reference_version",   // The classifier of the node
                "?reference_key",       // The classifier of the node
                {
                    name: "targets",
                    cast: "jsonb[]"
                },
                "?node_id"      // Don't update this column
            ],
            { table: REFERENCES_TABLE }
        )
        // prettier-ignore
        this.RESERVED_IDS_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                "node_id",      // The reserved node id
                "client_id"     // The client for which the node id has been reserved
            ],
            { table: RESERVED_IDS_TABLE }
        )
    }
}
