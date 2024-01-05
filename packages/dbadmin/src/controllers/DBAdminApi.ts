import e, { Request, Response } from "express"
import fs from "fs"
import pgPromise from "pg-promise"
import pg from "pg-promise/typescript/pg-subset.js"
import { createDBAdminApiWorker, DB_ADMIN_WORKER, DBAdminApiWorker } from "../database/DBAdminApiWorker.js"

export interface DBAdminApi {
    init(req: Request, res: Response): void
}

class DBAdminApiImpl implements DBAdminApi {

    async init(req: e.Request, res: e.Response) {
        const sql = readFile("./src/tools/lionweb-init-tables.sql")
        if (sql === undefined) {
            console.error("************************************ File not found")
            res.status(200)
            res.send("File not found")
        } else {
            await DB_ADMIN_WORKER.init(sql)
            res.send("initialized")
        }
    }
}

function readFile(filename: string): string | undefined {
    if (fs.existsSync(filename)) {
        const stats = fs.statSync(filename)
        if (stats.isFile()) {
            return fs.readFileSync(filename).toString()
        }
    }
    return undefined
}

export function createDBAdminApi() : DBAdminApi {
    return new DBAdminApiImpl();
}

