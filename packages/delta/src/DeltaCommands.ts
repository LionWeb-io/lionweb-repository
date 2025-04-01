import { ResponseMessage } from "@lionweb/repository-shared"
import { LionWebJsonChunk, LionWebJsonMetaPointer, LionWebId } from "@lionweb/validation"

export type CommandKind = "addProperty" | "deleteProperty" | "changeProperty" | "addChild" | "deleteChild"

export type ICommand = {
    kind: CommandKind
    commandId: string
    protocolMessage: ResponseMessage
}

/**
 * Delta that does nothing.
 * Warning: should only be used for development purposes!
 */
export type NoOpCommand = ICommand

/**
 * Add `newValue` as value of `property` property to `node`.
 */
export type AddPropertyCommand = ICommand & {
    node: LionWebId
    property: LionWebJsonMetaPointer
    newValue: string
}

/**
 * Delete existing `property` with oldValue from `node`.
 */
export type DeletePropertyCommand = ICommand & {
    node: LionWebId
    property: LionWebJsonMetaPointer
}

/**
 * Change existing `property` of `node` to `newValue`.
 */
export type ChangePropertyCommand = ICommand & {
    node: LionWebId
    property: LionWebJsonMetaPointer
    newValue: string
}

/**
 * Add new node `newChild` to `parent` in `containment` at `index`.
 * `newChild` might be a single node or an arbitrary complex subtree.
 * All nodes in that subtree MUST be new, i.e. their id MUST NOT exist in the repository.
 * Nodes in that subtree MAY have references to already existing nodes, and already existing nodes MAY have references to nodes in that subtree.{fn-org327}
 */
export type AddChildCommand = ICommand & {
    parent: LionWebId
    containment: LionWebJsonMetaPointer
    index: number
    newChild: LionWebJsonChunk
}

/**
 * Delete existing node from `parent`'s `containment` at `index`, and all its descendants (including annotation instances).
 * Does NOT change references to any of the deleted nodes.{fn-org285}
 */
export type DeleteChildCommand = ICommand & {
    parent: LionWebId
    containment: LionWebJsonMetaPointer
    index: number
}

/**
 * Delete current child inside parent's `containment` at `index`, and all its descendants (including annotation instances).
 * Does NOT change references to any of the deleted nodes.{fn-org285}
 *
 * Replace existing node inside parent's `containment` at `index` with new node `newChild`.
 * `newChild` might be a single node or an arbitrary complex subtree.
 * All nodes in that subtree MUST be new, i.e. their id MUST NOT exist in the repository.
 * Nodes in that subtree MAY have references to already existing nodes, and already existing nodes MAY have references to nodes in that subtree.{fn-org327}
 */
export type ReplaceChildCommand = ICommand & {
    parent: LionWebId
    containment: LionWebJsonMetaPointer
    index: number
    newChild: LionWebJsonChunk
}

/**
 * Move existing node `movedChild` inside ``newParent``'s `newContainment` at `newIndex`.
 */
export type MoveChildFromOtherContainment = ICommand & {
    newParent: LionWebId
    newContainment: LionWebJsonMetaPointer
    newIndex: number
    movedChild: LionWebId
}

/**
 * Move existing node `movedChild` (currently inside one of ``movedChild``'s parent's containments other than `newContainment`)
 * inside ``movedChild``'s parent's `newContainment` at `newIndex`.
 */
export type MoveChildFromOtherContainmentInSameParent = ICommand & {
    newContainment: LionWebJsonMetaPointer
    newIndex: number
    movedChild: LionWebId
}

/**
 * Move existing node `movedChild` within its current containment to `newIndex`.
 */
export type MoveChildInSameContainment = ICommand & {
    newIndex: number
    movedChild: LionWebId
}

/**
 * Move existing node `movedChild` inside ``newParent``'s `newContainment` at `newIndex`.
 * Delete current child inside ``newParent``'s `newContainment` at `newIndex`, and all its descendants (including annotation instances).
 * Does NOT change references to any of the deleted nodes.{fn-org285}
 */
export type MoveAndReplaceChildFromOtherContainmentCommand = ICommand & {
    newParent: LionWebId
    newContainment: LionWebJsonMetaPointer
    newIndex: number
    movedChild: LionWebId
}

/**
 * Move existing node `movedChild` (currently inside one of ``movedChild``'s parent's containments other than `newContainment`)
 * inside ``movedChild``'s parent's `newContainment` at `newIndex`.
 * Delete current child inside ``movedChild``'s parent's `newContainment` at `newIndex`, and all its descendants (including annotation instances).
 * Does NOT change references to any of the deleted nodes.{fn-org285}
 */
export type moveAndReplaceChildFromOtherContainmentInSameParent = ICommand & {
    newContainment: LionWebJsonMetaPointer
    newIndex: number
    movedChild: LionWebId
}
/**
 * Move existing node `movedChild` within its current containment to `newIndex`.
 * Delete current child inside the same containment at `newIndex`, and all its descendants (including annotation instances).
 * Does NOT change references to any of the deleted nodes.{fn-org285}
 */
export type MoveAndReplaceChildInSameContainmentCommand = ICommand & {
    newIndex: number
    movedChild: LionWebId
}

/**
 * Add new node `newAnnotation` to ``parent``'s annotations at `index`.
 * `newAnnotation` might be a single node or an arbitrary complex subtree.
 * All nodes in that subtree MUST be new, i.e. their id MUST NOT exist in the repository.
 * Nodes in that subtree MAY have references to already existing nodes, and already existing nodes MAY have references to nodes in that subtree.{fn-org327}
 */
export type AddAnnotationCommand = ICommand & {
    parent: LionWebId
    newAnnotation: LionWebJsonChunk
    index: number
}

/**
 * Delete existing node from ``parent``'s annotations at `index`, and all its descendants (including annotation instances).
 * Does NOT change references to any of the deleted nodes.{fn-org285}
 */
export type DeleteAnnotationCommand = ICommand & {
    parent: LionWebId
    index: number
}

/**
 * Delete current node at ``parent``'s annotations at `index`, and all its descendants (including annotation instances).
 * Does NOT change references to any of the deleted nodes.{fn-org285}
 *
 * Replace existing node inside ``parent``'s annotations at `index` with new node `newAnnotation`.
 * `newAnnotation` might be a single node or an arbitrary complex subtree.
 * All nodes in that subtree MUST be new, i.e. their id MUST NOT exist in the repository.
 * Nodes in that subtree MAY have references to already existing nodes, and already existing nodes MAY have references to nodes in that subtree.{fn-org327}
 */
export type ReplaceAnnotationCommand = ICommand & {
    parent: LionWebId
    newAnnotation: LionWebJsonChunk
    index: number
}

// TODO The rest

export function toCommand(object: unknown): ICommand | undefined {
    // @ts-expect-error TS18046
    const kind = object["kind"] as CommandKind
    switch (kind) {
        case "addChild": {
            // TODO Check all properties
            return object as AddChildCommand
        }
    }
    return undefined
}
