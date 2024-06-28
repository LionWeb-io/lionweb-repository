/**
 * Copy from database side code, to define the structure of the responses.
 */
import { LionWebJsonChunk } from "@lionweb/validation";

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
export function isResponseMessage(object: { [key: string]: unknown }): object is ResponseMessage {
    return object["kind"] !== undefined && typeof object["kind"] === "string" &&
    object["message"] !== undefined && typeof object["message"] === "string"
}

export interface LionwebResponse {
    success: boolean
    messages: ResponseMessage[]
}

export interface RetrieveResponse extends LionwebResponse {
    chunk: LionWebJsonChunk
}

export interface PartitionsResponse extends LionwebResponse {
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
