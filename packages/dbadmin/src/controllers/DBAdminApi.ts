import e, { Request, Response } from "express"
import {
    getRepositoryParameter,
    HttpSuccessCodes,
    RepositoryData,
    lionwebResponse,
    getClientIdParameter, getHistoryParameter, QueryReturnType, ListRepositoriesResponse, SCHEMA_PREFIX, removeNewlinesBetween$$, requestLogger
} from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";
import { CREATE_DATABASE_SQL, CREATE_GLOBALS_SQL } from "../tools/index.js";

export interface DBAdminApi {
    /**
     * Create a new database to store repositories
     * @param request
     * @param response
     */
    createDatabase(request: Request, response: Response): void

    /**
     * Initialize the default repository 
     * @param request
     * @param response
     */
    init(request: Request, response: Response): void

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

    constructor(private ctx: DbAdminApiContext) {
    }

    createDatabase = async(request: e.Request, response: e.Response) => {
        requestLogger.info(` * createDatabase request received, with body of ${request.headers["content-length"]} bytes`)
        await this.ctx.dbAdminApiWorker.createDatabase(CREATE_DATABASE_SQL)
        await this.ctx.dbConnection.query({clientId: "Repository", repository: "public"}, removeNewlinesBetween$$(CREATE_GLOBALS_SQL))
        lionwebResponse(response, HttpSuccessCodes.Ok, {
            success: true,
            messages: [ ]
        })
    }

    init = async(request: e.Request, response: e.Response) => {
        requestLogger.info(` * init request received, with body of ${request.headers["content-length"]} bytes`)
        await this.createRepository(request, response)
    }

    createRepository = async(request: e.Request, response: e.Response) => {
        requestLogger.info(` * createRepository request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData: RepositoryData = {clientId: getClientIdParameter(request), repository: getRepositoryParameter(request)}
        const history = getHistoryParameter(request)
        let result: QueryReturnType<string>
        if (history) {
            result = await this.ctx.dbAdminApiWorker.createRepository(repositoryData)
        } else {
            result = await this.ctx.dbAdminApiWorker.createRepositoryWithoutHistory(repositoryData)
        }
        lionwebResponse(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            messages: [ {kind: "Info", message: result.queryResult} ]
        })
    }

    listRepositories = async (request: Request, response: Response)=> {
        requestLogger.info(` * listRepositories request received, with body of ${request.headers["content-length"]} bytes`)
        const result = await this.ctx.dbAdminApiWorker.listRepositories()
        // select schemas that represent a repository, make sure to remove the SCHEMA_PREFIX
        const repoNames = result.queryResult.filter(repo => repo.schema_name.startsWith(SCHEMA_PREFIX)).map(repo => repo.schema_name.substring(SCHEMA_PREFIX.length))
        lionwebResponse<ListRepositoriesResponse>(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            repositoryNames: repoNames,
            messages: []
        })
    }

    deleteRepository = async (request: e.Request, response: e.Response): Promise<void> => {
        requestLogger.info(` * deleteRepository request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData: RepositoryData = {clientId: "Repository", repository: getRepositoryParameter(request)}
        const result = await this.ctx.dbAdminApiWorker.deleteRepository(repositoryData)
        lionwebResponse(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            messages: [ {kind: "Info", message: result.queryResult} ]
        })
    }    
}
