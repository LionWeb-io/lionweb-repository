import { ListRepositoriesResponse } from "@lionweb/repository-client";
import e, { Request, Response } from "express"
import {
    getRepositoryParameter,
    HttpSuccessCodes,
    RepositoryData,
    lionwebResponse,
    logger,
    getClientIdParameter, getHistoryParameter, QueryReturnType
} from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";
import { CREATE_DATABASE_SQL } from "../tools/index.js";

export interface DBAdminApi {
    createDatabase(request: Request, response: Response): void
    init(request: Request, response: Response): void
    createRepository(request: Request, response: Response): void
    deleteRepository(request: Request, response: Response): void
    listRepositories(request: Request, response: Response): void
}

export class DBAdminApiImpl implements DBAdminApi {

    constructor(private ctx: DbAdminApiContext) {
    }

    createDatabase = async(request: e.Request, response: e.Response) => {
        logger.requestLog(` * createDatabase request received, with body of ${request.headers["content-length"]} bytes`)
        const result = await this.ctx.dbAdminApiWorker.createDatabase(CREATE_DATABASE_SQL)
        lionwebResponse(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            messages: [ {kind: "Info", message: result.queryResult} ]
        })
    }

    init = async(request: e.Request, response: e.Response) => {
        logger.requestLog(` * init request received, with body of ${request.headers["content-length"]} bytes`)
        await this.createRepository(request, response)
    }

    createRepository = async(request: e.Request, response: e.Response) => {
        logger.requestLog(` * createRepository request received, with body of ${request.headers["content-length"]} bytes`)
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
        logger.requestLog(` * listRepositories request received, with body of ${request.headers["content-length"]} bytes`)
        const result = await this.ctx.dbAdminApiWorker.listRepositories()
        // select schemas that represent a repository
        const repoNames = result.queryResult.filter(repo => repo.schema_name.startsWith("lionweb:")).map(repo => repo.schema_name)
        lionwebResponse<ListRepositoriesResponse>(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            repositoryNames: repoNames,
            messages: []
        })
    }

    deleteRepository = async (request: e.Request, response: e.Response): Promise<void> => {
        logger.requestLog(` * deleteRepository request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData: RepositoryData = {clientId: "Repository", repository: getRepositoryParameter(request)}
        const result = await this.ctx.dbAdminApiWorker.deleteRepository(repositoryData)
        lionwebResponse(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            messages: [ {kind: "Info", message: result.queryResult} ]
        })
    }    
}
