/**
 * The table definitions for use with pg-promise helpers
 */
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import {
    CONTAINMENTS_TABLE,
    METAPOINTERS_TABLE,
    NODES_TABLE,
    PROPERTIES_TABLE,
    REFERENCES_TABLE,
    REPOSITORIES_TABLE,
    RESERVED_IDS_TABLE
} from "./TableNames.js"

/**
 * Value use in the _to_ column to represent _forever_.
 * The value 2147483647 is the max integer value in postgres.
 */
export const FOREVER = 2147483647
/**
 * Value used to represent unlimited depth in recursive queries.
 */
export const UNLIMITED_DEPTH = 2147483647

// NOTE: '?' at front of column name means that this column will not be updated by an UPDATE

export class TableDefinitions {
    NODES_COLUMN_SET: pgPromise.ColumnSet
    CONTAINMENTS_COLUMN_SET: pgPromise.ColumnSet
    PROPERTIES_COLUMN_SET: pgPromise.ColumnSet
    REFERENCES_COLUMN_SET: pgPromise.ColumnSet
    RESERVED_IDS_COLUMN_SET: pgPromise.ColumnSet
    METAPOINTERS_COLUMN_SET: pgPromise.ColumnSet
    REPOSITORIES_COLUMN_SET: pgPromise.ColumnSet

    constructor(private pgp: pgPromise.IMain<object, pg.IClient>) {
        this.pgp = pgp
        // prettier-ignore
        this.METAPOINTERS_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                "?id",
                "?language",
                "?_version",
                "?key",
            ],
            { table: METAPOINTERS_TABLE }
        )
        // prettier-ignore
        this.NODES_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                "?id",                   // The node id // Don't update this column
                {
                    name: 'classifier',
                    mod: ':raw'
                },
                "annotations",          // The annotation(id)s
                "parent"                // The id of the parent node
            ],
            { table: NODES_TABLE }
        )
        // prettier-ignore
        this.CONTAINMENTS_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                {
                    name: 'containment',
                    mod: ':raw',
                    cnd: true // Don't update this column
                },
                "children",
                "?node_id"              // Don't update this column
            ],
            { table: CONTAINMENTS_TABLE }
        )
        // prettier-ignore
        this.PROPERTIES_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                {
                    name: 'property',
                    mod: ':raw',
                    cnd: true // Don't update this column
                },
                "value",
                "?node_id"      // Don't update this column
            ],
            { table: PROPERTIES_TABLE }
        )
        // prettier-ignore
        this.REFERENCES_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                {
                    name: 'reference',
                    mod: ':raw',
                    cnd: true // Don't update this column
                },
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
        // prettier-ignore
        this.REPOSITORIES_COLUMN_SET = new this.pgp.helpers.ColumnSet(
            [
                "repository_name",
                "schema_name",
                "lionweb_version",
                "history",
                "?created"
            ],
            { table: REPOSITORIES_TABLE }
        )
    }
}
