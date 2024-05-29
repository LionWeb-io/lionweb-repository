import { asError, HttpClientErrors } from "@lionweb/repository-common"
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
export type ClientResponse<T extends LionwebResponse> = {
    body: T
    status: Status
}

export class RepositoryClient {
    private _nodePort = process.env.NODE_PORT || 3005
    private _SERVER_IP = "http://127.0.0.1"
    private _SERVER_URL = `${this._SERVER_IP}:${this._nodePort}/`
    private clientId: string

    // The different API's that the repository provides
    dbAdmin: DbAdminApi
    bulk: BulkApi
    additional: AdditionalApi
    history: HistoryApi
    inspection: InspectionApi
    languages: LanguagesApi
    
    constructor(clientid: string) {
        this.clientId = clientid
        this.dbAdmin = new DbAdminApi(this)
        this.bulk = new BulkApi(this)
        this.additional = new AdditionalApi(this)
        this.history = new HistoryApi(this)
        this.inspection = new InspectionApi(this)
        this.languages = new LanguagesApi(this)
        
    }
    
    async getWithTimeout<T>(method: string, parameters: { body: unknown; params: string }): Promise<T> {
        const params = this.findParams(parameters.params)
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 2000)
            console.log("getWithTimeout: " + `${this._SERVER_URL}${method}${params}`)
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
        const params = this.findParams(parameters.params)
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 2000)
            console.log("postWithTimeout: " + `${this._SERVER_URL}${method}${params}`)
            const promise: Response = await fetch(`${this._SERVER_URL}${method}${params}`, {
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
            this.handleError(error)
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
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        console.log("putWithTimeout: " + `${this._SERVER_URL}${method}${params}`)
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
            console.error("putWithTimeout.ERROR " + error.message)
            this.handleError(error)
        }
        console.log("fetching done ....")
        clearTimeout(timeoutId)
        return response
    }

    private findParams(params?: string): string {
        if (!!params && params.includes("clientId")) {
            return "?" + params
        } else if (!!params && params.length > 0) {
            return "?" + params + "&clientId=" + this.clientId
        } else {
            return "?clientId=" + this.clientId
        }
    }

    private handleError(e: Error): void {
        let errorMess: string = e.message
        if (e.message.includes("aborted")) {
            errorMess = `Time out: no response from ${this._SERVER_URL}.`
            console.error(errorMess)
        }
        console.error("handleError: " + JSON.stringify(e))
    }
}
