import { HttpServerErrors } from "./httpcodes.js"
import { collectUsedLanguages } from "./UsedLanguages.js"
import { LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation"
import { Request, Response } from "express"
import { isResponseMessage, lionwebResponse, ResponseMessage } from "./LionwebResponse.js"
import { v4 as uuidv4 } from "uuid"

export function toFirstUpper(text: string): string {
    return text[0].toUpperCase().concat(text.substring(1))
}

/**
 * Type returned when the requested parameter is not found or has incorrect type.
 */
export type ParameterError = {
    success: boolean
    error: ResponseMessage
}

/**
 * Checks whether the _object_ is a ParameterError
 * @param object
 */
export function isParameterError(object: unknown): object is ParameterError {
    return object["success"] !== undefined &&
        typeof object["success"] === "boolean" &&
        object["message"] !== undefined &&
        isResponseMessage(object["message"])
}


/**
 * Get the query parameter named _paramName_ as a string value
 * @param request   The request object containing the query
 * @param paramName The name of the parameter.
 * @returns The value of the query parameter if this is avalable and of type string,
 * Otherwise a ParameterError containing an error.
 */
export function getStringParam(request: Request, paramName: string): string | ParameterError {
    const result = request.query[paramName]
    if (typeof result === "string") {
        return result as string
    } else {
        return {
            success: false,
            error: {
                kind: `${toFirstUpper(paramName)}Incorrect`,
                message: `Parameter ${paramName} must be a string`
            }
        }
    }
}

/**
 * Get the query parameter named _paramName_ as an integer value
 * @param request   The request object containing the query
 * @param paramName The name of the parameter.
 * @param defaultValue The default value in case the parameter is missing.
 * @returns The value of the query parameter if this is avalable and represents an integer,
 * the _defaultValue_ if the parameters is missing, and
 * otherwise a ParameterError containing an error.
 */
export function getIntegerParam(request: Request, paramName: string, defaultValue: number): number | ParameterError {
    const result = request.query[paramName]
    if (typeof result === "string") {
        const value = Number.parseInt(result)
        if (isNaN(value)) {
            return {
                success: false,
                error: {
                    kind: `${toFirstUpper(paramName)}Incorrect`,
                    message: `Parameter ${paramName} must be an integer, but it is ${result}`
                }
            }
        } else {
            return value
        }
    } else {
        // In case of undefined return the default value
        return defaultValue
    }
}

/**
 * Catch-all wrapper function to handle exceptions for any api call
 * @param func
 */
export function runWithTry(func: (request: Request, response: Response) => void): (request: Request, response: Response) => void {
    return async function (request: Request, response: Response): Promise<void> {
        try {
            await func(request, response)
        } catch (e) {
            const error = asError(e)
            console.log(`Exception while serving request for ${request.url}: ${error.message}`)
            console.log(e.stack);
            lionwebResponse(response, HttpServerErrors.InternalServerError, {
                success: false,
                messages: [{ kind: error.name, message: `Exception while serving request for ${request.url}: ${error.message}` }]
            })
        }
    }
}

/**
 * Get new node id
 */
export function createId(clientId: string): string {
    return clientId + "-" + uuidv4()
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

