import { HttpClientErrors} from "./httpcodes.js";
import { LionWebJsonChunk } from "@lionweb/validation";
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js";
import { CreatePartitionsResponse, DeletePartitionsResponse, IdsResponse, ListPartitionsResponse, RetrieveResponse, StoreResponse } from "./responses.js";

/**
 * Client side Api for the lionweb-repository server.
 * Purpose is to ease the use of the lionweb-repository server.
 */
export class BulkApi {
    client: RepositoryClient
    
    constructor(client: RepositoryClient) {
        this.client = client
    }

    async listPartitions(): Promise<ClientResponse<ListPartitionsResponse>> {
        this.client.log(`BulkApi.listPartitions`)
        return await this.client.postWithTimeout("bulk/listPartitions", { body: {}, params: "" }) as ClientResponse<ListPartitionsResponse>
    }

    async createPartitions(data: LionWebJsonChunk): Promise<ClientResponse<CreatePartitionsResponse>> {
        this.client.log(`BulkApi.createPartitions`)
        if (data === null || data === undefined) {
            this.client.logError(`createPartitions: json data is '${data}'`)
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
        this.client.log(`BulkApi..deletePartitions '${partitionIds}'`)
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
            this.client.log(`testStore: Json data is '${data}'`)
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

    async ids(count: number): Promise<ClientResponse<IdsResponse>> {
        this.client.log(`BulkApi.ids count '${count}'`)
        return await this.client.postWithTimeout(`bulk/ids`, { body: {}, params: `count=${count}` })  as ClientResponse<IdsResponse>
    }

    async retrieve(nodeIds: string[], depth?: number): Promise<ClientResponse<RetrieveResponse>> {
        this.client.log(`BulkApi.retrieve '${nodeIds}' with depth '${depth}'`)
        const params = (depth === undefined) ? "" : `depthLimit=${depth}`
        return await this.client.postWithTimeout(`bulk/retrieve`, { body: { ids: nodeIds }, params: `${params}` }) as ClientResponse<RetrieveResponse>
    }
}

