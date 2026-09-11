import type { CommandId } from "./DeltaTypes.js";
import type { String } from "./DeltaTypes.js";
import type { AdditionalInfo } from "./DeltaTypes.js";
import type { LionWebDeltaJsonChunk } from "./DeltaTypes.js";
import type { Boolean } from "./DeltaTypes.js";
import type { LionWebId } from "./Chunks.js";
import type { LionWebJsonMetaPointer } from "./Chunks.js";
import type { Number } from "./DeltaTypes.js";
// cannot find import for Command

export const DeltaCommandMessageKinds = [
    "AddPartition",
    "DeletePartition",
    "ChangeClassifier",
    "AddProperty",
    "ChangeProperty",
    "DeleteProperty",
    "AddChild",
    "DeleteChild",
    "ReplaceChild",
    "MoveChildFromContainmentInOtherParent",
    "MoveChildFromOtherContainmentInSameParent",
    "MoveChildInSameContainmentInSameParent",
    "MoveAndReplaceChildFromContainmentInOtherParent",
    "MoveAndReplaceChildFromOtherContainmentInSameParent",
    "MoveAndReplaceChildInSameContainmentInSameParent",
    "AddAnnotation",
    "DeleteAnnotation",
    "ReplaceAnnotation",
    "MoveAnnotationFromOtherParent",
    "MoveAnnotationInSameParent",
    "MoveAndReplaceAnnotationFromOtherParent",
    "MoveAndReplaceAnnotationInSameParent",
    "AddReference",
    "DeleteReference",
    "ChangeReference",
    "ContinuedCommand",
    "CompositeCommand",
] as const;

// The type for the tagged union property, derived from the above array
export type CommandMessageKind = (typeof DeltaCommandMessageKinds)[number];

