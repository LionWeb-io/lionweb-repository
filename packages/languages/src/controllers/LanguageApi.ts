import { lionwebResponse } from "@lionweb/repository-common";
import { Request, Response } from "express"
import { LanguageApiContext } from "../main.js";

export interface LanguageApi {
    registerLanguage(req: Request, res: Response): void
}

export class LanguageApiImpl implements LanguageApi {
    constructor(private context: LanguageApiContext) {
    }
    /**
     * Get the tree with root `id`, for one single node
     * @param req
     * @param res
     */
    registerLanguage = async (req: Request, res: Response)=> {
        console.log("TODO: 'registerLanguage' not implemented yet " + req + " " + res)
        lionwebResponse(res, 501, {
            success: false,
            messages: [{kind: "NotImplemented", message: "TODO: 'registerLanguage' not implemented yet " + req + " " + res}]
        })
    }
}
