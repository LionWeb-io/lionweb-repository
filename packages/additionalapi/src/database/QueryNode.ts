import { NODES_TABLE } from "@lionweb/repository-common";

function sqlArrayFromNodeIdArray(strings: string[]): string {
    return `(${strings.map(id => `'${id}'`).join(", ")})`
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
