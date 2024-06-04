import e, { Request, Response } from "express"
import { getRepositoryParameter, HttpSuccessCodes, RepositoryData, lionwebResponse, logger } from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";
import { CREATE_DATABASE_SQL } from "../tools/index.js";

export interface DBAdminApi {
    createDatabase(request: Request, response: Response): void
    init(request: Request, response: Response): void
    initWithoutHistory(request: Request, response: Response): void
    initRepository(request: Request, response: Response): void
    initRepositoryWithoutHistory(request: Request, response: Response): void
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
        await this.initRepository(request, response)
    }

    initRepository = async(request: e.Request, response: e.Response) => {
        logger.requestLog(` * initRepository request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData: RepositoryData = {clientId: "Repository", repository: getRepositoryParameter(request)}
        const result = await this.ctx.dbAdminApiWorker.initRepository(repositoryData)
        lionwebResponse(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            messages: [ {kind: "Info", message: result.queryResult} ]
        })
    }

    initRepositoryWithoutHistory = async(request: e.Request, response: e.Response) => {
        logger.requestLog(` * initRepositoryWithoutHistory request received, with body of ${request.headers["content-length"]} bytes`)
        const repositoryData: RepositoryData = {clientId: "Repository", repository: getRepositoryParameter(request)}
        const result = await this.ctx.dbAdminApiWorker.initRepositoryWithoutHistory(repositoryData)
        lionwebResponse(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            messages: [ {kind: "Info", message: result.queryResult} ]
        })
    }

    initWithoutHistory = async(request: e.Request, response: e.Response) => {
        logger.requestLog(` * initWithoutHistory request received, with body of ${request.headers["content-length"]} bytes`)
        await this.initRepositoryWithoutHistory(request, response)
    }
}
