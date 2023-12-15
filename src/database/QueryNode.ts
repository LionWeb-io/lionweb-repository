export function sqlArrayFromStringArray(strings: string[]): string {
    return `(${strings.map(id => `'${id}'`).join(", ")})`
}
export function postgresArrayFromStringArray(strings: string[]): string {
    return `{${strings.map(id => `"${id}"`).join(", ")}}`
}

export const QueryNodeForIdList = (nodeid: string[]): Object => {
    const sqlNodeCollection = sqlArrayFromStringArray(nodeid)
    const query = `
WITH 
    node_properties AS ( 
        SELECT
            id ,
            array_remove(array_agg(jsonb_build_object('property', prop.property, 'value', prop.value)), null) properties
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
    array_to_json(rreferences) references
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

export const queryNodeTreeForIdList = (nodeidlist: string[], depthLimit: number): string => {
    const sqlArray = sqlArrayFromStringArray(nodeidlist)
    const query = `
WITH RECURSIVE tmp AS (
    SELECT id, parent, 0 as depth -- , con.children
    FROM lionweb_nodes
    LEFT JOIN (SELECT children, node_id FROM lionweb_containments) con ON con.node_id = id
    WHERE id IN ${sqlArray}
    UNION
        SELECT nn.id, nn.parent, tmp.depth + 1 -- , con.children
        FROM lionweb_nodes as nn
        INNER JOIN tmp ON tmp.id = nn.parent
        WHERE tmp.depth < ${depthLimit}
)
SELECT * FROM tmp;
    `
    // console.log("queryNodeTreeForIdList: " + query);
    return query
}
