import { HttpSuccessCodes, logger, QueryReturnType } from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";

/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    constructor(private ctx: DbAdminApiContext) {
    }

    async init(sql: string): Promise<QueryReturnType<string>> {
        // const q = this.ctx.pgp.helpers.concat([sql])
        logger.requestLog("INIT")
        logger.requestLog(sql)
        logger.requestLog("INIT2")
        logger.requestLog(sql.replaceAll("\n", " "))
        logger.requestLog("INIT3")
        const queryResult = await this.ctx.dbConnection.result(sql.replaceAll("\n", " HELLO JOS "))
        return { 
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }
}
