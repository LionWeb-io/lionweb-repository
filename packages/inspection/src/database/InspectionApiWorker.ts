import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"

export interface LanguageNodes {
    language: string,
    ids: [string]
}

export interface ClassifierNodes {
    language: string,
    classifier: string,
    ids: [string]
}

/**
 * Implementations of the additional non-LionWeb methods for inspection the content of the repository.
 */
export class InspectionApiWorker {

    constructor(private dbConnection: pgPromise.IDatabase<object, pg.IClient>) {
    }

    async nodesByLanguage(sql: string) {
        return (await this.dbConnection.query(sql) as [object]).map(el => {
            return {
                "language": el["classifier_language"],
                "ids": el["ids"].split(",")
            } as LanguageNodes
        })
    }

    async nodesByClassifier(sql: string) {
        return (await this.dbConnection.query(sql) as [object]).map(el => {
            return {
                "language": el["classifier_language"],
                "classifier": el["classifier_key"],
                "ids": el["ids"].split(",")
            } as ClassifierNodes
        })
    }
}

export function createInspectionApiWorker(dbConnection: pgPromise.IDatabase<object, pg.IClient>) {
    INSPECTION_WORKER = new InspectionApiWorker(dbConnection);
}

export let INSPECTION_WORKER: InspectionApiWorker
