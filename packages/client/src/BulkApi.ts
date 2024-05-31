import { HttpClientErrors, PartitionsResponse } from "@lionweb/repository-common";
import { LionWebJsonChunk } from "@lionweb/validation";
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { CreatePartitionsResponse, DeletePartitionsResponse, IdsResponse, RetrieveResponse, StoreResponse } from "./responses.js";

export class BulkApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async listPartitions(): Promise<PartitionsResponse> {
        this.client.log(`BulkApi.listPartitions`)
        const partitionsResponse: PartitionsResponse = await this.client.getWithTimeout<PartitionsResponse>("bulk/listPartitions", { body: {}, params: "" })
        return partitionsResponse
    }

    async createPartitions(data: LionWebJsonChunk): Promise<ClientResponse<CreatePartitionsResponse>> {
        this.client.log(`BulkApi.createPartitions`)
        if (data === null) {
            this.client.logError("createPartitions: Cannot read json data")
            return {
                status: HttpClientErrors.PreconditionFailed, body: {
                    success: false,
                    messages: [{
                        kind: "ClientError",
                        message: "Repository.testClient: cannot read partitions to create"
                    }]
                }
            }
        }
        return await this.client.postWithTimeout(`bulk/createPartitions`, { body: data, params: "" })
    }

    async deletePartitions(partitionIds: string[]): Promise<ClientResponse<DeletePartitionsResponse>> {
        this.client.log(`BulkApi..deletePartitions`)
        if (partitionIds === null) {
            this.client.log("deletePartitions: Cannot read partitions")
            return {
                status: HttpClientErrors.PreconditionFailed,
                body: {
                    success: false,
                    messages: [{
                        message: "BulkApi.deletePartitions: cannot read partitions to delete",
                        kind: "ClientError"
                    }]
                }
            }
        }
        return await this.client.postWithTimeout(`bulk/deletePartitions`, { body: partitionIds, params: "" })
    }

    async store(data: LionWebJsonChunk): Promise<ClientResponse<StoreResponse>> {
        this.client.log(`BulkApi.store`)
        if (data === null) {
            this.client.log("testStore: Cannot read json data")
            return {
                status: HttpClientErrors.PreconditionFailed, body: {
                    success: false,
                    messages: [{
                        kind: "ClientError",
                        message: "Repository.testClient: cannot read data to store"
                    }]
                }
            }
        }
        return await this.client.postWithTimeout(`bulk/store`, { body: data, params: "" })
    }

    async ids(clientId: string, count: number): Promise<ClientResponse<IdsResponse>> {
        this.client.log(`BulkApi.ids`)
        return await this.client.postWithTimeout(`bulk/ids`, { body: {}, params: `clientId=${clientId}&count=${count}` })  as ClientResponse<IdsResponse>
    }

    async retrieve(nodeIds: string[], depth?: number): Promise<ClientResponse<RetrieveResponse>> {
        this.client.log(`BulkApi.retrieve ${nodeIds} with depth ${depth}`)
        const params = (depth === undefined) ? "" : `depthLimit=${depth}`
        return await this.client.postWithTimeout(`bulk/retrieve`, { body: { ids: nodeIds }, params: `${params}` }) as ClientResponse<RetrieveResponse>
    }
}

