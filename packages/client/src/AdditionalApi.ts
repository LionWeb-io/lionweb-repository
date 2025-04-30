import { LionwebResponse } from "@lionweb/repository-shared"
import { ClientResponse, RepositoryClient } from "./RepositoryClient.js"
import {BulkImport} from "@lionweb/repository-additionalapi";

enum TransferFormat {
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

    async bulkImport(bulkImport: BulkImport, transferFormat: TransferFormat, compress: boolean) : Promise<void> {
        if (transferFormat == TransferFormat.JSON) {
            if (compress) {
                throw new Error("Not yet supported")
            }
            let body = {};
            let bodyAttachPoints = [];
            bulkImport.attachPoints.forEach(attachPoint => {
               let jContainment = {
                   "language": attachPoint.containment.language,
                   "version": attachPoint.containment.version,
                   "key": attachPoint.containment.key
               }
               let jEl = {
                   "container": attachPoint.container,
                   "root": attachPoint.root,
                   "containment": jContainment
               }
                bodyAttachPoints.push(jEl);
            });
            let bodyNodes = this.client.
        //     JsonArray bodyNodes =
        //         conf.getJsonSerialization()
        //             .serializeTreesToJsonElement(
        //                 bulkImport.getNodes().toArray(new ClassifierInstance<?>[0]))
        // .getAsJsonObject()
        //         .get("nodes")
        //         .getAsJsonArray();
        //     body.add("attachPoints", bodyAttachPoints);
        //     body.add("nodes", bodyNodes);
        //     String bodyJson = new Gson().toJson(body);
        //
        //     RequestBody requestBody = RequestBody.create(JSON, bodyJson);
        //     requestBody = considerCompression(requestBody, compression);
        //     bulkImport(requestBody, compression);
        } else {
            throw new Error("Not yet supported")
        }
    }
}
