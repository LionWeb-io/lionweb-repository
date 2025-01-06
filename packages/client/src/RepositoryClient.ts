import { HttpClientErrors } from "./httpcodes.js"
import { AdditionalApi } from "./AdditionalApi.js";
import { BulkApi } from "./BulkApi.js";
import { DbAdminApi } from "./DbAdminApi.js";
import { HistoryApi } from "./HistoryApi.js";
import { InspectionApi } from "./InspectionApi.js";
import { LanguagesApi } from "./LanguagesApi.js";
import {
    LionwebResponse,
} from "./responses.js"

export type Status = number
/**
 * The generic response object for all server commands
 */
export type ClientResponse<T extends LionwebResponse> = {
    body: T
    status: Status
}

export type LionWebVersionType = "2023.1" | "2024.1"

/**
 *  Access to the LionWeb repository API's.
 *  Can be configured by environment variables:
 *      REPO_IP  : the ip address of the repository server
 *      NODE_PORT: the port of the repository server
 *      TIMEOUT: the timeout in ms for a server call
 */      
export class RepositoryClient {
    // Server parameters
    private _nodePort = process.env.NODE_PORT || 3005
    private _SERVER_IP = process.env.REPO_IP || "http://127.0.0.1"
    private _SERVER_URL = `${this._SERVER_IP}:${this._nodePort}/`
    private TIMEOUT = Number.parseInt(process.env.TIMEOUT) || 20000

    loggingOn = false
    logMessage(logMessage: string): string {
        return (this.loggingOn && (logMessage !== undefined) ? `&clientLog=${logMessage}` : "")
    }
    logMessageSolo(logMessage: string): string {
        return (this.loggingOn && (logMessage !== undefined) ? `clientLog=${logMessage}` : "")
    }
    /**
     * The Client id that is used for all Api requests
     */
    clientId: string

    /**
     * The name of the repository used for all Api calls
     */        
    repository: string = "default"
    
    // The different API's that the repository provides
    dbAdmin: DbAdminApi
    bulk: BulkApi
    additional: AdditionalApi
    history: HistoryApi
    inspection: InspectionApi
    languages: LanguagesApi
    
    constructor(clientid: string, repository: string) {
        this.clientId = clientid
        this.repository = repository
        this.dbAdmin = new DbAdminApi(this)
        this.bulk = new BulkApi(this)
        this.additional = new AdditionalApi(this)
        this.history = new HistoryApi(this)
        this.inspection = new InspectionApi(this)
        this.languages = new LanguagesApi(this)
    }

    withClientId(id: string): RepositoryClient {
        this.clientId = id
        return this
    }

    withRepository(repository: string): RepositoryClient {
        this.repository = repository
        return this
    }

    withClientIdAndrepository(id: string, repository: string): RepositoryClient {
        this.clientId = id
        this.repository = repository
        return this
    }

    async getWithTimeout<T>(method: string, parameters: { body: unknown; params: string }): Promise<T> {
        const params = this.findParams(parameters.params)
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)
            this.log("getWithTimeout: " + `${this._SERVER_URL}${method}${params}`)
            const promise = await fetch(`${this._SERVER_URL}${method}${params}`, {
                signal: controller.signal,
                method: "get",
                headers: {
                    "Content-Type": "application/json"
                }
            })
            clearTimeout(timeoutId)
            return await promise.json()
        } catch (e) {
            const error = asError(e)
            this.handleError(error)
        }
        return null
    }

    async postWithTimeout(method: string, parameters: { body: unknown; params: string }): Promise<ClientResponse<LionwebResponse>> {
        const allParams = this.findParams(parameters.params)
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)
            this.log("postWithTimeout: " + `${this._SERVER_URL}${method}${allParams}`)
            const promise: Response = await fetch(`${this._SERVER_URL}${method}${allParams}`, {
                signal: controller.signal,
                method: "post",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(parameters.body)
            })
            clearTimeout(timeoutId)
            const status = promise.status
            const result = await promise.json()
            return { body: result, status: status }
        } catch (e) {
            const error = asError(e)
            this.handleError(error, method)
            return {
                status: HttpClientErrors.PreconditionFailed,
                body: {
                    success: false,
                    messages: [{ message: error.message, kind: "Error" }]
                }
            }
        }
    }

    private async putWithTimeout(method: string, data: unknown, params?: string) {
        params = this.findParams(params)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT)
        this.log("putWithTimeout: " + `${this._SERVER_URL}${method}${params}`)
        let response
        try {
            response = await fetch(`${this._SERVER_URL}${method}${params}`, {
                signal: controller.signal,
                method: "put",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            })
        } catch (e) {
            const error = asError(e)
            this.logError("putWithTimeout.ERROR " + error.message)
            this.handleError(error)
        }
        clearTimeout(timeoutId)
        return response
    }

    private findParams(params?: string): string {
        let result = ""
        if (!!params && params.includes("clientId")) {
            result = "?" + params
        } else if (!!params && params.length > 0) {
            result = "?" + params + "&clientId=" + this.clientId
        } else {
            result = "?clientId=" + this.clientId
        }
        if (result.includes("repository")) {
            return result
        } else {
            return result + "&repository=" + this.repository
        }
    }

    private handleError(e: Error, method: string = null): void {
        let errorMess: string = e.message
        if (e.message.includes("aborted")) {
            errorMess = `Time out: no response from ${this._SERVER_URL}.`
            console.error(errorMess)
        }
        if (method == null) {
            console.error("handleError: " + JSON.stringify(e))
        } else {
            console.error(`handleError on /${method}: ` + JSON.stringify(e))
        }
    }

    /**
     * Log wne logging turned on
     * @param message
     */
    log(message: string): void {
        if (this.loggingOn) {
            console.log("RepositoryClient: " + message)
        }
    }

    /**
     * Alwways log errors
     * @param message
     */
    logError(message: string): void {
        console.log("RepositoryClient error: " + message)
    }


}

// NB Copy from repository-common
/**
 * Return _error_ as en Error, just return itself if it already is.
 * @param error
 */
export function asError(error: unknown): Error {
    if (error instanceof Error) return error;
    return new Error(JSON.stringify(error));
}
