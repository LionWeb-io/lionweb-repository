import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { LionwebResponse } from "./responses.js"

export class DbAdminApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async init(): Promise<ClientResponse<LionwebResponse>> {
        const x = await this.client.postWithTimeout("init", { body: {}, params: "" })
        return x
    }

    async initWithoutHistory(): Promise<ClientResponse<LionwebResponse>> {
        const x = await this.client.postWithTimeout("initWithoutHistory", { body: {}, params: "" })
        return x
    }

    async createDatabase(): Promise<ClientResponse<LionwebResponse>> {
        const x = await this.client.postWithTimeout("createDatabase", { body: {}, params: "" })
        return x
    }
}

