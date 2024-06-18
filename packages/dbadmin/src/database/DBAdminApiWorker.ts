import {
    HttpSuccessCodes,
    QueryReturnType,
    removeNewlinesBetween$$,
    RepositoryData
} from "@lionweb/repository-common";
import { Request, Response } from "express";
import { DbAdminApiContext } from "../main.js";
import { dropSchema, initSchemaWithHistory, initSchemaWithoutHistory } from "../tools/index.js";

/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    done: boolean = false
    
    constructor(private ctx: DbAdminApiContext) {
    }

    async deleteRepository(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const queryResult = await this.ctx.dbConnectionNew.deleteSchema(repositoryData, dropSchema(repositoryData.repository) )
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }

    async createRepository(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const schemaSql = initSchemaWithHistory(repositoryData.repository)
        const sql = removeNewlinesBetween$$(schemaSql)
        const queryResult = await this.ctx.dbConnectionNew.createSchema(repositoryData, sql)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }

    async createRepositoryWithoutHistory(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const schemaSql = initSchemaWithoutHistory(repositoryData.repository)
        const sql = removeNewlinesBetween$$(schemaSql)
        const queryResult = await this.ctx.dbConnectionNew.createSchema(repositoryData, sql)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async listRepositories (request: Request, response: Response) {
        // TODO
    }

    async createDatabase(sql: string): Promise<QueryReturnType<string>> {
        if (!this.done) {
             // split the file into separate statements
            const statements = sql.split(/;\s*$/m)
            for (const statement of statements) {
                if (statement.length > 3) {
                    // execute each of the statements
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
            return {
                status: HttpSuccessCodes.Ok,
                query: sql,
                queryResult: "{}"
            }
        }
    }
}
