import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"


/**
 * Implementations of the additional non-LionWeb methods for inspection the content of the repository.
 */
export class InspectionApiWorker {

    constructor(private dbConnection: pgPromise.IDatabase<object, pg.IClient>) {
    }

    async nodesByLanguage(sql: string) {
        return await this.dbConnection.query(sql)
    }

    async nodesByClassifier(sql: string) {
        return await this.dbConnection.query(sql)
    }
}

export function createInspectionApiWorker(dbConnection: pgPromise.IDatabase<object , pg.IClient>) {
    INSPECTION_WORKER = new InspectionApiWorker(dbConnection);
}

export let INSPECTION_WORKER: InspectionApiWorker
