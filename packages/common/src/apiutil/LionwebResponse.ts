import { Response } from "express"
import { LionWebJsonChunk } from "@lionweb/validation";

export type ResponseMessage = {
    kind   : string
    message: string
    data?  : object[]
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

export function lionwebResponse<T extends LionwebResponse>(res: Response, status: number, body: T): void {
    res.status(status)
    res.send(body)
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

