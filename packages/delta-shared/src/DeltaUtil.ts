
import {
    AddAnnotationCommand,
    AddChildCommand,
    AdditionalInfo,
    AddPartitionCommand,
    ContinuedCommand,
    DeltaAdminRequest,
    DeltaAdminResponse,
    DeltaCommand,
    DeltaEvent,
    DeltaRequest,
    DeltaResponse,
    ErrorEvent,
    ErrorResponse,
    ParticipationId,
    ReplaceAnnotationCommand,
    ReplaceChildCommand
} from "./types/index.js"

export type MessageFromClient = DeltaCommand | DeltaRequest | DeltaAdminRequest
export type MessageToClient = DeltaEvent | DeltaResponse | DeltaAdminResponse

export function findDistributableInfos(delta: MessageFromClient | MessageToClient): AdditionalInfo[] {
    return delta.additionalInfos.filter(info => info.distribute)
}

export type MonitorMessage = {
    messageKind: "Monitor"
    clientId: string
    repository: string
    delta: MessageToClient | MessageFromClient
}

export function isMonitorMessage(object: object): object is MonitorMessage {
    return (object as any)["messageKind"] === "Monitor"
}

export type ErrorDelta = ErrorEvent | ErrorResponse

export function isErrorEvent(object: unknown): object is ErrorEvent {
    return (object as ErrorEvent)?.messageKind === "ErrorEvent"
}
export function isErrorResponse(object: unknown): object is ErrorResponse {
    return (object as ErrorResponse)?.messageKind === "ErrorResponse"
}

export function isAddPartitionCommand(object: DeltaCommand): object is AddPartitionCommand {
    return object.messageKind === "AddPartition"
}

export type SplitCommandType = AddPartitionCommand | AddChildCommand | ReplaceChildCommand | AddAnnotationCommand | ReplaceAnnotationCommand

export function isNewChildCommand(object: DeltaCommand): object is AddChildCommand | ReplaceChildCommand {
    return object.messageKind === "AddChild" || object.messageKind === "ReplaceChild"
}
export function isNewAnnotationCommand(object: DeltaCommand): object is AddAnnotationCommand | ReplaceAnnotationCommand {
    return object.messageKind === "AddAnnotation" || object.messageKind === "ReplaceAnnotation"
}
export function isContinuedCommand(object: MessageFromClient): object is ContinuedCommand {
    return object.messageKind === "ContinuedCommand" 
}
    
export function isSplitCommand(object: MessageFromClient): object is SplitCommandType {
    return (object as any)["split"] === true
}

export function validateSequenceNumber(): string {
    return ""
}


