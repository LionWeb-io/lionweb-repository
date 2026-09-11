import type { String } from "./DeltaTypes.js";
import type { Number } from "./DeltaTypes.js";
import type { CommandSource } from "./DeltaTypes.js";
import type { AdditionalInfo } from "./DeltaTypes.js";
import type { LionWebId } from "./Chunks.js";
import type { LionWebJsonMetaPointer } from "./Chunks.js";
import type { LionWebDeltaJsonChunk } from "./DeltaTypes.js";
import type { Boolean } from "./DeltaTypes.js";
// cannot find import for Event

export const DeltaEventMessageKinds = [
    "ClassifierChanged",
    "PartitionAdded",
    "PartitionDeleted",
    "PropertyAdded",
    "PropertyDeleted",
    "PropertyChanged",
    "ChildAdded",
    "ChildDeleted",
    "ChildReplaced",
    "ChildMovedFromContainmentInOtherParent",
    "ChildMovedFromOtherContainmentInSameParent",
    "ChildMovedInSameContainmentInSameParent",
    "ChildMovedAndReplacedFromContainmentInOtherParent",
    "ChildMovedAndReplacedFromOtherContainmentInSameParent",
    "ChildMovedAndReplacedInSameContainmentInSameParent",
    "AnnotationAdded",
    "AnnotationDeleted",
    "AnnotationReplaced",
    "AnnotationMovedFromOtherParent",
    "AnnotationMovedInSameParent",
    "AnnotationMovedAndReplacedFromOtherParent",
    "AnnotationMovedAndReplacedInSameParent",
    "ReferenceAdded",
    "ReferenceDeleted",
    "ReferenceChanged",
    "ContinuedEvent",
    "CompositeEvent",
    "NoOpEvent",
    "ErrorEvent",
] as const;

// The type for the tagged union property, derived from the above array
export type EventMessageKind = (typeof DeltaEventMessageKinds)[number];

