import { getStringParam, HttpClientErrors, isParameterError, lionwebResponse, StoreResponse } from "@lionweb/repository-common"
import { getRepositoryData } from "@lionweb/repository-dbadmin"
import e, { Request, Response } from "express"
import { InspectionContext } from "../main.js"
import { ClassifierNodes, LanguageNodes } from "../database/InspectionApiWorker.js"

export interface InspectionApi {
    nodesByClassifier(request: Request, response: Response): void

    nodesByLanguage(request: Request, response: Response): void
}

/**
 * We use this class to track a cursor over a Buffer and to
 * allocate a new one when necessary.
 */
class BufferHolder {
    private buffer = Buffer.alloc(1000000)
    private usedSize: number = 0
    getBuffer() {
        // We return only the part of the buffer actually filled with data
        return this.buffer.subarray(0, this.usedSize)
    }

    write(string: string): void {
        const stringLength = Buffer.byteLength(string)
        const remainingSize = this.buffer.length - this.usedSize
        if (remainingSize < stringLength) {
            const oldBuffer = this.buffer
            this.buffer = Buffer.alloc(oldBuffer.length * 2)
            oldBuffer.copy(this.buffer)
            // Perhaps we need to grow again the buffer, so we make
            // another call to this method to re-check the size
            return this.write(string)
        } else {
            this.buffer.write(string, this.usedSize)
            this.usedSize += stringLength
        }
    }
}

class InspectionApiImpl implements InspectionApi {
    constructor(private context: InspectionContext) {}

    private serializeInBufferIDsList(buffer: BufferHolder, ids: string[], limit: number) {
        const idsToSend = limit < 0 || limit >= ids.length ? ids : ids.slice(0, limit)
        idsToSend.forEach((id, index) => {
            if (index != 0) {
                buffer.write(",\n")
            }
            buffer.write(`"${id}"`)
        })
    }

    private classifierNodesToBuffer(classifierNodes: ClassifierNodes[], limit: number): Buffer {
        const bufferHolder = new BufferHolder()
        bufferHolder.write("[")
        classifierNodes.forEach((element, index) => {
            if (index != 0) {
                bufferHolder.write(",")
            }
            bufferHolder.write(`{"language":"${element.language}",`)
            bufferHolder.write(`"classifier":"${element.classifier}",`)
            bufferHolder.write(`"ids":[`)
            this.serializeInBufferIDsList(bufferHolder, element.ids, limit)
            bufferHolder.write(`], "size":${element.size}}\n`)
        })
        bufferHolder.write("]")
        return bufferHolder.getBuffer()
    }

    private languageNodesToBuffer(languageNodes: LanguageNodes[], limit: number): Buffer {
        const bufferHolder = new BufferHolder()
        bufferHolder.write("[")
        languageNodes.forEach((element, index) => {
            if (index != 0) {
                bufferHolder.write(",")
            }
            bufferHolder.write(`{"language":"${element.language}",`)
            bufferHolder.write(`"ids":[`)
            this.serializeInBufferIDsList(bufferHolder, element.ids, limit)
            bufferHolder.write(`], "size":${element.size}}`)
        })
        bufferHolder.write("]")
        return bufferHolder.getBuffer()
    }

    nodesByClassifier = async (request: e.Request, response: e.Response) => {
        let clientId = getStringParam(request, "clientId")
        // TODO Change using new repository structure
        if (isParameterError(clientId)) {
            // Allow call without client id
            clientId = "Dummy"
        }
        const repositoryData = getRepositoryData(request, "Dummy")
        if (isParameterError(repositoryData)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repositoryData.error]
            })
        } else {
            const sql = this.context.inspectionQueries.nodesByClassifier()
            const queryResult = await this.context.inspectionApiWorker.nodesByClassifier(repositoryData, sql)
            const limitStr = request.query.limit
            // TODO handle the case in which multiple query parameters are specified
            const limit: number = limitStr === undefined ? -1 : parseInt(limitStr as string, 10)
            response.send(this.classifierNodesToBuffer(queryResult, limit))
        }
    }

    nodesByLanguage = async (request: e.Request, response: e.Response) => {
        const repositoryData = getRepositoryData(request, "Dummy")
        if (isParameterError(repositoryData)) {
            lionwebResponse<StoreResponse>(response, HttpClientErrors.PreconditionFailed, {
                success: false,
                messages: [repositoryData.error]
            })
        } else {
            const sql = this.context.inspectionQueries.nodesByLanguage()
            const queryResult = await this.context.inspectionApiWorker.nodesByLanguage(repositoryData, sql)
            const limitStr = request.query.limit
            // TODO handle the case in which multiple query parameters are specified
            const limit: number = limitStr === undefined ? -1 : parseInt(limitStr as string, 10)
            response.send(this.languageNodesToBuffer(queryResult, limit))
        }
    }
}

export function createInspectionApi(context: InspectionContext): InspectionApi {
    return new InspectionApiImpl(context)
}
