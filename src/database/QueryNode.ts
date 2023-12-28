export function sqlArrayFromStringArray(strings: string[]): string {
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
export const QueryNodeForIdList = (nodeid: string[]): string => {
    const sqlNodeCollection = sqlArrayFromStringArray(nodeid)
    const query = `
WITH 
    node_properties AS ( 
        SELECT
            id ,
--            array_remove(array_agg(jsonb_build_object('property', prop.property, 'value', prop.value)), null) properties
            array_remove(
                array_agg(
                    JSON_OBJECT(
                        'property': prop.property,
                        'value': prop.value ABSENT ON NULL
                        RETURNING JSONB
                    )
                ),
                '{}'
            ) properties
        FROM lionweb_nodes n1 
        left join lionweb_properties prop  on prop.node_id  = n1.id 
        where n1.id IN ${sqlNodeCollection}
        group by n1.id, prop.node_id
    ),
    node_containments AS (
        select    
            n1.id ,
            array_remove(array_agg(
                CASE 
                    WHEN con.containment IS NOT NULL THEN
                        jsonb_build_object('containment', con.containment, 'children', con.children)
                    WHEN TRUE THEN
                        null
                END), null)        containments
        from lionweb_nodes n1
        left join lionweb_containments con  on con.node_id  = n1.id 
        where n1.id IN ${sqlNodeCollection}
        group by n1.id, con.node_id
    ),
    node_references AS (
        select    
            n1.id ,
            array_remove(array_agg(
                CASE 
                    WHEN rref.lw_reference IS NOT NULL THEN
                        jsonb_build_object('reference', rref.lw_reference, 'targets', rref.targets)
                    WHEN TRUE THEN
                        null
                END), null)        rreferences
        from lionweb_nodes n1
        left join lionweb_references rref  on rref.node_id  = n1.id 
        where n1.id IN ${sqlNodeCollection}
        group by n1.id, rref.node_id
    )

select 
    lionweb_nodes.id,
    jsonb_build_object(
            'key', lionweb_nodes.classifier_key,
            'language', lionweb_nodes.classifier_language,
            'version', lionweb_nodes.classifier_version) classifier,
    lionweb_nodes.parent,
    array_to_json(prop.properties) properties,
    array_to_json(containments) containments,
    array_to_json(rreferences) references,
    annotations annotations
from lionweb_nodes
left join node_properties prop on prop.id = lionweb_nodes.id
left join node_containments con on con.id = lionweb_nodes.id
left join node_references rref on rref.id = lionweb_nodes.id
where lionweb_nodes.id IN ${sqlNodeCollection}
group by lionweb_nodes.id, prop.id, con.id, prop.properties, containments, rreferences

    `
    // console.log("QueryNodeForIdList: " + query);
    return query
}

/**
 * Query that will recursively get all child (ids) of all nodes in _nodeIdList_
 * Note that annotations are also considered children for this method.
 * This works ok because we use the _parent_ column to find the children, not the containment or annotation.
 * @param nodeidlist
 * @param depthLimit
 */
export const queryNodeTreeForIdList = (nodeidlist: string[], depthLimit: number): string => {
    const sqlArray = sqlArrayFromStringArray(nodeidlist)
    const query = `
WITH RECURSIVE tmp AS (
    SELECT id, parent, 0 as depth
    FROM lionweb_nodes
--  No need, using parent instead
--  LEFT JOIN (SELECT children, node_id FROM lionweb_containments) con ON con.node_id = id
    WHERE id IN ${sqlArray}    
    UNION
        SELECT nn.id, nn.parent, tmp.depth + 1
        FROM lionweb_nodes as nn
        INNER JOIN tmp ON tmp.id = nn.parent
        WHERE tmp.depth < ${depthLimit} -- AND nn.id NOT in ${"otherArray"}
)
SELECT * FROM tmp;
    `
    return query
}