// The overall "super-type"
export type DeltaEvent = {
    messageKind: EventMessageKind;
    sequenceNumber: Number;
    originCommands: CommandSource[];
    additionalInfos: AdditionalInfo[];
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ClassifierChanged
 */
export type ClassifierChangedEvent = DeltaEvent & {
    node: LionWebId;
    oldClassifier: LionWebJsonMetaPointer;
    newClassifier: LionWebJsonMetaPointer;
    messageKind: "ClassifierChanged";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-PartitionAdded
 */
export type PartitionAddedEvent = DeltaEvent & {
    newPartition: LionWebDeltaJsonChunk;
    split?: Boolean;
    messageKind: "PartitionAdded";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-PartitionDeleted
 */
export type PartitionDeletedEvent = DeltaEvent & {
    deletedPartition: LionWebId;
    deletedDescendants: LionWebId[];
    messageKind: "PartitionDeleted";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-PropertyAdded
 */
export type PropertyAddedEvent = DeltaEvent & {
    node: LionWebId;
    property: LionWebJsonMetaPointer;
    newValue: String;
    messageKind: "PropertyAdded";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-PropertyDeleted
 */
export type PropertyDeletedEvent = DeltaEvent & {
    node: LionWebId;
    property: LionWebJsonMetaPointer;
    oldValue: String;
    messageKind: "PropertyDeleted";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-PropertyChanged
 */
export type PropertyChangedEvent = DeltaEvent & {
    node: LionWebId;
    property: LionWebJsonMetaPointer;
    newValue: String;
    oldValue: String;
    messageKind: "PropertyChanged";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildAdded
 */
export type ChildAddedEvent = DeltaEvent & {
    parent: LionWebId;
    containment: LionWebJsonMetaPointer;
    newChild: LionWebDeltaJsonChunk;
    index: Number;
    split?: Boolean;
    messageKind: "ChildAdded";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildDeleted
 */
export type ChildDeletedEvent = DeltaEvent & {
    parent: LionWebId;
    index: Number;
    containment: LionWebJsonMetaPointer;
    deletedChild: LionWebId;
    deletedDescendants: LionWebId[];
    messageKind: "ChildDeleted";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildReplaced
 */
export type ChildReplacedEvent = DeltaEvent & {
    parent: LionWebId;
    index: Number;
    containment: LionWebJsonMetaPointer;
    replacedChild: LionWebId;
    replacedDescendants: LionWebId[];
    newChild: LionWebDeltaJsonChunk;
    split?: Boolean;
    messageKind: "ChildReplaced";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildMovedFromContainmentInOtherParent
 */
export type ChildMovedFromContainmentInOtherParentEvent = DeltaEvent & {
    newParent: LionWebId;
    newIndex: Number;
    newContainment: LionWebJsonMetaPointer;
    oldParent: LionWebId;
    oldIndex: Number;
    oldContainment: LionWebJsonMetaPointer;
    movedChild: LionWebId;
    messageKind: "ChildMovedFromContainmentInOtherParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildMovedFromOtherContainmentInSameParent
 */
export type ChildMovedFromOtherContainmentInSameParentEvent = DeltaEvent & {
    parent: LionWebId;
    newIndex: Number;
    newContainment: LionWebJsonMetaPointer;
    oldIndex: Number;
    oldContainment: LionWebJsonMetaPointer;
    movedChild: LionWebId;
    messageKind: "ChildMovedFromOtherContainmentInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildMovedInSameContainmentInSameParent
 */
export type ChildMovedInSameContainmentInSameParentEvent = DeltaEvent & {
    parent: LionWebId;
    indexOffset: Number;
    containment: LionWebJsonMetaPointer;
    oldIndex: Number;
    movedChild: LionWebId;
    messageKind: "ChildMovedInSameContainmentInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildMovedAndReplacedFromContainmentInOtherParent
 */
export type ChildMovedAndReplacedFromContainmentInOtherParentEvent = DeltaEvent & {
    newParent: LionWebId;
    newIndex: Number;
    newContainment: LionWebJsonMetaPointer;
    oldParent: LionWebId;
    oldIndex: Number;
    oldContainment: LionWebJsonMetaPointer;
    movedChild: LionWebId;
    replacedDescendants: LionWebId[];
    replacedChild: LionWebId;
    messageKind: "ChildMovedAndReplacedFromContainmentInOtherParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildMovedAndReplacedFromOtherContainmentInSameParent
 */
export type ChildMovedAndReplacedFromOtherContainmentInSameParentEvent = DeltaEvent & {
    parent: LionWebId;
    newIndex: Number;
    newContainment: LionWebJsonMetaPointer;
    movedChild: LionWebId;
    oldIndex: Number;
    oldContainment: LionWebJsonMetaPointer;
    replacedDescendants: LionWebId[];
    replacedChild: LionWebId;
    messageKind: "ChildMovedAndReplacedFromOtherContainmentInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ChildMovedAndReplacedInSameContainmentInSameParent
 */
export type ChildMovedAndReplacedInSameContainmentInSameParentEvent = DeltaEvent & {
    parent: LionWebId;
    indexOffset: Number;
    containment: LionWebJsonMetaPointer;
    movedChild: LionWebId;
    oldIndex: Number;
    replacedDescendants: LionWebId[];
    replacedChild: LionWebId;
    messageKind: "ChildMovedAndReplacedInSameContainmentInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-AnnotationAdded
 */
export type AnnotationAddedEvent = DeltaEvent & {
    parent: LionWebId;
    newAnnotation: LionWebDeltaJsonChunk;
    index: Number;
    split?: Boolean;
    messageKind: "AnnotationAdded";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-AnnotationDeleted
 */
export type AnnotationDeletedEvent = DeltaEvent & {
    parent: LionWebId;
    deletedAnnotation: LionWebId;
    deletedDescendants: LionWebId[];
    index: Number;
    messageKind: "AnnotationDeleted";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-AnnotationReplaced
 */
export type AnnotationReplacedEvent = DeltaEvent & {
    parent: LionWebId;
    index: Number;
    replacedAnnotation: LionWebId;
    replacedDescendants: LionWebId[];
    newAnnotation: LionWebDeltaJsonChunk;
    split?: Boolean;
    messageKind: "AnnotationReplaced";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-AnnotationMovedFromOtherParent
 */
export type AnnotationMovedFromOtherParentEvent = DeltaEvent & {
    newParent: LionWebId;
    newIndex: Number;
    movedAnnotation: LionWebId;
    oldParent: LionWebId;
    oldIndex: Number;
    messageKind: "AnnotationMovedFromOtherParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-AnnotationMovedInSameParent
 */
export type AnnotationMovedInSameParentEvent = DeltaEvent & {
    parent: LionWebId;
    indexOffset: Number;
    movedAnnotation: LionWebId;
    oldIndex: Number;
    messageKind: "AnnotationMovedInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-AnnotationMovedAndReplacedFromOtherParent
 */
export type AnnotationMovedAndReplacedFromOtherParentEvent = DeltaEvent & {
    newParent: LionWebId;
    newIndex: Number;
    movedAnnotation: LionWebId;
    oldParent: LionWebId;
    oldIndex: Number;
    replacedAnnotation: LionWebId;
    replacedDescendants: LionWebId[];
    messageKind: "AnnotationMovedAndReplacedFromOtherParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-AnnotationMovedAndReplacedInSameParent
 */
export type AnnotationMovedAndReplacedInSameParentEvent = DeltaEvent & {
    parent: LionWebId;
    indexOffset: Number;
    movedAnnotation: LionWebId;
    oldIndex: Number;
    replacedAnnotation: LionWebId;
    replacedDescendants: LionWebId[];
    messageKind: "AnnotationMovedAndReplacedInSameParent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ReferenceAdded
 */
export type ReferenceAddedEvent = DeltaEvent & {
    parent: LionWebId;
    index: Number;
    reference: LionWebJsonMetaPointer;
    newReference?: LionWebId | null;
    newResolveInfo?: String | null;
    messageKind: "ReferenceAdded";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ReferenceDeleted
 */
export type ReferenceDeletedEvent = DeltaEvent & {
    parent: LionWebId;
    index: Number;
    reference: LionWebJsonMetaPointer;
    deletedReference?: LionWebId | null;
    deletedResolveInfo?: String | null;
    messageKind: "ReferenceDeleted";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ReferenceChanged
 */
export type ReferenceChangedEvent = DeltaEvent & {
    parent: LionWebId;
    index: Number;
    reference: LionWebJsonMetaPointer;
    newReference?: LionWebId | null;
    newResolveInfo?: String | null;
    oldReference?: LionWebId | null;
    oldResolveInfo?: String | null;
    messageKind: "ReferenceChanged";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ContinuedEvent
 */
export type ContinuedEvent = DeltaEvent & {
    chunk: LionWebDeltaJsonChunk;
    continuedChunkCompleted: Boolean;
    continuedChunkSequenceNumber: Number;
    continuedEventSequenceNumber: Number;
    messageKind: "ContinuedEvent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-CompositeEvent
 */
export type CompositeEvent = DeltaEvent & {
    parts: DeltaEvent[];
    messageKind: "CompositeEvent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-NoOpEvent
 */
export type NoOpEvent = DeltaEvent & {
    messageKind: "NoOpEvent";
};

/**
 *  @see https://lionWeb.io/specification/delta/delta-api.html#evnt-ErrorEvent
 */
export type ErrorEvent = DeltaEvent & {
    errorCode: String;
    message: String;
    messageKind: "ErrorEvent";
};

// Type Guard function
export function isDeltaEvent(object: unknown): object is DeltaEvent {
    const castObject = object as DeltaEvent;
    return castObject.messageKind !== undefined && DeltaEventMessageKinds.includes(castObject.messageKind);
}
