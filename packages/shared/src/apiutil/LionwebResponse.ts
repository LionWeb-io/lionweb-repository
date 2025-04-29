import { LionWebJsonChunk } from "@lionweb/json"

export const LionWebVersionValues = ["2023.1", "2024.1"] as const
export type LionWebVersionType = (typeof LionWebVersionValues)[number]

export function isLionWebVersion(v: string): v is LionWebVersionType {
    const s: readonly string[] = LionWebVersionValues
    return s.includes(v)
}

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

/**
 * Indicates the configuration of an existing repository.
 */
export interface RepositoryConfiguration {
    name: string
    lionweb_version: string
    history: boolean
}

export interface ListRepositoriesResponse extends LionwebResponse {
    repositories: RepositoryConfiguration[]
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
