import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"


/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    constructor(private dbConnection: pgPromise.IDatabase<{ } , pg.IClient>) {
    }

    async init(sql: string) {
        return await this.dbConnection.query(sql)
    }
}

export function createDBAdminApiWorker(dbConnection: pgPromise.IDatabase<{ } , pg.IClient>) : DBAdminApiWorker {
    return new DBAdminApiWorker(dbConnection);
}
