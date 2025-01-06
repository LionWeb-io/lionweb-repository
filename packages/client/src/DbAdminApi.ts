import { ClientResponse, LionWebVersionType, RepositoryClient } from "./RepositoryClient.js";
import { LionwebResponse, ListRepositoriesResponse } from "./responses.js"

export class DbAdminApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async createRepository(repository: string, history: boolean, lionWebVersion: LionWebVersionType, logMessage?: string): Promise<ClientResponse<LionwebResponse>> {
        const historyParameter = history ? "true" : "false"
        return await this.client.postWithTimeout("createRepository", { body: {}, params: `repository=${repository}&history=${historyParameter}&lionWebVersion=${lionWebVersion}${this.client.logMessage(logMessage)}` })
    }

    async deleteRepository(repository: string, logMessage?: string): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("deleteRepository", { body: {}, params: `repository=${repository}${this.client.logMessage(logMessage)}` })
    }

    async listRepositories(logMessage?: string): Promise<ClientResponse<ListRepositoriesResponse>> {
        return await this.client.postWithTimeout("listRepositories", { body: {}, params: `${this.client.logMessageSolo(logMessage)}` })  as ClientResponse<ListRepositoriesResponse>
    }
    
    async createDatabase(logMessage?: string): Promise<ClientResponse<LionwebResponse>> {
        return await this.client.postWithTimeout("createDatabase", { body: {}, params: `${this.client.logMessageSolo(logMessage)}` })
    }
}

