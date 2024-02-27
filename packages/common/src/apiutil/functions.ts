import { HttpServerErrors } from "./httpcodes.js";
import { collectUsedLanguages } from "./UsedLanguages.js";
import { LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation";
import { Request, Response } from "express"
import { lionwebResponse } from "./LionwebResponse.js";

/**
 * Catch-all wrapper function to handle exceptions for any api call
 * @param func
 */
export function runWithTry( func: (req: Request, response: Response) => void): (req: Request, response: Response) => void {
    return async function(req: Request, response: Response): Promise<void> {
        try {
            await func(req, response)
        } catch(e) {
            const error = asError(e)
            console.log(`Exception while serving request for ${req.url}: ${error.message}`)
            lionwebResponse(response, HttpServerErrors.InternalServerError, {
                success: false,
                messages: [{ kind: error.name, message: `Exception while serving request for ${req.url}: ${error.message}` }]
            })
        }
    }
}

/**
 * Return _error_ as en Error, just return itself if it already is.
 * @param error
 */
export function asError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(JSON.stringify(error));
}

/**
 * Function that asserts a value is defined (not null or undefined) and throws an exception otherwise
 * @param value
 */
export function assertIsDefined<T>(value: T): asserts value is NonNullable<T> {
    if (value === undefined || value === null) {
        throw new Error(`${value} is not defined`)
    }
}

/**
 * Create a chunk around _nodes_
 * * @param nodes
 */
export function nodesToChunk(nodes: LionWebJsonNode[]): LionWebJsonChunk {
    return {
        serializationFormatVersion: "2023.1",
        languages: collectUsedLanguages(nodes),
        nodes: nodes,
    }
}

export const EMPTY_CHUNK = nodesToChunk([])

