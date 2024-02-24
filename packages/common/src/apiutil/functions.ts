import { Request, Response } from "express"
import { lionwebResponse } from "./LionwebResponse.js";

/**
 * Catch-all wrapper function to handle exceptions for any api call
 * @param func
 */
export function runWithTry( func: (req: Request, res: Response) => void): (req: Request, res: Response) => void {
    return async function(req: Request, res: Response): Promise<void> {
        try {
            await func(req, res)
        } catch(e) {
            const error = asError(e)
            console.log(`Exception while serving request for ${req.url}: ${error.message}`)
            lionwebResponse(res, 500, {
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

