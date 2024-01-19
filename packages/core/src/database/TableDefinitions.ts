/**
 * The table definitions for use with pg-promise helpers
 * Need to be kept
 */
import { CONTAINMENTS_TABLE, NODES_TABLE, PROPERTIES_TABLE, REFERENCES_TABLE } from "@lionweb/repository-dbadmin";
import { pgp } from "./DbConnection.js";
// import pgPromise from "pg-promise"

// export const pgp = pgPromise()

// NOTE: '?' at front of column name means that this column will not be updated by an UPDATE

// prettier-ignore
export const NODES_COLUMN_SET = new pgp.helpers.ColumnSet(
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
export const CONTAINMENTS_COLUMN_SET = new pgp.helpers.ColumnSet(
    [
        "?containment",         // Don't update this column
        "children",
        "?node_id"              // Don't update this column
    ],
    { table: CONTAINMENTS_TABLE }
)

// prettier-ignore
export const PROPERTIES_COLUMN_SET = new pgp.helpers.ColumnSet(
    [
        "?property",    // Don't update this column
        "value",
        "?node_id"      // Don't update this column
    ],
    { table: PROPERTIES_TABLE }
)

// prettier-ignore
export const REFERENCES_COLUMN_SET = new pgp.helpers.ColumnSet(
    [
        "?reference",    // Don't update this column
        {
            name: "targets",
            cast: "jsonb[]"
        },
        "?node_id"      // Don't update this column
    ],
    { table: REFERENCES_TABLE }
)
