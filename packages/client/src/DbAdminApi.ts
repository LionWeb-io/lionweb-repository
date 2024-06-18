import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { LionwebResponse } from "./responses.js"

export class DbAdminApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async init(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("init", { body: {}, params: "history=true" })
    }

    async createRepository(repository: string): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("createRepository", { body: {}, params: `repository=${repository}&history=true` })
    }

    async deleteRepository(repository: string): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("deleteRepository", { body: {}, params: `repository=${repository}` })
    }

    async createRepositoryWithoutHistory(repository: string): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("createRepository", { body: {}, params: `repository=${repository}&history=false` })
    }

    async initWithoutHistory(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("init", { body: {}, params: "history=false" })
    }

    async createDatabase(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("createDatabase", { body: {}, params: "" })
    }
}

