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
    LionWebVersion,
    RepositoryData
} from "@lionweb/repository-common"
import { getRepositoryData, repositoryStore } from "../database/index.js"
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
     * @param request  Has parameters: `clientId`, `repository_name`
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

    /**
     * @see DBAdminApi.databaseExists
     * @param request
     * @param response
     */
    databaseExists = async (request: e.Request, response: e.Response) => {
        requestLogger.info(` * databaseExists request received, with body of ${request.headers["content-length"]} bytes`)
        await this.ctx.dbAdminApiWorker.databaseExists()
        lionwebResponse(response, HttpSuccessCodes.Ok, {
            success: true,
            messages: []
        })
    }

    /**
     * @see DBAdminApi.createDatabase
     * @param request
     * @param response
     */
    createDatabase = async (request: e.Request, response: e.Response) => {
        requestLogger.info(` * createDatabase request received, with body of ${request.headers["content-length"]} bytes`)
        await this.ctx.dbAdminApiWorker.createDatabase()
        lionwebResponse(response, HttpSuccessCodes.Ok, {
            success: true,
            messages: []
        })
    }

    /**
     * @see DBAdminApi.createRepository
     * @param request
     * @param response
     */
    createRepository = async (request: e.Request, response: e.Response) => {
        requestLogger.info(
            ` * createRepository request received, with body of ${request.headers["content-length"]} bytes params: ${JSON.stringify(
                request.query
            )}`
        )
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
                    messages: [
                        {
                            kind: "RepositoryExists",
                            message: `Cannot create repository ${repositoryName}, because it already exists: ${JSON.stringify(
                                existingRepo
                            )}`
                        }
                    ]
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
                    lionweb_version: lionWebVersion as LionWebVersion
                }
            }
            let result: QueryReturnType<string>
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                result = await this.ctx.dbAdminApiWorker.createRepository(task, repositoryData)
                await this.ctx.dbAdminApiWorker.addRepositoryToTable(task, repositoryData);
            })
            await repositoryStore.refresh()
            lionwebResponse(response, result.status, {
                success: result.status === HttpSuccessCodes.Ok,
                messages: [{ kind: "Info", message: result.queryResult }]
            })
        }
    }

    /**
     * @see DBAdminApi.listRepositories
     * @param request
     * @param response
     */
    listRepositories = async (request: Request, response: Response) => {
        requestLogger.info(
            ` * listRepositories request received, with body of ${request.headers["content-length"]} bytes. ${getClientLog(request)}`
        )
        lionwebResponse<ListRepositoriesResponse>(response, HttpSuccessCodes.Ok, {
            success: true,
            repositoryNames: Array.from(repositoryStore.repositoryName2repository.keys()),
            messages: []
        })
    }

    /**
     * @see DBAdminApi.deleteRepository
     * @param request
     * @param response
     */
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
                messages: [{ kind: "RepositoryNotFound", message: `Repository ${getRepositoryParameter(request)} not found` }]
            })
        } else {
            await this.ctx.dbConnection.tx(async (task: LionWebTask) => {
                const result = await this.ctx.dbAdminApiWorker.deleteRepository(task, repositoryData)
                // Update repository info table
                await this.ctx.dbConnection.queryWithoutRepository(
                    `SELECT public.deleteRepositoryInfo('${repositoryData.repository.repository_name}'::text);\n`
                )
                await repositoryStore.refresh()
                lionwebResponse(response, result.status, {
                    success: result.status === HttpSuccessCodes.Ok,
                    messages: [{ kind: "Info", message: result.queryResult }]
                })
            })
        }
    }
}
