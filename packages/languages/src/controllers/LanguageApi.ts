import { lionwebResponse, requestLogger } from "@lionweb/repository-common";
import { Request, Response } from "express"
import { LanguageApiContext } from "../main.js";

export interface LanguageApi {
    registerLanguage(request: Request, response: Response): void
}

export class LanguageApiImpl implements LanguageApi {
    constructor(private context: LanguageApiContext) {
    }
    /**
     * Get the tree with root `id`, for one single node
     * @param request
     * @param response
     */
    registerLanguage = async (request: Request, response: Response)=> {
        requestLogger.info("TODO: 'registerLanguage' not implemented yet " + request + " " + response)
        lionwebResponse(response, 501, {
            success: false,
            messages: [{kind: "NotImplemented", message: "TODO: 'registerLanguage' not implemented yet " + request + " " + response}]
        })
    }
}
