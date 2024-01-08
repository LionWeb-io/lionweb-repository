import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"


/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    constructor(private dbConnection: pgPromise.IDatabase<object, pg.IClient>) {
    }

    async init(sql: string) {
        return await this.dbConnection.query(sql)
    }
}

export function createDBAdminApiWorker(dbConnection: pgPromise.IDatabase<object , pg.IClient>) {
    DB_ADMIN_WORKER = new DBAdminApiWorker(dbConnection);
}

export let DB_ADMIN_WORKER: DBAdminApiWorker
