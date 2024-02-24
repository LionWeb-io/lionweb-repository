import { LionWebJsonChunk } from "@lionweb/validation";

export type ReponseMessage = {
    kind   : string
    message: string
    data   : object[]
}

export interface Response {
    success: boolean
    messages: ReponseMessage[]
}

export interface RetrieveResponse extends Response {
    chunk: LionWebJsonChunk
}

export interface PartitionsResponse extends Response {
    chunk: LionWebJsonChunk
}

export interface StoreResponse extends Response {
    chunk: LionWebJsonChunk
}

export interface CreatePartitionsResponse extends Response {
    chunk: LionWebJsonChunk
}

export interface DeletePartitionsResponse extends Response {
    chunk: LionWebJsonChunk
}
