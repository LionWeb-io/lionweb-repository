import pgPromise from "pg-promise"
import { traceLogger } from "../apiutil/index.js"
import { addRepositorySchema, RepositoryData } from "./DbConnection.js"

/**
 * All database transactions will go through an instance of this class.
 * This enables logging, but also tweaking queries when needed.
 * Current tweak: add the repository schema for each query
 *
 * This is a wrapper for a pg-promise task.
 * @see pgPromise.ITask
 */
export class LionWebTask {
    task: pgPromise.ITask<object> & object

    /**
     * Create a LionWebTask wrapped around a pg-promise task
     * @param task The pg-promise task that is doing the actual work
     */
    constructor(task: pgPromise.ITask<object> & object) {
        this.task = task
    }

    /**
     * @see IBaseProtocol.query
     * @param repositoryData
     * @param query
     */
    async query(repositoryData: RepositoryData, query: string) {
        traceLogger.info("LionWebTask.query")
        query = addRepositorySchema(query, repositoryData)
        return await this.task.query(query)
    }

    async queryWithoutRepository(query: string) {
        traceLogger.info("LionWebTask.queryWithoutRepository")
        return await this.task.query(query)
    }

    /**
     * @see IBaseProtocol.many
     * @param repositoryData
     * @param query
     */
    async many(repositoryData: RepositoryData, query: string) {
        traceLogger.info("LionWebTask.many")
        query = addRepositorySchema(query, repositoryData)
        return await this.task.many(query)
    }

    /**
     * @see IBaseProtocol.multi
     * @param repositoryData
     * @param query
     */
    async multi(repositoryData: RepositoryData, query: string) {
        traceLogger.info("LionWebTask.multi")
        query = addRepositorySchema(query, repositoryData)
        const multiResult = await this.task.multi(query)
        // Remove first two elements since these are the result of the inserted search_path and schema existence check
        multiResult.shift()
        multiResult.shift()
        return multiResult
    }
}
