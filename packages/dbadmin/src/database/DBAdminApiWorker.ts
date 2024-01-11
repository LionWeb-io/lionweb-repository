import pgPromise from "pg-promise"

/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    constructor(private dbConnection: pgPromise.IDatabase<object>) {
    }

    async init(sql: string) {
        return await this.dbConnection.query(sql)
    }
}

export function createDBAdminApiWorker(dbConnection: pgPromise.IDatabase<object>) {
    DB_ADMIN_WORKER = new DBAdminApiWorker(dbConnection);
}

export let DB_ADMIN_WORKER: DBAdminApiWorker
