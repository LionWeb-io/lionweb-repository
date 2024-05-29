import { PartitionsResponse } from "@lionweb/repository-common";
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { RetrieveResponse } from "./responses.js";

export class HistoryApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async listPartitions(version: number): Promise<PartitionsResponse> {
        const partitionsResponse: PartitionsResponse = await this.client.getWithTimeout<PartitionsResponse>("history/listPartitions", { body: {}, params: `repoVersion=${version}` })
        return partitionsResponse
    }

    async retrieve(version: number, nodeIds: string[], depth?: number): Promise<ClientResponse<RetrieveResponse>> {
        console.log(`HistoryApi.retrieve ${nodeIds} with depth ${depth}`)
        const params = ((depth === undefined) ? "" : `depthLimit=${depth}`) + `&repoVersion=${version}`
        const x = await this.client.postWithTimeout(`history/retrieve`, { body: { ids: nodeIds }, params: `${params}` })
        return x as ClientResponse<RetrieveResponse>
    }


}

