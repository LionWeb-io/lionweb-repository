import { METAPOINTERS_TABLE, NODES_TABLE } from "@lionweb/repository-common"

/**
 * Database functions.
 */
export class InspectionQueries {
    constructor() {}

    nodesByClassifier(): string {
        return `select mp.language as language, mp.key as key, string_agg(n.id, ',') AS ids from ${NODES_TABLE} n
left join ${METAPOINTERS_TABLE} mp ON mp.id = classifier
group by mp.language, mp.key;`
    }

    nodesByLanguage(): string {
        return `select mp.language as language, string_agg(n.id, ',') AS ids from ${NODES_TABLE} n
left join ${METAPOINTERS_TABLE} mp ON mp.id = classifier
group by mp.language;`
    }
}
