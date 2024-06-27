import { CONTAINMENTS_TABLE, NODES_TABLE, PROPERTIES_TABLE, REFERENCES_TABLE, ResponseMessage } from "@lionweb/repository-common";

export function sqlArrayFromNodeIdArray(strings: string[]): string {
    return `(${strings.map(id => `'${id}'`).join(", ")})`
}

export function postgresArrayFromStringArray(strings: string[]): string {
    return `{${strings.map(id => `"${id}"`).join(", ")}}`
}

export function nextRepoVersionQuery(clientId: string) {
    return `SELECT nextRepoVersion('${clientId}');\n`
}

export function currentRepoVersionQuery(): string {
    return `SELECT currentRepoVersion();\n`
}

/**
 * Converts the result of queries using Postgres function nextRepoVersion or currentRepoVersion to the version number
 * @param versionResult
 */
export function versionResultToResponse(versionResult: object): ResponseMessage {
    // @ts-expect-error TS5703
    const version = (versionResult[0]?.currentrepoversion ?? versionResult[0]?.nextrepoversion) as number
    return {
        kind: "RepoVersion",
        message: "RepositoryVersion at end of Transaction",
        data: { "version": `${version}`}
    }
}

/**
 * Query to retrieve the full LionWeb nodes from the database.
 * @param nodesQuery string SQL query to select the sub set of nodes to retrieve.
 * @constructor
 */
export const nodesForQueryQuery = (nodesQuery: string): string => {
    return `-- Get the nodes for the nodes query
    WITH relevant_nodes AS (
        ${nodesQuery}
    ),
    node_properties AS ( 
        SELECT
            relevant_nodes.id ,
            array_remove(
                array_agg(
                    CASE
                      WHEN prop.property_key IS NOT NULL THEN
                        jsonb_build_object(
                            'property', 
                            json_build_object(
                                'version', prop.property_version,
                                'language', prop.property_language,
                                'key', prop.property_key
                            ),
                            'value', prop.value
                        )
                      WHEN TRUE THEN
                        null
                    END
                ),
                null
            ) properties
        FROM relevant_nodes
        left join ${PROPERTIES_TABLE} prop  on prop.node_id  = relevant_nodes.id 
        group by relevant_nodes.id, prop.node_id
    ),
    node_containments AS (
        SELECT    
            n1.id ,
            array_remove(
                array_agg(
                    CASE 
                        WHEN con.containment_key IS NOT NULL THEN
                            jsonb_build_object(
                                'containment',
                                json_build_object(
                                    'version', con.containment_version,
                                    'language', con.containment_language,
                                    'key', con.containment_key
                                ),     
                                'children', con.children
                            )
                        WHEN TRUE THEN
                            null
                    END
                ),
                null
            )
        containments
        FROM node_properties n1
        LEFT JOIN ${CONTAINMENTS_TABLE} con  ON con.node_id  = n1.id 
        group by n1.id, con.node_id
    ),
    node_references AS (
        SELECT    
            n1.id ,
            array_remove(array_agg(
                CASE 
                    WHEN rref.reference_key IS NOT NULL THEN
                        jsonb_build_object(
                            'reference',
                                json_build_object(
                                    'version', rref.reference_version,
                                    'language', rref.reference_language,
                                    'key', rref.reference_key
                                ),     
                              'targets', rref.targets
                          )
                    WHEN TRUE THEN
                        null
                END), null)        rreferences
        from node_properties n1
        left join ${REFERENCES_TABLE} rref  on rref.node_id  = n1.id 
        group by n1.id, rref.node_id
    )

select 
    relevant_nodes.id,
    jsonb_build_object(
            'key', relevant_nodes.classifier_key,
            'language', relevant_nodes.classifier_language,
            'version', relevant_nodes.classifier_version) classifier,
    relevant_nodes.parent,
    array_to_json(prop.properties) properties,
    array_to_json(containments) containments,
    array_to_json(rreferences) references,
    annotations annotations
from relevant_nodes
left join node_properties prop on prop.id = relevant_nodes.id
left join node_containments con on con.id = relevant_nodes.id
left join node_references rref on rref.id = relevant_nodes.id
`
}

export const QueryNodeForIdList = (nodeid: string[]): string => {
    const sqlNodeCollection = sqlArrayFromNodeIdArray(nodeid)
    return nodesForQueryQuery(`SELECT * FROM ${NODES_TABLE} WHERE id IN ${sqlNodeCollection}\n`)
}

/**
 * Query that will recursively get all child (ids) of all nodes in _nodeIdList_
 * Note that annotations are also considered children for this method.
 * This works ok because we use the _parent_ column to find the children, not the containment or annotation.
 * @param nodeidlist
 * @param depthLimit
 */
export const makeQueryNodeTreeForIdList = (nodeidlist: string[], depthLimit: number): string => {
    const sqlArray = sqlArrayFromNodeIdArray(nodeidlist)
    return `-- Recursively retrieve node tree
            WITH RECURSIVE tmp AS (
                SELECT id, parent, 0 as depth
                FROM ${NODES_TABLE}
                WHERE id IN ${sqlArray}    
                UNION
                    SELECT nn.id, nn.parent, tmp.depth + 1
                    FROM ${NODES_TABLE} as nn
                    INNER JOIN tmp ON tmp.id = nn.parent
                    WHERE tmp.depth < ${depthLimit} -- AND nn.id NOT in ${"otherArray"}
            )
            SELECT * FROM tmp;
    `
}
