import { Response } from "express"
import { LionWebJsonChunk } from "@lionweb/validation"
import { JsonStreamStringify } from "json-stream-stringify"

// "string" is needed as MessageKind can also be any of the ValidationIssue kinds.
export type MessageKind =
    | "PartitionHasParent"
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
    kind: MessageKind
    message: string
    data?: Record<string, string>
}

/**
 * Checks whether the _object_ is a ResponseMessage
 * @param object
 */
export function isResponseMessage(object: unknown): object is ResponseMessage {
    const castObject = object as ResponseMessage
    return (
        castObject.kind !== undefined &&
        typeof castObject.kind === "string" &&
        castObject.message !== undefined &&
        typeof castObject.message === "string"
    )
}

export interface LionwebResponse {
    success: boolean
    messages: ResponseMessage[]
}

export interface RetrieveResponse extends LionwebResponse {
    chunk: LionWebJsonChunk
}

export interface ListPartitionsResponse extends LionwebResponse {
    chunk: LionWebJsonChunk
}

export interface StoreResponse extends LionwebResponse {}

export interface CreatePartitionsResponse extends LionwebResponse {}

export interface DeletePartitionsResponse extends LionwebResponse {}

export interface IdsResponse extends LionwebResponse {
    ids: string[]
}

export interface ListRepositoriesResponse extends LionwebResponse {
    repositoryNames: string[]
}

export function lionwebResponse<T extends LionwebResponse>(response: Response, status: number, body: T): void {
    response.status(status)
    new JsonStreamStringify(body).pipe(response)
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
