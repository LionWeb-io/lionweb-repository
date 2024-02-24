import { QueryReturnType } from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";

/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    constructor(private ctx: DbAdminApiContext) {
    }

    async init(sql: string): Promise<QueryReturnType<string>> {
        const queryResult = await this.ctx.dbConnection.query(sql)
        return { 
            status: 200,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }
}
