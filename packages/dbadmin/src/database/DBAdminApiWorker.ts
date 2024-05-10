import { HttpSuccessCodes, QueryReturnType } from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";

/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    done: boolean = false
    
    constructor(private ctx: DbAdminApiContext) {
    }

    async init(sql: string): Promise<QueryReturnType<string>> {
        console.log("DBAdminApiWorker.init: " + sql)
        const queryResult = await this.ctx.dbConnection.query(sql)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }

    async createDatabase(sql: string): Promise<QueryReturnType<string>> {
        if (!this.done) {
            // const q = this.ctx.pgp.helpers.concat([sql])
            console.log(sql)
            // split the file into separate statements
            const statements = sql.split(/;\s*$/m)
            for (const statement of statements) {
                if (statement.length > 3) {
                    // execute each of the statements
                    console.log("STATEMENT " + statement)
                    await this.ctx.postgresConnection.none(statement)
                }
            }

            // const queryResult = this.ctx.postgresConnection.query(sql)
            return {
                status: HttpSuccessCodes.Ok,
                query: sql,
                queryResult: "{}",
            }
        } else {
            console.log("TWICE TRWICE")
            return {
                status: HttpSuccessCodes.Ok,
                query: sql,
                queryResult: "{}"
            }
        }
    }
}
