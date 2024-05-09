import { HttpSuccessCodes, QueryReturnType } from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";

/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    constructor(private ctx: DbAdminApiContext) {
    }

    async init(sql: string): Promise<QueryReturnType<string>> {
        // const q = this.ctx.pgp.helpers.concat([sql])
        const queryResult = await this.ctx.dbConnection.query(sql.replace("\n", " "))
        return { 
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }
}
