import e, { Request, Response } from "express"
import { HttpSuccessCodes, lionwebResponse, logger } from "@lionweb/repository-common";
import { DbAdminApiContext } from "../main.js";
import { CREATE_DATABASE_SQL, INIT_TABLES_SQL } from "../tools/index.js";

export interface DBAdminApi {
    createDatabase(request: Request, response: Response): void
    init(request: Request, response: Response): void
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
        const result = await this.ctx.dbAdminApiWorker.init(removeNewlinesBetween$$(INIT_TABLES_SQL))
        lionwebResponse(response, result.status, {
            success: result.status === HttpSuccessCodes.Ok,
            messages: [ {kind: "Info", message: result.queryResult} ]
        })
    }
}

function removeNewlinesBetween$$(plpgsql: string): string {
    let result = plpgsql
    // Match all substrings between $$ and $$ markers (PLPGSQL specific)
    const first = plpgsql.match(/\$\$[^$]*\$\$/g) ?? []
    first.forEach((text) => {
        result = result.replace(text.substring(2, text.length-3), text.substring(2, text.length-3).replaceAll("\n", " "))
    })
    return result
}

