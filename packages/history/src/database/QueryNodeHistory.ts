export function sqlArrayFromNodeIdArray(strings: string[]): string {
    return `(${strings.map(id => `'${id}'`).join(", ")})`
}

export function postgresArrayFromStringArray(strings: string[]): string {
    return `{${strings.map(id => `"${id}"`).join(", ")}}`
}

/**
 * Query to retrieve the full LionWeb nodes from the database.
 * @param nodeid string[] The node ids for which the full node needs to be retrieved.
 * @constructor
 */
export const QueryNodeForIdList = (nodeid: string[], repoVersion: number): string => {
    const sqlNodeCollection = sqlArrayFromNodeIdArray(nodeid)
    return `-- get full nodes from node id's
WITH nodes_for_version AS (
    SELECT * FROM nodesForVersion(${repoVersion})
),
 
    node_properties AS ( 
        SELECT
            n1.id ,
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
        FROM nodes_for_version n1 
        LEFT JOIN propertiesForVersion(${repoVersion}) prop  on prop.node_id  = n1.id 
        where n1.id IN ${sqlNodeCollection}
        group by n1.id, prop.node_id
    ),
    node_containments AS (
        select    
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
        FROM nodes_for_version n1
        LEFT JOIN containmentsForVersion(${repoVersion}) con  on con.node_id  = n1.id 
        WHERE n1.id IN ${sqlNodeCollection}
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
        FROM nodes_for_version n1
        LEFT JOIN referencesForVersion(${repoVersion}) rref  on rref.node_id  = n1.id 
        WHERE n1.id IN ${sqlNodeCollection}
        GROUP BY n1.id, rref.node_id
    )

SELECT 
    nodes_for_version.id,
    jsonb_build_object(
            'key', classifier_key,
            'language', classifier_language,
            'version', classifier_version) classifier,
    parent,
    array_to_json(prop.properties) properties,
    array_to_json(containments) containments,
    array_to_json(rreferences) references,
    annotations annotations
FROM nodes_for_version
LEFT JOIN node_properties prop on prop.id = nodes_for_version.id
LEFT JOIN node_containments con on con.id = nodes_for_version.id
LEFT JOIN node_references rref on rref.id = nodes_for_version.id
WHERE nodes_for_version.id IN ${sqlNodeCollection}

    `
}

/**
 * Query that will recursively get all child (ids) of all nodes in _nodeIdList_
 * Note that annotations are also considered children for this method.
 * This works ok because we use the _parent_ column to find the children, not the containment or annotation.
 * @param nodeidlist
 * @param depthLimit
 */
export const makeQueryNodeTreeForIdList = (nodeidlist: string[], depthLimit: number, repoVersion: number): string => {
    const sqlArray = sqlArrayFromNodeIdArray(nodeidlist)
    return `-- Recursively retrieve node tree
            WITH nodes AS (
                SELECT * FROM nodesForVersion(${repoVersion})
            ),
            RECURSIVE tmp AS (
                SELECT id, parent, 0 as depth
                FROM nodes
                WHERE id IN ${sqlArray}    
                UNION
                    SELECT nn.id, nn.parent, tmp.depth + 1
                    FROM nodes as nn
                    INNER JOIN tmp ON tmp.id = nn.parent
                    WHERE tmp.depth < ${depthLimit} -- AND nn.id NOT in ${"otherArray"}
            )
            SELECT * FROM tmp;
    `
}
