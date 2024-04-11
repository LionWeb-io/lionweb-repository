import { Response } from "express"
import { LionWebJsonChunk } from "@lionweb/validation";

// "string" is needed as MessageKind can also be any of the ValidationIssue kinds.
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

export function isResponseMessage(object: unknown): object is ResponseMessage {
    return object["kind"] !== undefined &&
        typeof object["kind"] === "string"
        object["message"] !== undefined &&
        typeof object["message"] === "string"
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

export function lionwebResponse<T extends LionwebResponse>(response: Response, status: number, body: T): void {
    response.status(status)
    response.send(body)
}

export const EMPTY_SUCCES_RESPONSE: LionwebResponse = {
    success: true,
    messages: []
}

export const EMPTY_FAIL_RESPONSE: LionwebResponse = {
    success: false,
    messages: []
}


export type QueryReturnType<T> = {
    status: number
    query: string
    queryResult: T
}

