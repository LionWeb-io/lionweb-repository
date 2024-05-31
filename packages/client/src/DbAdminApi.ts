import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { LionwebResponse } from "./responses.js"

export class DbAdminApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async init(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("init", { body: {}, params: "" })
    }

    async initWithoutHistory(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("initWithoutHistory", { body: {}, params: "" })
    }

    async createDatabase(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("createDatabase", { body: {}, params: "" })
    }
}

