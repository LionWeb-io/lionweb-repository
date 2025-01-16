import { RepositoryData } from "@lionweb/repository-common"
import { InspectionContext } from "../main.js"

export interface LanguageNodes {
    language: string
    ids: [string]
    size: number
}

/**
 * This should contain all the Node IDs for a certain classifier, provided they are not higher than
 * MAX_NUMBER_OF_IDS. If that is the case we do not set the IDs and set the flag tooMany to true.
 */
export interface ClassifierNodes {
    language: string
    classifier: string
    ids: [string]
    size: number
}

/**
 * Implementations of the additional non-LionWeb methods for inspection the content of the repository.
 */
export class InspectionApiWorker {
    constructor(private context: InspectionContext) {}

    async nodesByLanguage(repositoryData: RepositoryData, sql: string) {
        return ((await this.context.dbConnection.query(repositoryData, sql)) as [object]).map(el => {
            // @ts-expect-error TS7503
            const ids = el["ids"].split(",")
            return {
                // @ts-expect-error TS7503
                language: el["language"],
                ids: ids,
                size: ids.length
            } as LanguageNodes
        })
    }

    async nodesByClassifier(repositoryData: RepositoryData, sql: string) {
        return ((await this.context.dbConnection.query(repositoryData, sql)) as [object]).map(el => {
            // @ts-expect-error TS7503
            const ids = el["ids"].split(",")
            return {
                // @ts-expect-error TS7503
                language: el["language"],
                // @ts-expect-error TS7503
                classifier: el["key"],
                ids: ids,
                size: ids.length
            } as ClassifierNodes
        })
    }
}

export function createInspectionApiWorker(context: InspectionContext) {
    return new InspectionApiWorker(context)
}
