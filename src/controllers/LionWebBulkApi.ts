// functions implementing the LionWeb bulk API
// - unpack the request
// - call conroller to do actual work
// - pack response

import { Request, Response } from "express";
import { LionWebJsonChunk } from "@lionweb/validation";
import { LIONWEB_BULKAPI_WORKER } from "../database/LionWebBulkApiWorker.js";

export interface LionWebBulkApi {
    partitions: (req: Request, res: Response) => void;
    store: (req: Request, res: Response) => any;
    retrieve: (req: Request, res: Response) => any;
}

class LionWebBullApiImpl implements LionWebBulkApi {
    /**
     * Builk API: Get all partitions (nodes without parent) from the repo
     * @param req no `parameters` or `body`
     * @param res The list of all partition nodes, without children or annotations
     */
    async partitions (req: Request, res: Response): Promise<void>  {
        // const result = [];
        const result = await LIONWEB_BULKAPI_WORKER.bulkPartitions();
        // res.status(201);
        res.send(result)
    }

    /**
     * Bulk API: Store all nodes in the request
     * @param req `body` contains the array of all nodes to store
     * @param res `ok`  if everything is correct
     */
    async store(req: Request, res: Response): Promise<void> {
        const chunk: LionWebJsonChunk = req.body;
        const x = await LIONWEB_BULKAPI_WORKER.bulkStore(chunk);
        console.log("SENDING " + x)
        res.send(x )
    }

    /**
     * Bulk API: Retrieve a set of nodes including its parts to a givel level
     * @param req `body.ids` contains the list of nodes to be found.
     *            parameter `depthLimit` contains the depth to which the parts are also found.
     * @param res
     */
    async retrieve(req: Request, res: Response): Promise<any> {
        console.log("Api.getNodes: ")
        const mode = req.query["mode"] as string;
        const depthLimit = Number.parseInt(req.query["depthLimit"] as string);
        const idList = req.body.ids;
        console.log("Api.getNodes: " + JSON.stringify(req.body) + " depth " + depthLimit)
        const x = await LIONWEB_BULKAPI_WORKER.bulkRetrieve(idList, mode, depthLimit);
        res.send(x)
        // return x;
    }
}

export const LIONWEB_BULK_API: LionWebBulkApi = new LionWebBullApiImpl();
