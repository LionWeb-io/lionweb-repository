import { LionwebResponse } from "@lionweb/repository-shared"
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js"

export class AdditionalApi {
    client: RepositoryClient

    constructor(client: RepositoryClient) {
        this.client = client
    }

    async getNodeTree(nodeIds: string[]): Promise<ClientResponse<LionwebResponse>> {
        this.client.log(`AdditionalApi.getNodeTree`)
        return await this.client.postWithTimeout(`additional/getNodeTree`, { body: { ids: nodeIds }, params: "" })
    }
}
