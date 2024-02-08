import e, { Request, Response } from "express"
import { DbAdminApiContext } from "../main.js";
import { INIT_TABLES_SQL } from "../tools/index.js";

export interface DBAdminApi {
    init(req: Request, res: Response): void
}

export class DBAdminApiImpl implements DBAdminApi {

    constructor(private ctx: DbAdminApiContext) {
    }
    
    init = async(req: e.Request, res: e.Response) => {
        const result = await this.ctx.dbAdminApiWorker.init(INIT_TABLES_SQL)
        res.send(result)
    }
}
