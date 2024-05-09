// Types for table query results

export type ReservedIdRecord = {
    node_id: string,
    client_id: string
}

export type NodeRecord = {
    id: string,                   // The node id // Don't update this column
    classifier_language: string,  // The classifier of the node
    classifier_version: string,   // The classifier of the node
    classifier_key: string,       // The classifier of the node
    annotations: string[],          // The annotation(id)s
    parent: string | null
}
