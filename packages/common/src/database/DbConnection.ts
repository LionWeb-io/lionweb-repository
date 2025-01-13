import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import {dbLogger, LionWebVersion, requestLogger, traceLogger} from "../apiutil/index.js"
import { Pool } from "pg"
import { LionWebTask } from "./LionWebTask.js"

/**
 * Data determining the repository and user for which a command should be executed.
 */
export type RepositoryData = {
    clientId: string
    repository: RepositoryInfo
}

export type RepositoryInfo = {
    repository_name: string
    schema_name: string
    history: boolean
    lionweb_version: LionWebVersion
    created?: string
}

/**
 * Adds a SET search_path in from of the query to make it work in the context of the schema of the repository requested.
 * @param query             The query to adapt
 * @param repositoryData    The data of the repository on which the query should work
 */
export function addRepositorySchema(query: string, repositoryData: RepositoryData) {
    if (!query.startsWith("SET search_path TO")) {
        query =
            `SET search_path TO '${repositoryData.repository.schema_name}', 'public';
                select public.existsschema('${repositoryData.repository.schema_name}'::text);\n` + query
    }
    return query
}

/**
 * All database queries will go through an instance of this class.
 * This enables logging, but also tweaking queries  when needed.
 * Current tweak: add the repository schema for each query
 */
export class DbConnection {
    postgresConnection: pgPromise.IDatabase<object, pg.IClient>
    dbConnection: pgPromise.IDatabase<object, pg.IClient>
    private _pgp: pgPromise.IMain<object, pg.IClient>
    pgPool: Pool
    transactionMode: object

    set pgp(value: pgPromise.IMain<object, pg.IClient>) {
        this._pgp = value
    }

    get pgp() {
        return this._pgp
    }

    static instance: DbConnection
    static getInstance(): DbConnection {
        if (DbConnection.instance === undefined) {
            DbConnection.instance = new DbConnection()
        }
        return DbConnection.instance
    }
    private constructor() {}

    async queryWithoutRepository(query: string) {
        traceLogger.info("DbConnection.queryWithoutRepository")
        return await this.dbConnection.query(query)
    }

    /**
     * @see  pgPromise.IDatabase.none
     * @param repositoryData
     * @param query
     */
    async none(repositoryData: RepositoryData, query: string) {
        traceLogger.info("DbConnection.none")
        query = addRepositorySchema(query, repositoryData)
        dbLogger.debug({ query: query.split("\n", 500) })
        return await this.dbConnection.none(query)
    }

    /**
     * @see  pgPromise.IDatabase.query
     * @param repositoryData
     * @param query
     */
    async query(repositoryData: RepositoryData, query: string) {
        traceLogger.info("DbConnection.query")
        query = addRepositorySchema(query, repositoryData)
        dbLogger.debug({ query: query.split("\n", 500) })
        return await this.dbConnection.query(query)
    }

    /**
     * @see  pgPromise.IDatabase.multi
     * @param repositoryData
     * @param query
     */
    async multi(repositoryData: RepositoryData, query: string) {
        traceLogger.info("DbConnection.multi")
        query = addRepositorySchema(query, repositoryData)
        const multiResult = await this.dbConnection.multi(query)
        // Remove first two elements since these are the result of the inserted search_path and schema existence check
        multiResult.shift()
        multiResult.shift()
        return multiResult
    }

    /**
     * @see  pgPromise.IDatabase.one
     * @param repositoryData
     * @param query
     */
    async one(repositoryData: RepositoryData, query: string) {
        traceLogger.info("DbConnection.one")
        query = addRepositorySchema(query, repositoryData)
        dbLogger.debug({ query: query.split("\n", 500) })
        return await this.dbConnection.one(query)
    }

    /**
     * @see  IBaseProtocol.tx
     */
    async tx<T>(body: (tsk: LionWebTask) => Promise<T>): Promise<T> {
        traceLogger.info("DbConnection.tx start with mode " + JSON.stringify(this.transactionMode))
        try {
            return await this.dbConnection.tx({ mode: this.transactionMode as never }, async task => {
                const tsk = new LionWebTask(task)
                traceLogger.info("DbConnection.tx return ")
                return await body(tsk)
            })
        } catch (e) {
            requestLogger.info("DbConnection.tx TRANSACTION ERROR " + JSON.stringify(e))
            throw e
        }
    }
}
