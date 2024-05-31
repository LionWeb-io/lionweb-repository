import { PartitionsResponse } from "@lionweb/repository-common";
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { RetrieveResponse } from "./responses.js";

export class HistoryApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async listPartitions(version: number): Promise<PartitionsResponse> {
        this.client.log(`HistoryApi.listPartitions for version ${version}`)
        return await this.client.getWithTimeout<PartitionsResponse>("history/listPartitions", { body: {}, params: `repoVersion=${version}` })
    }

    async retrieve(version: number, nodeIds: string[], depth?: number): Promise<ClientResponse<RetrieveResponse>> {
        this.client.log(`HistoryApi.retrieve ${nodeIds} with depth ${depth}`)
        const params = ((depth === undefined) ? "" : `depthLimit=${depth}`) + `&repoVersion=${version}`
        return await this.client.postWithTimeout(`history/retrieve`, { body: { ids: nodeIds }, params: `${params}` }) as ClientResponse<RetrieveResponse>
    }


}

