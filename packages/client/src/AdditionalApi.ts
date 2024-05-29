import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { LionwebResponse } from "./responses.js"

export class AdditionalApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async getNodeTree(nodeIds: string[]): Promise<ClientResponse<LionwebResponse>> {
        console.log(`AdditionalApi.getNodeTree`)
        const x = await this.client.postWithTimeout(`additional/getNodeTree`, { body: { ids: nodeIds }, params: "" })
        return x
    }

}

