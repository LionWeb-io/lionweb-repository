import e, { Request, Response } from "express"
import { DB_ADMIN_WORKER } from "../database/DBAdminApiWorker.js";
import { INIT_TABLES_SQL } from "../tools/index.js";

export interface DBAdminApi {
    init(req: Request, res: Response): void
}

class DBAdminApiImpl implements DBAdminApi {

    async init(req: e.Request, res: e.Response) {
        const sql = INIT_TABLES_SQL
        await DB_ADMIN_WORKER.init(sql)
        res.send("initialized")
    }
}

export function createDBAdminApi() : DBAdminApi {
    return new DBAdminApiImpl();
}

