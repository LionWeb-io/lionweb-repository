import { LionWebJsonChunk } from "@lionweb/validation";
import fs from "fs";

export class TestClient {
    private _nodePort = process.env.NODE_PORT || 3005;
    private _SERVER_IP = `http://127.0.0.1`;
    private _SERVER_URL = `${this._SERVER_IP}:${this._nodePort}/`;


    readModel(filename: string): any {
        if (fs.existsSync(filename)) {
            const stats = fs.statSync(filename);
            if (stats.isFile()) {
                let chunk: LionWebJsonChunk = JSON.parse(fs.readFileSync(filename).toString());
                return chunk;
            }
        }
        return null;
    }
    async testPartitions() {
        console.log(`test.partitions`);
        let modelUnits: LionWebJsonChunk = await this.getWithTimeout<LionWebJsonChunk>(`bulk/partitions`, {body: {}, params: ""});
        console.log("testPartitions: " + JSON.stringify(modelUnits))
        return modelUnits;
    }

    async testStore() {
        console.log(`test.store`);
        const data = this.readModel("./src/test/data/Disk_1.json");
        if (data === null) {
            console.log("Cannot read json data");
            return;
        }
        console.log("STORING " + JSON.stringify(data));
        var startTime = performance.now()
        let x = await this.putWithTimeout(`bulk/store`, data.nodes);
        var endTime = performance.now() 
        console.log(`Call to query took ${endTime - startTime} milliseconds`)

        // filter out the modelUnitInterfaces
        console.log("end test,store");
    }

    async testGetNode() {
        console.log(`test.getNode`);
        var startTime = performance.now()
        let x = await this.getWithTimeout(`getNode`, {body: {}, params: "id=example1-props_root"});
        var endTime = performance.now()
        console.log(`Call to query took ${endTime - startTime} milliseconds`)

        // filter out the modelUnitInterfaces
        console.log("result noide is " + JSON.stringify(x));
    }

    async testGetNodeTree() {
        console.log(`test.testGetNodeTree`);
        var startTime = performance.now()
        let x = await this.postWithTimeout(`getNodeTree`, {body: { ids: ["ID-2"] }, params: ""});
        var endTime = performance.now()
        console.log(`Call to query took ${endTime - startTime} milliseconds`)

        // filter out the modelUnitInterfaces
        console.log("result node is " + JSON.stringify(x));
    }

    async testRetrieve(depth?: number) {
        console.log(`test.testRetrieve`);
        depth = depth || 999;
        var startTime = performance.now()
        let x = await this.postWithTimeout(`bulk/retrieve`, { body: { ids: ["ID-2"] }, params: `depthLimit=${depth}`});
        var endTime = performance.now()
        console.log(`Call to query took ${endTime - startTime} milliseconds`)
        // console.log("++++++++++++++ result node is " + JSON.stringify(x));
        return x;
    }

    async  getWithTimeout<T>(method: string, parameters: {  body: Object, params: string }): Promise<T> {
        const params = this.findParams(parameters.params);
        console.log("getWithTimeout Params = " + parameters.params);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            console.log("Input: " + `${this._SERVER_URL}${method}${params}`)
            const promise = await fetch(
                `${this._SERVER_URL}${method}${params}`,
                {
                    signal: controller.signal,
                    method: "get",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
            clearTimeout(timeoutId);
            return await promise.json() ;
        } catch (e) {
            this.handleError(e);
        }
        return null;
    }

    async  postWithTimeout<T>(method: string, parameters: {  body: Object, params: string }): Promise<T | null> {
        const params = this.findParams(parameters.params);
        console.log("postWithTimeout Params = " + parameters.params);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            console.log("Input: " + `${this._SERVER_URL}${method}${params}`)
            const promise = await fetch(
                `${this._SERVER_URL}${method}${params}`,
                {
                    signal: controller.signal,
                    method: "post",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(parameters.body)

                });
            clearTimeout(timeoutId);
            return await promise.json() ;
        } catch (e: any) {
            this.handleError(e);
        }
        return null;
    }

    private async putWithTimeout(method: string, data: Object, params?: string) {
        params = this.findParams(params);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            console.log("fetching ...." + `${this._SERVER_URL}${method}${params}`);
            console.log("Body: " + JSON.stringify(data));
            const promise = await fetch(
                `${this._SERVER_URL}${method}${params}`,
                {
                    signal: controller.signal,
                    method: "put",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });
            console.log("fetching done ....")
            clearTimeout(timeoutId);
            return  ;
        } catch (e) {
            this.handleError(e);
        }
        console.log("return fetch")
    }

    private findParams(params?: string) {
        if (!!params && params.length > 0) {
            return "?" + params;
        } else {
            return "";
        }
    }

    private handleError(e: Error) {
        let errorMess: string = e.message;
        if (e.message.includes("aborted")) {
            errorMess = `Time out: no response from ${this._SERVER_URL}.`;
            console.error(errorMess);
        }
        console.error("hanldeError: " +  JSON.stringify(e));
        // this.onError(errorMess, FreErrorSeverity.NONE);
    }
}
