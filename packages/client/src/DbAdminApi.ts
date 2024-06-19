import { PartitionsResponse } from "@lionweb/repository-common";
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { LionwebResponse, ListRepositoriesResponse } from "./responses.js"

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

    async listRepositories(): Promise<ClientResponse<ListRepositoriesResponse>> {
        return await this.client.postWithTimeout("listRepositories", { body: {}, params: `` })  as ClientResponse<ListRepositoriesResponse>
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

