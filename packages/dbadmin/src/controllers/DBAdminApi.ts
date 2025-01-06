import e, { Request, Response } from "express"
import {
    getRepositoryParameter,
    HttpSuccessCodes,
    // RepositoryData,
    lionwebResponse,
    getClientIdParameter,
    getHistoryParameter,
    QueryReturnType,
    ListRepositoriesResponse,
    SCHEMA_PREFIX,
    requestLogger,
    getLionWebVersionParameter,
    isParameterError,
    ListPartitionsResponse,
    HttpClientErrors,
    getClientLog,
    LionWebTask,
    RepositoryData
} from "@lionweb/repository-common"
import { getRepositoryData, repositoryStore } from "../database/index.js";
import { DbAdminApiContext } from "../main.js"

export interface DBAdminApi {
    /**
     * Create a new database to store repositories
     * @param request
     * @param response
     */
    databaseExists(request: Request, response: Response): void

    /**
     * Create a new database to store repositories
     * @param request
     * @param response
     */
    createDatabase(request: Request, response: Response): void

    /**
     * Create a new repository
     * @param request  _clientId_, _repository_
     * @param response
     */
    createRepository(request: Request, response: Response): void

    /**
     * Delete a repository
     * @param request  _clientId_, _repository_
     * @param response
     */
    deleteRepository(request: Request, response: Response): void

    /**
     * Get a list of existing repositories
     * @param request
     * @param response
     */
    listRepositories(request: Request, response: Response): void
}

export class DBAdminApiImpl implements DBAdminApi {
    constructor(private ctx: DbAdminApiContext) {}

    databaseExists = async (request: e.Request, response: e.Response) => {
        requestLogger.info(` * databaseExists request received, with body of ${request.headers["content-length"]} bytes`)
        await this.ctx.dbAdminApiWorker.databaseExists()
        lionwebResponse(response, HttpSuccessCodes.Ok, {
            success: true,
            messages: []
        })
    }

    createDatabase = async (request: e.Request, response: e.Response) => {
        requestLogger.info(` * createDatabase request received, with body of ${request.headers["content-length"]} bytes`)
        await this.ctx.dbAdminApiWorker.createDatabase()
        lionwebResponse(response, HttpSuccessCodes.Ok, {
            success: true,
            messages: []
        })
    }

    createRepository = async (request: e.Request, response: e.Response) => {
        requestLogger.info(` * createRepository request received, with body of ${request.headers["content-length"]} bytes params: ${JSON.stringify(request.query)}`)
        const clientId = getClientIdParameter(request)
        const repositoryName = getRepositoryParameter(request)
        const lionWebVersion = getLionWebVersionParameter(request)
        if (isParameterError(clientId)) {
            lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                chunk: null,
                messages: [clientId.error]
            })
        } else if (isParameterError(repositoryName)) {
            lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                chunk: null,
                messages: [repositoryName.error]
            })
        } else if (isParameterError(lionWebVersion)) {
            lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                chunk: null,
                messages: [lionWebVersion.error]
            })
        } else {
            // Request is correct, fist check whether repo already exists
            const existingRepo = repositoryStore.getRepository(repositoryName)
            if (existingRepo !== undefined) {
                lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                    success: false,
                    chunk: null,
                    messages: [{ kind: "RepositoryExists", message: `Cannot create repository ${repositoryName}, because it already exists: ${JSON.stringify(existingRepo)}` }]
                })
                return
            }
            // Now just create it
            const history = getHistoryParameter(request)
            const repositoryData: RepositoryData = {
                clientId: clientId,
                repository: {
                    repository_name: repositoryName,
                    schema_name: SCHEMA_PREFIX + repositoryName,
                    history: history,
                    lionweb_version: lionWebVersion
                }
            }
            let result: QueryReturnType<string>
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                result = await this.ctx.dbAdminApiWorker.createRepository(task, repositoryData)
            })
            // Update repository info table
            const repoInfoTable = await this.ctx.dbConnection.queryWithoutRepository(`SELECT public.createRepositoryInfo('${repositoryData.repository.repository_name}'::text, '${repositoryData.repository.schema_name}'::text, '${repositoryData.repository.lionweb_version}'::text, '${history}'::boolean);\n`)
            await repositoryStore.refresh()
            lionwebResponse(response, result.status, {
                success: result.status === HttpSuccessCodes.Ok,
                messages: [{ kind: "Info", message: result.queryResult }]
            })
        }
    }

    listRepositories = async (request: Request, response: Response) => {
        requestLogger.info(` * listRepositories request received, with body of ${request.headers["content-length"]} bytes. ${getClientLog(request)}`)
        const result = await this.ctx.dbAdminApiWorker.listRepositories()
        // select schemas that represent a repository, make sure to remove the SCHEMA_PREFIX
        const repoNames = result.queryResult
            .filter(repo => repo.schema_name.startsWith(SCHEMA_PREFIX))
            .map(repo => repo.schema_name.substring(SCHEMA_PREFIX.length))
        lionwebResponse<ListRepositoriesResponse>(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            repositoryNames: repoNames,
            messages: []
        })
    }

    deleteRepository = async (request: e.Request, response: e.Response): Promise<void> => {
        requestLogger.info(` * deleteRepository request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData = getRepositoryData(request)
        if (isParameterError(repositoryData)) {
            lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                chunk: null,
                messages: [repositoryData.error]
            })
        } else if (repositoryData.repository === undefined) {
            requestLogger.info("========== " + `Repository ${getRepositoryParameter(request)} not found`)
            lionwebResponse<ListPartitionsResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                chunk: null,
                messages: [{kind: "RepositoryNotFound", message: `Repository ${getRepositoryParameter(request)} not found`}]
            })
        } else {
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                const result = await this.ctx.dbAdminApiWorker.deleteRepository(task, repositoryData)
                // Recalculate the repo store
                lionwebResponse(response, result.status, {
                    success: result.status === HttpSuccessCodes.Ok,
                    messages: [{ kind: "Info", message: result.queryResult }]
                })
            })
            // Update repository info table
            const tmp = await this.ctx.dbConnection.queryWithoutRepository(`SELECT public.deleteRepositoryInfo('${repositoryData.repository.repository_name}'::text);\n`)
            requestLogger.info(`--------- k${JSON.stringify(tmp)}`)

            repositoryStore.initialized = false
                await repositoryStore.initialize()
        }
    }
}
