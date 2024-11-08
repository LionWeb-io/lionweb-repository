import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { LionwebResponse, ListRepositoriesResponse } from "./responses.js"

export class DbAdminApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async init(history: boolean): Promise<ClientResponse<LionwebResponse>> {
        const historyParameter = history ? "true" : "false"
        return await this.client.postWithTimeout("init", { body: {}, params: `history=${historyParameter}` })
    }

    async createRepository(repository: string, history: boolean): Promise<ClientResponse<LionwebResponse>> {
        const historyParameter = history ? "true" : "false"
        const r =  await this.client.postWithTimeout("createRepository", { body: {}, params: `repository=${repository}&history=${historyParameter}` })
        return r
    }

    async deleteRepository(repository: string): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("deleteRepository", { body: {}, params: `repository=${repository}` })
    }

    async listRepositories(): Promise<ClientResponse<ListRepositoriesResponse>> {
        return await this.client.postWithTimeout("listRepositories", { body: {}, params: `` })  as ClientResponse<ListRepositoriesResponse>
    }
    
    async createDatabase(): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("createDatabase", { body: {}, params: "" })
    }
}

