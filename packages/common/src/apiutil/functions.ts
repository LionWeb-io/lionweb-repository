import { HttpServerErrors } from "./httpcodes.js"
import { requestLogger } from "./logging.js"
import { Job, requestQueue } from "./RequestQueue.js"
import { collectUsedLanguages } from "./UsedLanguages.js"
import { LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation"
import { Request, Response } from "express"
import { lionwebResponse, ResponseMessage } from "./LionwebResponse.js"
import { v4 as uuidv4 } from "uuid"
import {LIONWEB_VERSIONS, LionWebVersion} from "./ServerConfig.js";

export type UnknownObjectType = { [key: string]: unknown }

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
    return (
        //@ts-expect-error TS7053
        object["success"] !== undefined &&
        // @ts-expect-error TS7053
        typeof object["success"] === "boolean" &&
        // @ts-expect-error TS7053
        object["error"] !== undefined &&
        // @ts-expect-error TS7053
        object["error"]["kind"] !== undefined &&
        // @ts-expect-error TS7053
        typeof object["error"]["kind"] === "string" &&
        // @ts-expect-error TS7053
        object["error"]["kind"].endsWith("-ParameterIncorrect")
    )
}

/**
 * Get the query parameter named _paramName_ as a string value
 * @param request   The request object containing the query
 * @param paramName The name of the parameter.
 * @returns The value of the query parameter if this is avalable and of type string,
 * Otherwise a ParameterError containing an error.
 */
export function getStringParam(request: Request, paramName: string, defaultValue?: string): string | ParameterError {
    const result = request.query[paramName]
    if (typeof result === "string") {
        return result as string
    } else {
        if (defaultValue !== undefined) {
            return defaultValue
        } else {
            return {
                success: false,
                error: {
                    kind: `${toFirstUpper(paramName)}-ParameterIncorrect`,
                    message: `Parameter ${paramName} must be a string: [${result}]`
                }
            }
        }
    }
}

/**
 * Get the query parameter named _paramName_ as a string value
 * @param request   The request object containing the query
 * @param paramName The name of the parameter.
 * @returns The value of the query parameter if this is avalable and of type string,
 * Otherwise a ParameterError containing an error.
 */
export function getBooleanParam(request: Request, paramName: string): boolean | ParameterError {
    const result = request.query[paramName]
    if (typeof result === "string") {
        return result === "true"
    } else {
        return {
            success: false,
            error: {
                kind: `${toFirstUpper(paramName)}Incorrect`,
                message: `Parameter ${paramName} must be a string: [${result}]`
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
 * Postgres PLPGSQL complains about a function declaration unless it is on one line.
 * This method finds all declarations (between $$ and $$) in the `plpsql` query
 * and jpoins the function declaration on one line.
 * @param plpgsql The query that needs processed
 * @returns The same query but all function declarations merged into a single line.
 */
export function removeNewlinesBetween$$(plpgsql: string): string {
    let result = plpgsql
    // Match all substrings between $$ and $$ markers (PLPGSQL specific)
    const first = plpgsql.match(/\$\$[^$]*\$\$/g) ?? []
    first.forEach(text => {
        result = result.replace(text.substring(2, text.length - 3), text.substring(2, text.length - 3).replaceAll("\n", " "))
    })
    return result
}

/**
 *
 */
export function getRepositoryParameter(request: Request): string {
    let repository = getStringParam(request, "repository")
    if (isParameterError(repository)) {
        // use the default
        repository = "default"
    }
    return repository
}

/**
 *
 */
export function getClientLog(request: Request): string {
    let logMessage = getStringParam(request, "clientLog", "")
    if (isParameterError(logMessage)) {
        // use the default
        logMessage = ""
    }
    return logMessage
}

/**
 *
 */
export function getHistoryParameter(request: Request): boolean {
    let history = getBooleanParam(request, "history")
    if (isParameterError(history)) {
        // use the default
        history = false
    }
    return history
}

/**
 *
 */
export function getLionWebVersionParameter(request: Request): string {
    let lionWebVersion = getStringParam(request, "lionWebVersion", "2023.1")
    if (isParameterError(lionWebVersion)) {
        // use the default
        lionWebVersion = "2023.1"
    }
    return lionWebVersion
}

/**
 *
 */
export function getClientIdParameter(request: Request): string {
    let clientId = getStringParam(request, "clientId")
    if (isParameterError(clientId)) {
        // use the default
        clientId = "lionweb-repository"
    }
    return clientId
}

/**
 * Number of requests handled since start
 */
let index = 1

/**
 * Catch-all wrapper function to handle exceptions for any api call.
 * And put the request function in the request queue.
 * @param func
 */
export function runWithTry(func: (request: Request, response: Response) => void): (request: Request, response: Response) => void {
    return async function (request: Request, response: Response): Promise<void> {
        const myIndex = index++
        const requestFunction = async () => {
            try {
                await func(request, response)
            } catch (e) {
                const error = asError(e)
                requestLogger.error(`Exception ${myIndex} while serving request for ${request.url}: ${error.message}`)
                requestLogger.error(error)
                lionwebResponse(response, HttpServerErrors.InternalServerError, {
                    success: false,
                    messages: [{ kind: error.name, message: `Exception while serving request for ${request.url}: ${error.message}` }]
                })
            }
        }
        requestQueue.add(new Job("request-" + myIndex, requestFunction))
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
    if (error instanceof Error) return error
    return new Error(JSON.stringify(error))
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
 * Create a chunk around _nodes_.
 * @param nodes nodes to insert in the chunk
 * @param lionWebVersion LionWeb version to use for the serialization
 */
export function nodesToChunk(nodes: LionWebJsonNode[], lionWebVersion: LionWebVersion): LionWebJsonChunk {
    return {
        serializationFormatVersion: lionWebVersion,
        languages: collectUsedLanguages(nodes),
        nodes: nodes
    }
}

/**
 * We pre-calculate the empty chunks for each version of LionWeb we support.
 */
export const EMPTY_CHUNKS = Object.fromEntries(
    LIONWEB_VERSIONS.map((version) => [version, nodesToChunk([], version as LionWebVersion)])
) as { [K in LionWebVersion]: LionWebJsonChunk };