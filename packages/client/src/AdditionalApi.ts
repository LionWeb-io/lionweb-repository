import { LionwebResponse } from "@lionweb/repository-shared"
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js"
import {BulkImport} from "@lionweb/repository-additionalapi";

export enum TransferFormat {
    JSON= 'json',
    PROTOBUF = 'protobuf',
    FLATBUFFERS = 'flatbuffers'
}

export class AdditionalApi {
    client: RepositoryClient

    constructor(client: RepositoryClient) {
        this.client = client
    }

    async getNodeTree(nodeIds: string[]): Promise<ClientResponse<LionwebResponse>> {
        this.client.log(`AdditionalApi.getNodeTree`)
        return await this.client.postWithTimeout(`additional/getNodeTree`, { body: { ids: nodeIds }, params: "" })
    }

    async bulkImport(bulkImport: BulkImport, transferFormat: TransferFormat, compress: boolean) : Promise<ClientResponse<LionwebResponse>> {
        this.client.log(`AdditionalApi.store transferFormat=${transferFormat}, compress=${compress}`)
        if (transferFormat == TransferFormat.JSON) {
            if (compress) {
                throw new Error("Not yet supported")
            }
            return await this.client.postWithTimeout(`additional/bulkImport`, { body: bulkImport, params: "" })
        } else {
            throw new Error("Not yet supported")
        }
    }
}
