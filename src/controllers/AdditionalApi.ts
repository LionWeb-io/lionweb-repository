import { LionWebJsonNode } from "@lionweb/validation";
import { Request, Response } from "express";
import { ADDITIONAL_API_WORKER } from "../database/AdditionalApiWorker.js";

export interface AdditionalApi {
    getNode(req: Request, res: Response): Promise<LionWebJsonNode>;
    getNodeTree(req: Request, res: Response): void;
}

class AdditionalApiImpl implements AdditionalApi {
    /**
     * Get one single node, recursive depth = 0, including its properties, containments, etc.
     * @param req parameter `id` contains the node id of the node to be found
     * @param res the full node, or null if it no node with the node id exists.
     */
    async getNode(req: Request, res: Response) {
        const nodeId = req.query["id"] as string;
        const x = await ADDITIONAL_API_WORKER.getNode(nodeId);
        res.send(x)
        return x;
    }

    /**
     * Get the tree with root `id`, for one single node
     * @param req
     * @param res
     */
    async getNodeTree(req: Request, res: Response) {
        const idList = req.body.ids;
        let depthLimit = Number.parseInt(req.query["depthLimit"] as string);
        if (isNaN(depthLimit)) {
            depthLimit = 99;
        }
        console.log("API.getNodeTree is " + idList)
        const result = await ADDITIONAL_API_WORKER.getNodeTree(idList, depthLimit);
        res.send(result);
    }
}

export const ADDITIONAL_API: AdditionalApi = new AdditionalApiImpl();
