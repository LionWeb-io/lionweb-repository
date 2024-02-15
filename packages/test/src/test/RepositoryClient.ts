import { LionWebJsonChunk } from "@lionweb/validation"
import fs from "fs"

export type Status = number
export type ClientResponse = {
    body: object,
    status: Status
}

export class RepositoryClient {
    private _nodePort = process.env.NODE_PORT || 3005
    private _SERVER_IP = "http://127.0.0.1"
    private _SERVER_URL = `${this._SERVER_IP}:${this._nodePort}/`

    readModel(filename: string): LionWebJsonChunk {
        if (fs.existsSync(filename)) {
            const stats = fs.statSync(filename)
            if (stats.isFile()) {
                const chunk: LionWebJsonChunk = JSON.parse(fs.readFileSync(filename).toString())
                return chunk
            }
        }
        return null
    }

    async init(): Promise<Status> {
        const x = await this.postWithTimeout("init", { body: {}, params: "" })
        return x === null ? null : x.status
    }

    async testPartitions(): Promise<LionWebJsonChunk> {
        const modelUnits: LionWebJsonChunk = await this.getWithTimeout<LionWebJsonChunk>("bulk/partitions", { body: {}, params: "" })
        return modelUnits
    }

    async testCreatePartitions(data: LionWebJsonChunk): Promise<ClientResponse> {
        console.log(`test.testCreatePartitions`)
        if (data === null) {
            console.log("Cannot read json data")
            return { status: 404, body: { result: "Repository.testClient: cannot read partitions to create"} }
        }
        console.log("Create partition " + JSON.stringify(data))
        const result = await this.postWithTimeout(`bulk/createPartitions`, { body: data, params: "" })
        return result
    }
    
    async testStore(data: LionWebJsonChunk): Promise<ClientResponse> {
        console.log(`test.store`)
        if (data === null) {
            console.log("Cannot read json data")
            return { status: 404, body: { result: "Repository.testClient: cannot read data to store"} }
        }
        const result = await this.postWithTimeout(`bulk/store`, { body: data, params: "" })
        return result
    }

    async testGetNodeTree(nodeIds: string[]): Promise<ClientResponse> {
        console.log(`test.testGetNodeTree`)
        const x = await this.postWithTimeout(`getNodeTree`, { body: { ids: nodeIds }, params: "" })
        return x
    }

    async testRetrieve(nodeIds: string[], depth?: number): Promise<ClientResponse> {
        console.log(`test.testRetrieve ${nodeIds} with depth ${depth}`)
        const params = (depth === undefined) ? "" : `depthLimit=${depth}`
        const x = await this.postWithTimeout(`bulk/retrieve`, { body: { ids: nodeIds }, params: `${params}` })
        return x
    }

    async testNodesByLanguage() {
        console.log(`test.testNodesByLanguage`)
        const x = await this.getWithTimeout(`inspection/nodesByLanguage`, { body: {}, params: `` })
        return x
    }

    async testNodesByClassifier() {
        console.log(`test.testNodesByClassifier`)
        const x = await this.getWithTimeout(`inspection/nodesByClassifier`, { body: {}, params: `` })
        return x
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
                    "Content-Type": "application/json",
                },
            })
            clearTimeout(timeoutId)
            return await promise.json()
        } catch (e) {
            this.handleError(e)
        }
        return null
    }

    async postWithTimeout(method: string, parameters: { body: unknown; params: string }): Promise<ClientResponse | null> {
        const params = this.findParams(parameters.params)
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 2000)
            console.log("postWithTimeout: " + `${this._SERVER_URL}${method}${params}`)
            const promise: Response = await fetch(`${this._SERVER_URL}${method}${params}`, {
                signal: controller.signal,
                method: "post",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(parameters.body),
            })
            clearTimeout(timeoutId)
            const status = promise.status
            const result = await promise.json()
            return { body: result, status: status }
        } catch (e) {
            this.handleError(e)
            return { status: 403, body: { error: e.message } }
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
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            })
        } catch (e) {
            console.error("putWithTimeout.ERROR " + JSON.stringify(e))
            this.handleError(e)
        }
        console.log("fetching done ....")
        clearTimeout(timeoutId)
        return response
    }

    private findParams(params?: string): string {
        if (!!params && params.length > 0) {
            return "?" + params
        } else {
            return ""
        }
    }

    private handleError(e: unknown): void {
        if (e instanceof Error) {
            let errorMess: string = e.message
            if (e.message.includes("aborted")) {
                errorMess = `Time out: no response from ${this._SERVER_URL}.`
                console.error(errorMess)
            }
            console.error("handleError: " + JSON.stringify(e))
        } else {
            console.error("Exception handleError: " + JSON.stringify(e))
        }
    }
}
