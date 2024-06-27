/**
 * Copy from database side code, to define the structure of the responses.
 */
import { LionWebJsonChunk } from "@lionweb/validation";
import { ClientResponse } from "./RepositoryClient.js";

export type MessageKind =
    "PartitionHasParent"
    | "Info"
    | "PartitionHasChildren"
    | "PartitionHasAnnotations"
    | "EmptyChunk"
    | "NullChunk"
    | "IdsIncorrect"
    | "PartitionAlreadyExists"
    | "NodeIsNotPartition"
    | "EmptyIdList"
    | "IdsNotFound"
    | "ParentMissing"
    | "NotImplemented"
    | "DepthLimitIncorrect"
    | string

export type ResponseMessage = {
    kind   : MessageKind
    message: string
    data?  : Record<string, string>
}

/**
 * Checks whether the _object_ is a ResponseMessage
 * @param object
 */
export function isResponseMessage(object: unknown): object is ResponseMessage {
    // @ts-expect-error TS7053
    return object["kind"] !== undefined &&
    // @ts-expect-error TS7053
    typeof object["kind"] === "string" &&
    // @ts-expect-error TS7053
    object["message"] !== undefined &&
    // @ts-expect-error TS7053
    typeof object["message"] === "string"
}

export interface LionwebResponse {
    success: boolean
    messages: ResponseMessage[]
}

export function getVersionFromResponse(response: ClientResponse<LionwebResponse>): number {
    return Number.parseInt(response.body.messages.find(m => m.data["version"] !== undefined).data["version"])
}

export interface RetrieveResponse extends LionwebResponse {
    chunk: LionWebJsonChunk
}

export interface ListPartitionsResponse extends LionwebResponse {
    chunk: LionWebJsonChunk
}

export interface StoreResponse extends LionwebResponse {
}

export interface CreatePartitionsResponse extends LionwebResponse {
}

export interface DeletePartitionsResponse extends LionwebResponse {
}

export interface IdsResponse extends LionwebResponse {
    ids: string[]
}

export interface ListRepositoriesResponse extends LionwebResponse {
    repositoryNames: string[]
}
