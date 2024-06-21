import {
    HttpSuccessCodes,
    QueryReturnType,
    removeNewlinesBetween$$,
    RepositoryData
} from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";
import { dropSchema, initSchemaWithHistory, initSchemaWithoutHistory, listSchemas } from "../tools/index.js";

export type ListRepositoriesResult = {
    schema_name: string
}[]

/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {

    done: boolean = false
    
    constructor(private ctx: DbAdminApiContext) {
    }

    async deleteRepository(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const queryResult = await this.ctx.dbConnection.queryWithoutRepository(dropSchema(repositoryData.repository) )
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }

    async listRepositories(): Promise<QueryReturnType<ListRepositoriesResult>> {
        const queryResult = await this.ctx.dbConnection.queryWithoutRepository(listSchemas() )
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: queryResult as ListRepositoriesResult,
        }
    }

    async createRepository(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const schemaSql = initSchemaWithHistory(repositoryData.repository)
        const sql = removeNewlinesBetween$$(schemaSql)
        const queryResult = await this.ctx.dbConnection.queryWithoutRepository(sql)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
    }

    async createRepositoryWithoutHistory(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const schemaSql = initSchemaWithoutHistory(repositoryData.repository)
        const sql = removeNewlinesBetween$$(schemaSql)
        const queryResult = await this.ctx.dbConnection.queryWithoutRepository(sql)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult),
        }
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

            // const queryResult = this.ctx.postgresConnectionWithoutDatabase.query(sql)
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
