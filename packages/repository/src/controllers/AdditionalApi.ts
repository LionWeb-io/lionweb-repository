import { INIT_TABLES_SQL } from "@lionweb/repository-mgt/dist/tools/init-tables-sql.js";
import e, { Request, Response } from "express"
import fs from "fs"
import { ADDITIONAL_API_WORKER } from "../database/AdditionalApiWorker.js"

export interface AdditionalApi {
    getNodeTree(req: Request, res: Response): void

    init(req: Request, res: Response): void
}

class AdditionalApiImpl implements AdditionalApi {
    /**
     * Get the tree with root `id`, for one single node
     * @param req
     * @param res
     */
    async getNodeTree(req: Request, res: Response) {
        const idList = req.body.ids
        let depthLimit = Number.parseInt(req.query["depthLimit"] as string)
        if (isNaN(depthLimit)) {
            depthLimit = 99
        }
        console.log("API.getNodeTree is " + idList)
        const result = await ADDITIONAL_API_WORKER.getNodeTree(idList, depthLimit)
        res.send(result)
    }

    async init(req: e.Request, res: e.Response) {
        const sql = INIT_TABLES_SQL // readFile("../database-mgt/src/tools/lionweb-init-tables.sql")
        if (sql === undefined) {
            console.error("************************************ File not found")
            res.status(200)
            res.send("File not found")
        } else {
            await ADDITIONAL_API_WORKER.init(sql)
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

export const ADDITIONAL_API: AdditionalApi = new AdditionalApiImpl()
