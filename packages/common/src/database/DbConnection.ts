import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js";

/**
 * Data determining the repository and user for which a command should be executed.
 */
export type RepositoryData = {
    clientId: string
    repository: string
}

/**
 * Adds a SET search_path in from of the query to make it work in the context of the schema of the repository requested.
 * @param query             The query to adapt
 * @param repositoryData    The data of the repository on which the query should work
 */
function addRepositorySchema(query: string, repositoryData: RepositoryData) {
    if (!query.startsWith("SET search_path TO")) {
        query = `SET search_path TO "${repositoryData.repository}";\n` + query
    }
    return query
}

/**
 * All database queries will go through an instance of this class.
 * This enables logging, but also tweaking queries (as in _addRepositorySchema(...)_  when needed.
 */
export class DbConnection {
    postgresConnection: pgPromise.IDatabase<object, pg.IClient>
    dbConnection: pgPromise.IDatabase<object, pg.IClient>
    pgp: pgPromise.IMain<object, pg.IClient>
    
    static instance: DbConnection
    static getInstance(): DbConnection {
        if (DbConnection.instance === undefined) {
            DbConnection.instance = new DbConnection()
        }
        return DbConnection.instance
    }
    private constructor() {
    }

    async queryWithoutRepository(query: string) {
        return await this.dbConnection.query(query)
    }

    // async createSchema(repositoryData: RepositoryData, query: string) {
    //     return await this.dbConnection.query(query)
    // }
    //
    // async deleteSchema(repositoryData: RepositoryData, query: string) {
    //     return await this.dbConnection.query(query)
    // }
    //
    // async listSchemas(repositoryData: RepositoryData, query: string) {
    //     return await this.dbConnection.query(query)
    // }

    /**
     * @see  pgPromise.IDatabase.query
     * @param repositoryData
     * @param query
     */
    async query(repositoryData: RepositoryData, query: string) {
        query = addRepositorySchema(query, repositoryData)
        console.log("query: ", query)
        return await this.dbConnection.query(query)
    }

    /**
     * @see  pgPromise.IDatabase.multi
     * @param repositoryData
     * @param query
     */
    async multi(repositoryData: RepositoryData, query: string) {
        query = addRepositorySchema(query, repositoryData)
        const multiResult = await this.dbConnection.multi(query)
        // Remove first element since that is the result of the inserted search_path
        multiResult.shift()
        return multiResult
    }

    /**
     * @see  pgPromise.IDatabase.one
     * @param repositoryData
     * @param query
     */
    async one(repositoryData: RepositoryData, query: string) {
        query = addRepositorySchema(query, repositoryData)
        return await this.dbConnection.one(query)
    }

    /**
     * @see  IBaseProtocol.tx
     * @param repositoryData
     * @param query
     */
    async tx<T>( body: (tsk: LionwebTask)  => Promise<T> ): Promise<T> {
        return await this.dbConnection.tx( async task => {
            const tsk = new LionwebTask(task)
            return await body(tsk)
        })
    }
    
}

/**
 * All database transactions will go through an instance of this class.
 * This enables logging, but also tweaking queries when needed.
 */
export class LionwebTask {
    task:  pgPromise.ITask<object> & object

    /**
     * Create a LionWebTask wrapped around a pg-promise task 
     * @param task The pg-promise task that is doing the actual work
     */
    constructor(task:  pgPromise.ITask<object> & object) {
        this.task = task
    }

    /**
     * @see IBaseProtocol.query
     * @param repositoryData
     * @param query
     */
    async query(repositoryData: RepositoryData, query: string) {
        query = addRepositorySchema(query, repositoryData)
        return await this.task.query(query)
    }

    /**
     * @see IBaseProtocol.many
     * @param repositoryData
     * @param query
     */
    async many(repositoryData: RepositoryData, query: string) {
        query = addRepositorySchema(query, repositoryData)
        return await this.task.many(query)
    }

    /**
     * @see IBaseProtocol.multi
     * @param repositoryData
     * @param query
     */
    async multi(repositoryData: RepositoryData, query: string) {
        query = addRepositorySchema(query, repositoryData)
        const multiResult = await this.task.multi(query)
        // Remove first element since that is the result of the inserted search_path
        multiResult.shift()
        return multiResult
   }
}
