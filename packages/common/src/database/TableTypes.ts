// Types for table query results

export type ReservedIdRecord = {
    node_id: string,
    client_id: string
}

export type NodeRecord = {
    id,                   // The node id // Don't update this column
    classifier_language,  // The classifier of the node
    classifier_version,   // The classifier of the node
    classifier_key,       // The classifier of the node
    annotations,          // The annotation(id)s
    parent
}
