import { LionWebTask, RepositoryData } from "@lionweb/server-database"
import { deltaLogger } from "@lionweb/server-logging"
import { repositoryStore } from "@lionweb/server-dbadmin"
import {
    DeltaAdminResponse,
    DeltaEvent,
    DeltaResponse,
    ErrorEvent,
    ErrorResponse,
    isDeltaAdminRequest,
    isDeltaEvent,
    MessageFromClient
} from "@lionweb/server-delta-shared"
import WebSocket from "ws"
import { newErrorDelta } from "../events.js"

/**
 * Allowed state transitions:
 * START     => connected
 * connected => signedOn
 * signedOn  => signedOff    NB should this not be "connected again?
 * signedOff => signedOn
 *
 * connected => disconnected
 * signedOn  => dicponnected
 * signedOff => disconnected */
export type ParticipationStatus = "connected" | "signedOn" | "signedOff" | "disconnected"

export class ParticipationAdmin {
    activeSockets: Map<WebSocket, Participation> = new Map<WebSocket, Participation>()

    newParticipation(socket: WebSocket): Participation {
        const part = new Participation(socket)
        this.activeSockets.set(socket, part)
        deltaLogger.info(`ParticipationInfo for socket ${part.participationId}`)
        return part
    }

    getParticipation(socket: WebSocket): Participation | undefined {
        return this.activeSockets.get(socket)
    }

    deleteParticipation(socket: WebSocket): void {
        const info = this.getParticipation(socket)
        if (info !== undefined) {
            this.oldParticipations.add(info)
            this.activeSockets.delete(socket)
        }
    }

    allParticipations(): Participation[] {
        return Array.from(this.activeSockets.values())
    }

    reconnect(socket: WebSocket, participation: Participation): void {
        this.oldParticipations.delete(participation)
        participation.socket = socket
        this.activeSockets.set(socket, participation)
    }
    /**
     * Keep old participations to be able to reconnect using the participation id.
     */
    oldParticipations: Set<Participation> = new Set<Participation>()
    
    findOldParticipation(participationId: string): Participation  | undefined {
        return Array.from(this.oldParticipations).find(p => p.participationId === participationId)
    }
}

export const PARTICIPATIONS = new ParticipationAdmin()

/**
 * Subscription information for added/deleted partitions
 */
export class ChangingPartitionsSubscription {
    creation: boolean = false
    deletion: boolean = false
    depth: number = 0
    
    autoSubscribe: boolean = false
    constructor() {
        
    }
}

/**
 * Info about a participation.
 */
export class Participation {
    /**
     * Just a number to ensure partitipation id's are uniquely numbered
     */
    static nextIdNumber = 0
    /**
     * The socket which created this participation
     */
    socket: WebSocket
    /**
     * The unique id of the participation
     */
    participationId: string = ""
    /**
     * The repository for this participation.
     */
    repositoryData: RepositoryData | undefined
    /**
     * The LionWeb delta protocol version
     */
    deltaProtocolVersion: string = ""
    /**
     * The first available number for the next event.
     */
    private eventSequenceNumber: number = 1
    /**
     * The state of this participation.
     */
    participationStatus: ParticipationStatus = "connected"
    /**
     * The partitions that this client is subscribed to
     */
    subscribedPartitions: Set<string> = new Set<string>()
    /**
     * Whether subscribed to adding and deleting partitions.
     */
    partitionChangesSubscription: ChangingPartitionsSubscription | undefined
    /**
     *
     * @param socket
     */
    constructor(socket: WebSocket) {
        this.socket = socket
        this.participationId = this.nextParticipationId()
    }

    async startParticipation(task: LionWebTask, clientId: string, repositoryId: string): Promise<void> {
        this.participationId = this.nextParticipationId()
        this.participationStatus = "signedOn"
        this.repositoryData = {
            clientId: clientId,
            repository: await repositoryStore.getRepository(task, repositoryId)
        }
        deltaLogger.info(`startParticipation repo '${repositoryId}' schema ${this.repositoryData?.repository?.schema_name}`)
    }

    lastSequenceNumber(): number {
        return (this.eventSequenceNumber - 1)
    }

    nextSequenceNumber(): number {
        return this.eventSequenceNumber++
    }

    private nextParticipationId(): string {
        return "participation-" + Participation.nextIdNumber++
    }

    send(msg: DeltaEvent | DeltaResponse | DeltaAdminResponse): void {
        if (isDeltaEvent(msg)) {
            msg.sequenceNumber = this.eventSequenceNumber++
        }
        this.socket.send(JSON.stringify(msg))
    }
}

/**
 * Check whether the `participation` is correct for executing the `delta` command/request.
 * @param delta
 * @param participation
 */
export const validateParticipation = (
    delta: MessageFromClient,
    participation: Participation | undefined
): ErrorEvent | ErrorResponse | undefined => {
    if (delta.messageKind === "SignOnRequest" || delta.messageKind === "ReconnectRequest") {
        return undefined
    }
    if (participation === undefined) {
        return newErrorDelta(
            "invalidParticipation",
            "Cannot perform delta request because there is no participation",
            delta,
            participation
        )
    } else if (isDeltaAdminRequest(delta)) {
        // Always ok, does not have tom be signedOn
        return undefined
    } else if (participation.participationStatus !== "signedOn" && delta.messageKind !== "SignOffRequest") {
        return newErrorDelta(
            "invalidParticipation",
            `Cannot perform ${delta.messageKind} command/request because participation status is ${participation.participationStatus}`,
            delta,
            participation,
            {
                additionalInfos: [
                    {
                        kind: "reason",
                        message: "Participation status incorrect, should be SignedOn",
                        data: {
                            participationStatus: participation.participationStatus
                        }

                    }
                ]
            }
        )
    }
    return undefined
}

