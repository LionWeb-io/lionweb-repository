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
        console.log(`BulkApi.listPartitions`)
        const partitionsResponse: PartitionsResponse = await this.client.getWithTimeout<PartitionsResponse>("bulk/listPartitions", { body: {}, params: "" })
        return partitionsResponse
    }

    async createPartitions(data: LionWebJsonChunk): Promise<ClientResponse<CreatePartitionsResponse>> {
        console.log(`BulkApi.createPartitions`)
        if (data === null) {
            console.error("createPartitions: Cannot read json data")
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
        const result = await this.client.postWithTimeout(`bulk/createPartitions`, { body: data, params: "" })
        return result
    }

    async deletePartitions(partitionIds: string[]): Promise<ClientResponse<DeletePartitionsResponse>> {
        console.log(`BulkApi..deletePartitions`)
        if (partitionIds === null) {
            console.log("deletePartitions: Cannot read partitions")
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
        const result = await this.client.postWithTimeout(`bulk/deletePartitions`, { body: partitionIds, params: "" })
        return result
    }

    async store(data: LionWebJsonChunk): Promise<ClientResponse<StoreResponse>> {
        console.log(`BulkApi.store`)
        if (data === null) {
            console.log("testStore: Cannot read json data")
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
        const result = await this.client.postWithTimeout(`bulk/store`, { body: data, params: "" })
        return result
    }

    async ids(clientId: string, count: number): Promise<ClientResponse<IdsResponse>> {
        console.log(`BulkApi.ids`)
        const result = await this.client.postWithTimeout(`bulk/ids`, { body: {}, params: `clientId=${clientId}&count=${count}` })
        return result as ClientResponse<IdsResponse>
    }

    async retrieve(nodeIds: string[], depth?: number): Promise<ClientResponse<RetrieveResponse>> {
        console.log(`BulkApi.retrieve ${nodeIds} with depth ${depth}`)
        const params = (depth === undefined) ? "" : `depthLimit=${depth}`
        const x = await this.client.postWithTimeout(`bulk/retrieve`, { body: { ids: nodeIds }, params: `${params}` })
        return x as ClientResponse<RetrieveResponse>
    }
}

