import { nodesForQueryQuery } from "./QueryNode.js"

export function sqlArrayFromNodeIdArray(strings: string[]): string {
    return `(${strings.map(id => `'${id}'`).join(", ")})`
}

export function postgresArrayFromStringArray(strings: string[]): string {
    return `{${strings.map(id => `"${id}"`).join(", ")}}`
}

export const retrieveWith = (nodeid: string[], depthLimit: number): string => {
    const sqlArray = sqlArrayFromNodeIdArray(nodeid)
    return nodesForQueryQuery(`--
            WITH RECURSIVE tmp AS (
                SELECT id, parent, 0 as depth
                FROM lionweb_nodes
                WHERE id IN ${sqlArray}    
                UNION
                    SELECT nn.id, nn.parent, tmp.depth + 1
                    FROM lionweb_nodes as nn
                    INNER JOIN tmp ON tmp.id = nn.parent
                    WHERE tmp.depth < ${depthLimit}
            )
            SELECT * FROM lionweb_nodes as nodesTable
            WHERE nodesTable.id IN (SELECT id FROM tmp)
    `)
}
