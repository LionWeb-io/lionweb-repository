import { JsonContext } from "@lionweb/json-utils"
import { TypeDefinition, PrimitiveDef, expectedTypes, PropertyDef, PropertyDefinition, ValidationResult } from "@lionweb/validation"

// Make boolean argument more readable.
export const MAY_BE_NULL = true
export const NOT_NULL = false

const CommandKindProperty: PropertyDefinition = PropertyDef({ property: "kind", expectedType: "CommandKind", mayBeNull: NOT_NULL, validate: emptyValidation })
const ProtocolMessageProperty: PropertyDefinition = PropertyDef({
    property: "protocolMessage",
    expectedType: "ResponseMessage",
    mayBeNull: MAY_BE_NULL,
    isOptional: true,
})
// const ResponseMessage: PropertyDefinition = { property: "protocolMessage", expectedType: "ResponseMessage", mayBeNull: MAY_BE_NULL }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emptyValidation<T>(object: T, result: ValidationResult, ctx: JsonContext, pdef?: PropertyDefinition): void {}

export const commandMap: Map<string, TypeDefinition> = new Map<string, TypeDefinition>([
    ["AddPartition", [PropertyDef({ property: "newPartition", expectedType: "LionWebChunk" }), CommandKindProperty, ProtocolMessageProperty]],
    ["DeletePartition", [PropertyDef({ property: "deletedPartition", expectedType: "LionWebId" }), CommandKindProperty, ProtocolMessageProperty]],
    [
        "ChangeClassifier",
        [
            PropertyDef({ property: "node", expectedType: "LionWebId" }),
            PropertyDef({ property: "newClassifier", expectedType: "LionWebMetaPointer" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "addProperty",
        [
            PropertyDef({ property: "node", expectedType: "LionWebId", validate: emptyValidation }),
            PropertyDef({ property: "property", expectedType: "LionWebMetaPointer", validate: emptyValidation }),
            PropertyDef({ property: "newValue", expectedType: "string", validate: emptyValidation }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "DeleteProperty",
        [
            PropertyDef({ property: "node", expectedType: "LionWebId" }),
            PropertyDef({ property: "property", expectedType: "LionWebMetaPointer" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "ChangeProperty",
        [
            PropertyDef({ property: "node", expectedType: "LionWebId" }),
            PropertyDef({ property: "property", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "newValue", expectedType: "string" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "AddChild",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "newChild", expectedType: "LionWebChunk" }),
            PropertyDef({ property: "containment", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "DeleteChild",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "containment", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "ReplaceChild",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "newChild", expectedType: "LionWebChunk" }),
            PropertyDef({ property: "containment", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveChildFromOtherContainment",
        [
            PropertyDef({ property: "newParent", expectedType: "LionWebId" }),
            PropertyDef({ property: "movedChild", expectedType: "LionWebId" }),
            PropertyDef({ property: "newContainment", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveChildFromOtherContainmentInSameParent",
        [
            PropertyDef({ property: "newContainment", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "movedChild", expectedType: "LionWebId" }),
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveChildInSameContainment",
        [
            PropertyDef({ property: "movedChild", expectedType: "LionWebId" }),
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAndReplaceChildFromOtherContainment",
        [
            PropertyDef({ property: "newParent", expectedType: "LionWebId" }),
            PropertyDef({ property: "newContainment", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            PropertyDef({ property: "movedChild", expectedType: "LionWebId" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAndReplaceChildFromOtherContainmentInSameParent",
        [
            PropertyDef({ property: "newContainment", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            PropertyDef({ property: "movedChild", expectedType: "LionWebId" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAndReplaceChildInSameContainment",
        [
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            PropertyDef({ property: "movedChild", expectedType: "LionWebId" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "addAnnotation",
        [
            PropertyDef({ property: "newAnnotation", expectedType: "LionWebChunk" }),
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "deleteAnnotation",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "replaceAnnotation",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "newAnnotation", expectedType: "LionWebChunk" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAnnotationFromOtherParent",
        [
            PropertyDef({ property: "newParent", expectedType: "LionWebId" }),
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            PropertyDef({ property: "movedAnnotation", expectedType: "LionWebId" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAnnotationInSameParent",
        [
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            PropertyDef({ property: "movedAnnotation", expectedType: "LionWebId" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAndReplaceAnnotationFromOtherParent",
        [
            PropertyDef({ property: "newParent", expectedType: "LionWebId" }),
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            PropertyDef({ property: "movedAnnotation", expectedType: "LionWebId" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAndReplaceAnnotationInSameParent",
        [
            PropertyDef({ property: "newIndex", expectedType: "number" }),
            PropertyDef({ property: "movedAnnotation", expectedType: "LionWebId" }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "addReference",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "deleteReference",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "changeReference",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveEntryFromOtherReference",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveEntryFromOtherReferenceInSameParent",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveEntryInSameReference",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAndReplaceEntryFromOtherReference",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAndReplaceEntryFromOtherReferenceInSameParent",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "moveAndReplaceEntryInSameReference",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "addReferenceResolveInfo",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "deleteReferenceResolveInfo",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "changeReferenceResolveInfo",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "addReferenceTarget",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "deleteReferenceTarget",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "changeReferenceTarget",
        [
            PropertyDef({ property: "parent", expectedType: "LionWebId" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    [
        "composite",
        [
            PropertyDef({ property: "parts", expectedType: "CommandType" }),
            PropertyDef({ property: "reference", expectedType: "LionWebMetaPointer" }),
            PropertyDef({ property: "index", expectedType: "number" }),
            PropertyDef({ property: "newTarget", expectedType: "LionWebId" }),
            PropertyDef({ property: "newResolveInfo", expectedType: "string", mayBeNull: MAY_BE_NULL }),
            CommandKindProperty,
            ProtocolMessageProperty,
        ],
    ],
    ["CommandKind", PrimitiveDef({ primitiveType: "string", validate: emptyValidation })],
    ["string", PrimitiveDef({ primitiveType: "string", validate: emptyValidation })],
])

// Add any Map or Set to another
// function addAll(target: Map<string, TypeDefinition>, source: Map<string, TypeDefinition>) {
//     Array.from(source.entries()).forEach((it) => target.set(it[0], it[1]))
// }
// addAll(commandMap, expectedTypes)
