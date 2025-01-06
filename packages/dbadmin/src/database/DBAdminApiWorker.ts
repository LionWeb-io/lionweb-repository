import {
    HttpSuccessCodes,
    LionWebTask,
    QueryReturnType,
    removeNewlinesBetween$$,
    RepositoryData,
    ServerConfig
} from "@lionweb/repository-common"
import { DbAdminApiContext } from "../main.js"
import {
    CREATE_DATABASE_SQL,
    CREATE_GLOBALS_SQL,
    dropSchema,
    initSchemaWithHistory,
    initSchemaWithoutHistory
} from "../tools/index.js"
import {cleanGlobalPointersMap} from "./MetaPointers.js";

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

    async deleteRepository(task: LionWebTask, repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        const queryResult = await task.queryWithoutRepository(dropSchema(repositoryData.repository.schema_name))
        cleanGlobalPointersMap(repositoryData.repository.repository_name);
        return {
            status: HttpSuccessCodes.Ok,
            query: dropSchema(repositoryData.repository.schema_name),
            queryResult: JSON.stringify(queryResult)
        }
    }

    async createRepository(task: LionWebTask, repositoryData: RepositoryData): Promise<QueryReturnType<string>> {
        cleanGlobalPointersMap(repositoryData.repository.repository_name);
        const schemaSql = (repositoryData.repository.history 
            ? initSchemaWithHistory(repositoryData.repository.schema_name)
            : initSchemaWithoutHistory(repositoryData.repository.schema_name)
        )
        const sql = removeNewlinesBetween$$(schemaSql)
        const queryResult = await task.queryWithoutRepository(sql)
        return {
            status: HttpSuccessCodes.Ok,
            query: "",
            queryResult: JSON.stringify(queryResult)
        }
    }

    async createDatabase(): Promise<QueryReturnType<string>> {
        const sql = CREATE_DATABASE_SQL
        if (!this.done) {
            // split the file into separate statements
            const statements = sql.split(/;\s*$/m)
            for (const statement of statements) {
                if (statement.length > 3) {
                    // execute each of the statements
                    await this.ctx.postgresConnection.none(statement)
                }
            }
            // Add the global functions to the public schema
            await this.ctx.dbConnection.queryWithoutRepository(removeNewlinesBetween$$(CREATE_GLOBALS_SQL))
            return {
                status: HttpSuccessCodes.Ok,
                query: sql,
                queryResult: "{}"
            }
        } else {
            return {
                status: HttpSuccessCodes.Ok,
                query: sql,
                queryResult: "{}"
            }
        }
    }

    async databaseExists(): Promise<QueryReturnType<boolean>> {
        const dbName = ServerConfig.getInstance().pgDb()
        const query = `select exists(SELECT datname FROM pg_catalog.pg_database WHERE '${dbName}' = datname);`
        const exists = await this.ctx.postgresConnection.one(query)
        return { 
            status: HttpSuccessCodes.Ok,
            query: query,
            queryResult: exists.exists as boolean
        }
    }
}
