/**
 * The table definitions for use with pg-promise helpers
 * Need to be kept 
 */
import { CONTAINMENTS_TABLE, NODES_TABLE, PROPERTIES_TABLE, REFERENCES_TABLE } from "@lionweb/repository-dbadmin";
import pgPromise from "pg-promise"

export const pgp = pgPromise()

// prettier-ignore
export const NODES_COLUMN_SET = new pgp.helpers.ColumnSet(
    [
        "id",                   // The node id
        "classifier_language",  // The classifier of the node
        "classifier_version",   // The classifier of the node
        "classifier_key",       // The classifier of the node
        "annotations",          // The annotation(id)s
        "parent"                // The id of the parent node
    ],
    { table: NODES_TABLE }
)

// prettier-ignore
export const CONTAINMENTS_COLUMN_SET = new pgp.helpers.ColumnSet(
    [
        "containment",
        "children",
        "node_id"
    ],
    { table: CONTAINMENTS_TABLE }
)

// prettier-ignore
export const PROPERTIES_COLUMN_SET = new pgp.helpers.ColumnSet(
    [
        "?property",
        "value",
        "?node_id"
    ],
    { table: PROPERTIES_TABLE }
)

// prettier-ignore
export const REFERENCES_COLUMN_SET = new pgp.helpers.ColumnSet(
    [
        "reference",
        {
            name: "targets",
            cast: "jsonb[]"
        },
        "node_id"
    ],
    { table: REFERENCES_TABLE }
)
