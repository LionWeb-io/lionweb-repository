import { ListPartitionsResponse } from "./responses.js";
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { RetrieveResponse } from "./responses.js";

/**
 * API for accessing hostorical model data
 */
export class HistoryApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    /**
     * When called on a database that was initialized without history, 
     * this results in a response with body.success === false and erro message: "function nodesforversion(integer) does not exist"
     * @param version
     */
    async listPartitions(version: number): Promise<ClientResponse<ListPartitionsResponse>> {
        this.client.log(`HistoryApi.listPartitions for version ${version}`)
        return await this.client.postWithTimeout("history/listPartitions", { body: {}, params: `repoVersion=${version}` }) as ClientResponse<ListPartitionsResponse>
    }

    /**
     * When called on a database that was initialized without history,
     * this results in a response with body.success === false and erro message: "function nodesforversion(integer) does not exist"
     * @param version
     */
    async retrieve(version: number, nodeIds: string[], depth?: number): Promise<ClientResponse<RetrieveResponse>> {
        this.client.log(`HistoryApi.retrieve ${nodeIds} with depth ${depth}`)
        const params = ((depth === undefined) ? "" : `depthLimit=${depth}`) + `&repoVersion=${version}`
        return await this.client.postWithTimeout(`history/retrieve`, { body: { ids: nodeIds }, params: `${params}` }) as ClientResponse<RetrieveResponse>
    }


}

