import { LionWebJsonChunk } from "@lionweb/validation"
import fs from "fs"

export type Status = number
export type ClientResponse = { 
    json: object,
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

    async testPartitions() {
        console.log(`test.partitions`)
        const modelUnits: LionWebJsonChunk = await this.getWithTimeout<LionWebJsonChunk>("bulk/partitions", { body: {}, params: "" })
        console.log("testPartitions: " + JSON.stringify(modelUnits))
        return modelUnits
    }

    async testStore(data: LionWebJsonChunk) {
        console.log(`test.store`)
        if (data === null) {
            console.log("Cannot read json data")
            return
        }
        // console.log("STORING " + JSON.stringify(data));
        const startTime = performance.now()
        const result = await this.postWithTimeout(`bulk/store`, { body: data, params: "" })
        const endTime = performance.now()
        console.log(`Call to query took ${endTime - startTime} milliseconds`)
        return result
    }

    async testGetNodeTree(nodeIds: string[]) {
        console.log(`test.testGetNodeTree`)
        const startTime = performance.now()
        const x = await this.postWithTimeout(`getNodeTree`, { body: { ids: nodeIds }, params: "" })
        const endTime = performance.now()
        console.log(`Call to query took ${endTime - startTime} milliseconds`)

        // filter out the modelUnitInterfaces
        console.log("result node is " + JSON.stringify(x));
    }

    async testRetrieve(nodeIds: string[], depth?: number) {
        console.log(`test.testRetrieve ${nodeIds} with depth ${depth}`)
        const params = (depth === undefined) ? "" : `depthLimit=${depth}`
        const startTime = performance.now()
        const x = await this.postWithTimeout(`bulk/retrieve`, { body: { ids: nodeIds }, params: `${params}` })
        const endTime = performance.now()
        console.log(`Call to query took ${endTime - startTime} milliseconds`)
        return x
    }

    async testNodesByLanguage() {
        console.log(`test.testNodesByLanguage`)
        const startTime = performance.now()
        const x = await this.getWithTimeout(`inspections/nodesByLanguage`, { body: {  }, params: `` })
        const endTime = performance.now()
        console.log(`Call to query took ${endTime - startTime} milliseconds`)
        return x
    }

    async getWithTimeout<T>(method: string, parameters: { body: unknown; params: string }): Promise<T> {
        const params = this.findParams(parameters.params)
        // console.log("getWithTimeout Params = " + parameters.params);
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
        // console.log("postWithTimeout Params = " + parameters.params);
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
            return { json: result, status: status }
        } catch (e: unknown) {
            this.handleError(e)
        }
        return null
    }

    private async putWithTimeout(method: string, data: unknown, params?: string) {
        params = this.findParams(params)
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        console.log("putWithTimeout: " + `${this._SERVER_URL}${method}${params}`)
        // console.log("Body: " + JSON.stringify(data));
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
        console.log("return fetch")
    }

    private findParams(params?: string) {
        if (!!params && params.length > 0) {
            return "?" + params
        } else {
            return ""
        }
    }

    private handleError(e: unknown) {
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