// The overall "super-type"
export type DeltaCommand = {
    commandId: CommandId;
    messageKind: CommandMessageKind;
    additionalInfos: AdditionalInfo[];
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-AddPartition
 */
export type AddPartitionCommand = DeltaCommand & {
    newPartition: LionWebDeltaJsonChunk;
    split?: Boolean;
    messageKind: "AddPartition";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-DeletePartition
 */
export type DeletePartitionCommand = DeltaCommand & {
    deletedPartition: LionWebId;
    messageKind: "DeletePartition";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-ChangeClassifier
 */
export type ChangeClassifierCommand = DeltaCommand & {
    newClassifier: LionWebJsonMetaPointer;
    node: LionWebId;
    messageKind: "ChangeClassifier";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-AddProperty
 */
export type AddPropertyCommand = DeltaCommand & {
    node: LionWebId;
    property: LionWebJsonMetaPointer;
    newValue: String;
    messageKind: "AddProperty";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-ChangeProperty
 */
export type ChangePropertyCommand = DeltaCommand & {
    node: LionWebId;
    property: LionWebJsonMetaPointer;
    newValue: String;
    messageKind: "ChangeProperty";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-DeleteProperty
 */
export type DeletePropertyCommand = DeltaCommand & {
    node: LionWebId;
    property: LionWebJsonMetaPointer;
    messageKind: "DeleteProperty";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-AddChild
 */
export type AddChildCommand = DeltaCommand & {
    parent: LionWebId;
    newChild: LionWebDeltaJsonChunk;
    containment: LionWebJsonMetaPointer;
    index: Number;
    split?: Boolean;
    messageKind: "AddChild";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-DeleteChild
 */
export type DeleteChildCommand = DeltaCommand & {
    parent: LionWebId;
    deletedChild: LionWebId;
    containment: LionWebJsonMetaPointer;
    index: Number;
    messageKind: "DeleteChild";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-ReplaceChild
 */
export type ReplaceChildCommand = DeltaCommand & {
    parent: LionWebId;
    newChild: LionWebDeltaJsonChunk;
    containment: LionWebJsonMetaPointer;
    index: Number;
    replacedChild: LionWebId;
    split?: Boolean;
    messageKind: "ReplaceChild";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveChildFromContainmentInOtherParent
 */
export type MoveChildFromContainmentInOtherParentCommand = DeltaCommand & {
    newParent: LionWebId;
    newContainment: LionWebJsonMetaPointer;
    newIndex: Number;
    oldParent: LionWebId;
    oldContainment: LionWebJsonMetaPointer;
    oldIndex: Number;
    movedChild: LionWebId;
    messageKind: "MoveChildFromContainmentInOtherParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveChildFromOtherContainmentInSameParent
 */
export type MoveChildFromOtherContainmentInSameParentCommand = DeltaCommand & {
    parent: LionWebId;
    newContainment: LionWebJsonMetaPointer;
    newIndex: Number;
    oldContainment: LionWebJsonMetaPointer;
    oldIndex: Number;
    movedChild: LionWebId;
    messageKind: "MoveChildFromOtherContainmentInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveChildInSameContainmentInSameParent
 */
export type MoveChildInSameContainmentInSameParentCommand = DeltaCommand & {
    parent: LionWebId;
    containment: LionWebJsonMetaPointer;
    oldIndex: Number;
    indexOffset: Number;
    movedChild: LionWebId;
    messageKind: "MoveChildInSameContainmentInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveAndReplaceChildFromContainmentInOtherParent
 */
export type MoveAndReplaceChildFromContainmentInOtherParentCommand = DeltaCommand & {
    newParent: LionWebId;
    newContainment: LionWebJsonMetaPointer;
    newIndex: Number;
    oldParent: LionWebId;
    oldContainment: LionWebJsonMetaPointer;
    oldIndex: Number;
    replacedChild: LionWebId;
    movedChild: LionWebId;
    messageKind: "MoveAndReplaceChildFromContainmentInOtherParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveAndReplaceChildFromOtherContainmentInSameParent
 */
export type MoveAndReplaceChildFromOtherContainmentInSameParentCommand = DeltaCommand & {
    parent: LionWebId;
    newContainment: LionWebJsonMetaPointer;
    newIndex: Number;
    oldContainment: LionWebJsonMetaPointer;
    oldIndex: Number;
    replacedChild: LionWebId;
    movedChild: LionWebId;
    messageKind: "MoveAndReplaceChildFromOtherContainmentInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveAndReplaceChildInSameContainmentInSameParent
 */
export type MoveAndReplaceChildInSameContainmentInSameParentCommand = DeltaCommand & {
    parent: LionWebId;
    containment: LionWebJsonMetaPointer;
    oldIndex: Number;
    indexOffset: Number;
    replacedChild: LionWebId;
    movedChild: LionWebId;
    messageKind: "MoveAndReplaceChildInSameContainmentInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-AddAnnotation
 */
export type AddAnnotationCommand = DeltaCommand & {
    parent: LionWebId;
    newAnnotation: LionWebDeltaJsonChunk;
    index: Number;
    split?: Boolean;
    messageKind: "AddAnnotation";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-DeleteAnnotation
 */
export type DeleteAnnotationCommand = DeltaCommand & {
    parent: LionWebId;
    index: Number;
    deletedAnnotation: LionWebId;
    messageKind: "DeleteAnnotation";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-ReplaceAnnotation
 */
export type ReplaceAnnotationCommand = DeltaCommand & {
    parent: LionWebId;
    newAnnotation: LionWebDeltaJsonChunk;
    index: Number;
    replacedAnnotation: LionWebId;
    split?: Boolean;
    messageKind: "ReplaceAnnotation";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveAnnotationFromOtherParent
 */
export type MoveAnnotationFromOtherParentCommand = DeltaCommand & {
    newParent: LionWebId;
    newIndex: Number;
    oldParent: LionWebId;
    oldIndex: Number;
    movedAnnotation: LionWebId;
    messageKind: "MoveAnnotationFromOtherParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveAnnotationInSameParent
 */
export type MoveAnnotationInSameParentCommand = DeltaCommand & {
    parent: LionWebId;
    oldIndex: Number;
    indexOffset: Number;
    movedAnnotation: LionWebId;
    messageKind: "MoveAnnotationInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveAndReplaceAnnotationFromOtherParent
 */
export type MoveAndReplaceAnnotationFromOtherParentCommand = DeltaCommand & {
    newParent: LionWebId;
    newIndex: Number;
    oldParent: LionWebId;
    oldIndex: Number;
    replacedAnnotation: LionWebId;
    movedAnnotation: LionWebId;
    messageKind: "MoveAndReplaceAnnotationFromOtherParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-MoveAndReplaceAnnotationInSameParent
 */
export type MoveAndReplaceAnnotationInSameParentCommand = DeltaCommand & {
    parent: LionWebId;
    oldIndex: Number;
    indexOffset: Number;
    replacedAnnotation: LionWebId;
    movedAnnotation: LionWebId;
    messageKind: "MoveAndReplaceAnnotationInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-AddReference
 */
export type AddReferenceCommand = DeltaCommand & {
    parent: LionWebId;
    reference: LionWebJsonMetaPointer;
    index: Number;
    newReference?: LionWebId | null;
    newResolveInfo?: String | null;
    messageKind: "AddReference";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-DeleteReference
 */
export type DeleteReferenceCommand = DeltaCommand & {
    parent: LionWebId;
    reference: LionWebJsonMetaPointer;
    index: Number;
    deletedReference?: LionWebId | null;
    deletedResolveInfo?: String | null;
    messageKind: "DeleteReference";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-ChangeReference
 */
export type ChangeReferenceCommand = DeltaCommand & {
    parent: LionWebId;
    reference: LionWebJsonMetaPointer;
    index: Number;
    oldReference?: LionWebId | null;
    oldResolveInfo?: String | null;
    newReference?: LionWebId | null;
    newResolveInfo?: String | null;
    messageKind: "ChangeReference";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-ContinuedCommand
 */
export type ContinuedCommand = DeltaCommand & {
    chunk: LionWebDeltaJsonChunk;
    continuedChunkCompleted: Boolean;
    continuedChunkSequenceNumber: Number;
    messageKind: "ContinuedCommand";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#cmd-CompositeCommand
 */
export type CompositeCommand = DeltaCommand & {
    parts: DeltaCommand[];
    messageKind: "CompositeCommand";
};

// Type Guard function
export function isDeltaCommand(object: unknown): object is DeltaCommand {
    const castObject = object as DeltaCommand;
    return castObject.messageKind !== undefined && DeltaCommandMessageKinds.includes(castObject.messageKind);
}
