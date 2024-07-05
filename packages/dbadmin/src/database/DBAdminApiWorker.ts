import { HttpSuccessCodes, QueryReturnType, removeNewlinesBetween$$, RepositoryData } from "@lionweb/repository-common"
import { DbAdminApiContext } from "../main.js"
import {
    CREATE_DATABASE_SQL,
    CREATE_GLOBALS_SQL,
    dropSchema,
    initSchemaWithHistory,
    initSchemaWithoutHistory,
    listSchemas
} from "../tools/index.js"

export type ListRepositoriesResult = {
    schema_name: string
}[]

/**
 * Implementations of the additional non-LionWeb methods for DB Administration.
 */
export class DBAdminApiWorker {
    done: boolean = false

    constructor(private ctx: DbAdminApiContext) {}

    async deleteRepository(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const queryResult = await this.ctx.dbConnection.queryWithoutRepository(dropSchema(repositoryData.repository))
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult)
        }
    }

    async listRepositories(): Promise<QueryReturnType<ListRepositoriesResult>> {
        const queryResult = await this.ctx.dbConnection.queryWithoutRepository(listSchemas())
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: queryResult as ListRepositoriesResult
        }
    }

    async createRepository(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const schemaSql = initSchemaWithHistory(repositoryData.repository)
        const sql = removeNewlinesBetween$$(schemaSql)
        const queryResult = await this.ctx.dbConnection.queryWithoutRepository(sql)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult)
        }
    }

    async createRepositoryWithoutHistory(repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const schemaSql = initSchemaWithoutHistory(repositoryData.repository)
        const sql = removeNewlinesBetween$$(schemaSql)
        const queryResult = await this.ctx.dbConnection.queryWithoutRepository(sql)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult)
        }
    }

    async createDatabase(): Promise<QueryReturnType<string>> {
        console.log("About to create database")
        const sql = CREATE_DATABASE_SQL
        if (!this.done) {
            console.log("create database - not done")
            // split the file into separate statements
            const statements = sql.split(/;\s*$/m)
            for (const statement of statements) {
                if (statement.length > 3) {
                    // execute each of the statements
                    await this.ctx.postgresConnection.none(statement)
                }
            }
            // Add the global functions to the public schema
            console.log("create database - about to query")
            await this.ctx.dbConnection.query({ clientId: "Repository", repository: "public" }, removeNewlinesBetween$$(CREATE_GLOBALS_SQL))
            console.log("create database - query executed")
            return {
                status: HttpSuccessCodes.Ok,
                query: sql,
                queryResult: "{}"
            }
        } else {
            console.log("create database - Done")
            return {
                status: HttpSuccessCodes.Ok,
                query: sql,
                queryResult: "{}"
            }
        }
    }
}
