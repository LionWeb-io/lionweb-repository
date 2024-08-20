import {CONTAINMENTS_TABLE, NODES_TABLE} from "@lionweb/repository-common";
import {AttachPoint} from "./AdditionalQueries.js";
import {FBAttachPoint} from "../io/lionweb/serialization/flatbuffers/index.js";
import {MetaPointersTracker} from "@lionweb/repository-dbadmin";
import {forFBMetapointer} from "./ImportLogic.js";

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

export const makeQueryToCheckHowManyExist = (nodeidlist: Set<string>): string => {
    if (nodeidlist.size === 0) {
        throw new Error("Invalid nodeidlist (it is empty)")
    }
    const ids = Array.from(nodeidlist, id => `'${id}'`).join(",")
    return `SELECT COUNT(*) FROM ${NODES_TABLE} WHERE ID IN (${ids});`
}

export const makeQueryToCheckHowManyDoNotExist = (nodeidlist: Set<string>): string => {
    if (nodeidlist.size === 0) {
        throw new Error("Invalid nodeidlist (it is empty)")
    }
    const ids = Array.from(nodeidlist, id => `'${id}'`).join(",")
    return `SELECT COUNT(*) FROM ${NODES_TABLE} WHERE ID NOT IN (${ids});`
}

export const makeQueryToAttachNode = (attachPoint: AttachPoint, metaPointersTracker: MetaPointersTracker) : string => {
    return `UPDATE ${CONTAINMENTS_TABLE}
            SET "children"=array_append("children", '${attachPoint.root}')
            WHERE node_id = '${attachPoint.container}' AND containment = '${metaPointersTracker.forMetaPointer(attachPoint.containment)}';`
}

export const makeQueryToAttachNodeForFlatBuffers = (attachPoint: FBAttachPoint, metaPointersTracker: MetaPointersTracker) : string => {
    const containment = attachPoint.containment()
    return `UPDATE ${CONTAINMENTS_TABLE} 
            SET "children"=array_append("children", '${attachPoint.root()}')
            WHERE node_id = '${attachPoint.container()}' AND containment = ${forFBMetapointer(metaPointersTracker, containment)};`
}
