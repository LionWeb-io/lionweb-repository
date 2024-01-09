import pgPromise from "pg-promise"

export const pgp = pgPromise()

export const NODES_TABLE: string = "lionweb_nodes"
export const CONTAINMENTS_TABLE: string = "lionweb_containments"
export const REFERENCES_TABLE: string = "lionweb_references"
export const PROPERTIES_TABLE: string = "lionweb_properties"

// table definition for use with pg-promise helpers
export const NODES_COLUMNSET = new pgp.helpers.ColumnSet(
    ["id", "classifier_language", "classifier_version", "classifier_key", "annotations", "parent"],
    {
        table: NODES_TABLE
    }
)
// table definition for use with pg-promise helpers
export const CONTAINMENTS_COLUMNSET = new pgp.helpers.ColumnSet(["containment", "children", "node_id"], { table: CONTAINMENTS_TABLE })

// table definition for use with pg-promise helpers
export const PROPERTIES_COLUMNSET = new pgp.helpers.ColumnSet(["property", "value", "node_id"], { table: PROPERTIES_TABLE })

// table definition for use with pg-promise helpers
export const REFERENCES_COLUMNSET = new pgp.helpers.ColumnSet(
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
