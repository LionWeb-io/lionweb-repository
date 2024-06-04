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

    async initRepository(repository: string): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("initRepository", { body: {}, params: `repository=${repository}` })
    }

    async initRepositoryWithoutHistory(repository: string): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("initRepositoryWithoutHistory", { body: {}, params: `repository=${repository}` })
    }

    async initWithoutHistory(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("initWithoutHistory", { body: {}, params: "" })
    }

    async createDatabase(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("createDatabase", { body: {}, params: "" })
    }
}

