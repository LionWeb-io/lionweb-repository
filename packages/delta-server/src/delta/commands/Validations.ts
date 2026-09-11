import { isNullOrUndefined, isProperTree, notNullOrUndefined } from "@lionweb/server-common"
import {
    ChangeReferenceCommand,
    DeleteReferenceCommand,
    DeltaCommand,
    LionWebDeltaJsonChunk,
    LionWebId,
    LionWebJsonContainment,
    LionWebJsonMetaPointer,
    LionWebJsonReference,
    LionWebJsonReferenceTarget
} from "@lionweb/server-delta-shared"
import { isEqualMetaPointer, isEqualReferenceTarget, LionWebJsonNode, LionWebJsonProperty } from "@lionweb/json"
import { newErrorDelta } from "../events.js"
import { Participation } from "../participation/index.js"
import { issuesToAdditionalInfo } from "./DeltaUtil.js"

export type ChangeType = "Add" | "Replace" | "Delete"

/**
 * 
 * @param nodes
 * @param parent
 * @param msg
 * @param participation
 * @returns             The root node of the tree built from `nodes`
 */
export function validateProperTree(nodes: LionWebDeltaJsonChunk, parent: LionWebId | null, msg: DeltaCommand, participation: Participation): LionWebJsonNode {
    // - There is exactly one node with parent `parentNode`, called `rootNode`
    // - All nodes together form a proper tree with root `rootNode`, i.e. no orphans allowed
    //   This can be done through the LionwebReferenceValidator.
    const issues = isProperTree(nodes)
    if (issues.length > 0) {
        throw newErrorDelta("chunkIsNotATree", `the newChild chunk is not a proper tree`, msg, participation, {
            additionalInfos: issuesToAdditionalInfo(issues)
        })
    }
    const rootNode = nodes.nodes.find(node => node.parent === parent )
    if (rootNode === undefined) {
        // TODO this check can be moved to the ReferenceValidator by giving the `parent` as parameter
        throw newErrorDelta("childNotFound", `The newChild chunk does not contain a node with parent ${parent}`, msg, participation)
    }
    return rootNode
}

/**
 * Find ` containment` within `node`, return undefined when there is no such containment
 * @param node
 * @param containmentMP
 */
export function findContainment(
    node: LionWebJsonNode,
    containmentMP: LionWebJsonMetaPointer,
): LionWebJsonContainment | undefined {
    return node.containments.find(c => isEqualMetaPointer(c.containment, containmentMP))
}

/**
 * Find ` containment` within `node`, throw an exception if there is no such containment.
 * @param node
 * @param containmentMP
 * @param msg           The command that triggers this function.
 * @param participation The participation that is active. 
 */
export function findAndValidateContainment(
    node: LionWebJsonNode,
    containmentMP: LionWebJsonMetaPointer,
    msg: DeltaCommand,
    participation: Participation
): LionWebJsonContainment {
    const containment = findContainment(node, containmentMP)
    if (containment === undefined) {
        throw newErrorDelta(
            "unknownContainment",
            `Containment '${JSON.stringify(containmentMP)}' does not exists in node '${node.id}'`,
            msg,
            participation
        )
    }
    return containment
}

/**
 * Valiodate that  property` within `node` does not exist, throw an exception if there is such property.
 *
 * @param node          The node that should contain the property.
 * @param propertyMP    The property metapointer to find.
 * @param msg           The command that triggers this function.
 * @param participation The participation that is active.
 */
export function validatePropertyDoesNotExist(
    node: LionWebJsonNode,
    propertyMP: LionWebJsonMetaPointer,
    msg: DeltaCommand,
    participation: Participation
): void {
    const property = node.properties.find(c => isEqualMetaPointer(c.property, propertyMP))
    if (notNullOrUndefined(property)) {
        throw newErrorDelta(
            "propertyAlreadyExists",
            `Property '${JSON.stringify(propertyMP)}' already exists in node '${node.id}' with value '${property.value}'`,
            msg,
            participation
        )
    }
}

/**
 * Find ` property` within `node`, throw an exception if there is no such property.
 * 
 * @param node          The node that should contain the property.
 * @param propertyMP    The property metapointer to find.
 * @param msg           The command that triggers this function.
 * @param participation The participation that is active.
 */
export function findAndValidateProperty(
    node: LionWebJsonNode,
    propertyMP: LionWebJsonMetaPointer,
    msg: DeltaCommand,
    participation: Participation
): LionWebJsonProperty {
    const property = node.properties.find(c => isEqualMetaPointer(c.property, propertyMP))
    if (property === undefined) {
        throw newErrorDelta(
            "unknownProperty",
            `Property '${JSON.stringify(propertyMP)}' does not exists in node '${node.id}'`,
            msg,
            participation
        )
    }
    return property
}

/**
 * 
 * @param property
 * @param newValue
 * @param msg
 * @param participation
 */
export function validatePropertyHasChanged(property: LionWebJsonProperty, newValue: string, msg: DeltaCommand, participation: Participation): void {
    if (property.value === newValue) {
        throw newErrorDelta(
            "generic",
            `The property with key '${property.property.key}' already has value ${property.value}`,
            msg,
            participation
        )
    }

}

/**
 * Validate whether `parentNode` has a `containment` with a valid `index`, and currently `expectedChild` at `index`
 * @param parentNode    The node in which the containment is to be changed.
 * @param containment   The containment which is to be changed
 * @param index         The index of the child to be changed / added deleted
 * @param expectedChild The current child at `index`
 * @param msg
 * @param participation
 * @throws              ErrorEvent
 * @throws              ErrorResponse
 * @returns             The containment of the parent node, or a copy of it 
 */
export function validateContainment(
    parentNode: LionWebJsonNode,
    containment: LionWebJsonMetaPointer,
    index: number,
    change: ChangeType,
    expectedChild: LionWebId | undefined,
    msg: DeltaCommand,
    participation: Participation
): LionWebJsonContainment {
    // Check whether containment exists in the parent
    let foundContainment = parentNode.containments.find(c => isEqualMetaPointer(c.containment, containment))
    if (foundContainment === undefined) {
        if (index !== 0) {
            throw newErrorDelta("unknownIndex", `Index '${index}' is out of bounds`, msg, participation)
        } else if (change === "Add") {
            // create new containment with one child
            foundContainment = {
                containment: containment,
                children: []
            }
        } else {
            throw newErrorDelta(
                "unknownContainment",
                `Containment '${JSON.stringify(containment)}' does not exists in parent '${parentNode.id}'`,
                msg,
                participation
            )
        }
    }
    // Check the index is within bounds
    if (change === "Add" && index > foundContainment.children.length) {
        throw newErrorDelta("unknownIndex", "TODO", msg, participation)
    }
    if ((change === "Replace" || change === "Delete") && index > foundContainment.children.length - 1) {
        throw newErrorDelta("unknownIndex", "TODO", msg, participation)
    }
    // Check whether the expected child is at the given index
    if (expectedChild !== undefined && foundContainment.children[index] !== expectedChild) {
        throw newErrorDelta("indexEntryMismatch", `The child '${expectedChild}' is not at index ${index} `, msg, participation)
    }
    return foundContainment
}

/**
 * Validate whether `parentNode` has a `reference` with a valid `index`, and currently `expectedReference` at `index`
 * @param parentNode    The node in which the containment is to be changed.
 * @param reference     The containment which is to be changed
 * @param index         The index of the child to be changed / added deleted
 * @param expectedReference The current reference at `index`
 * @param msg
 * @param participation
 * @throws              ErrorEvent
 * @throws              ErrorResponse
 * @returns             The reference of the parent node, or a copy of it
 */
export function findAndValidateReference(
    parentNode: LionWebJsonNode,
    reference: LionWebJsonMetaPointer,
    index: number,
    expectedReference: LionWebJsonReferenceTarget | undefined,
    msg: DeltaCommand,
    participation: Participation
): LionWebJsonReference {
    // Check whether reference exists in the parent
    let foundReference = parentNode.references.find(c => isEqualMetaPointer(c.reference, reference))
    if (foundReference === undefined) {
        if (index !== 0) {
            // New containment, so index must be zero
            throw newErrorDelta("unknownIndex", `Reference ${JSON.stringify(reference)} undefined in node ${parentNode.id}: index '${index}' is out of bounds`, msg, participation)
        } else if (msg.messageKind === "AddReference") {
            // create new containment with one reference
            foundReference = {
                reference: reference,
                targets: []
            }
        } else {
            // Change or Delete incorrect if the reference does not exist
            throw newErrorDelta(
                "unknownReference",
                `Reference '${JSON.stringify(reference)}' does not exists in node '${parentNode.id}'`,
                msg,
                participation,
                {additionalInfos: [{
                    kind: msg.messageKind,
                        message: "",
                        data: {}
                }]}
            )
        }
    }
    // Check the index is within bounds
    if (msg.messageKind === "AddReference" && index > foundReference.targets.length) {
        throw newErrorDelta("unknownIndex", "TODO", msg, participation)
    }
    if (msg.messageKind === "ChangeReference" || msg.messageKind === "DeleteReference") { 
        if (index > foundReference.targets.length - 1) {
            throw newErrorDelta("unknownIndex", "TODO", msg, participation)
        } else {
            if (msg.messageKind === "ChangeReference") {
                const change = msg as ChangeReferenceCommand
                if (
                    change.oldReference !== foundReference.targets[change.index].reference ||
                    change.oldResolveInfo !== foundReference.targets[change.index].resolveInfo
                ) {
                    throw newErrorDelta(
                        "referenceTargetOrResolveInfoMismatch",
                        "reference not equal to expected values",
                        msg,
                        participation
                    )
                }
            }
            if (msg.messageKind === "DeleteReference") {
                const change = msg as DeleteReferenceCommand
                if (
                    change.deletedReference !== foundReference.targets[change.index].reference ||
                    change.deletedResolveInfo !== foundReference.targets[change.index].resolveInfo
                ) {
                    throw newErrorDelta(
                        "referenceTargetOrResolveInfoMismatch",
                        `reference not equal to expected values [${foundReference.targets[change.index].resolveInfo}, ${
                            foundReference.targets[change.index].reference
                        }]`,
                        msg,
                        participation
                    )
                }
            }
        }
    }
    // Check whether the replaced child is at the given index
    if (expectedReference !== undefined && !isEqualReferenceTarget(foundReference.targets[index], expectedReference)) {
        throw newErrorDelta(
            "indexEntryMismatch",
            `The reference '${expectedReference.reference}, ${expectedReference.resolveInfo}' is not at index ${index} `,
            msg,
            participation
        )
    }
    return foundReference
}

/**
 * Find node with nodeid `id` in `nodes`.
 * Throw an ErrorEvent or ErrorResponse if the node does not exists in `nodes`.
 * @param id        The node to be found
 * @param nodes     The collection to search
 * @param msg       The message for the potential ErrorEvent or ErrorResponse
 * @param participation The participation for which this is done.
 * @throws              ErrorEvent
 * @throws              ErrorResponse
 */
export function findAndValidateNodeExists(
    id: LionWebId,
    nodes: LionWebJsonNode[],
    msg: DeltaCommand,
    participation: Participation
): LionWebJsonNode {
    const result = nodes.find(n => n.id === id)
    if (result === undefined) {
        throw newErrorDelta("unknownNode", `Node ${id} does not exist`, msg, participation)
    }
    return result
}

export function validateNodeExists(
    id: string,
    node: LionWebJsonNode,
    msg: DeltaCommand,
    participation: Participation
): void {
    if (isNullOrUndefined(node)) {
        throw newErrorDelta("unknownNode", `Node ${id} does not exist`, msg, participation)
    }
}

/**
 * Throw an error if `parent.containment[index] !== child`
 * @param parent
 * @param containment
 * @param index
 * @param child
 * @param msg
 * @param participation
 */
export const validateChildInContainment = (
    parent: LionWebJsonNode,
    containment: LionWebJsonContainment | undefined,
    index: number,
    child: LionWebId,
    msg: DeltaCommand,
    participation: Participation
): void => {
    if (containment === undefined || index > containment.children.length || containment.children[index] !== child) {
        throw newErrorDelta("indexEntryMismatch", `child ${child} is not at oldIndex ${index}`, msg, participation)
    }
}

export const validateChildInAnnotation = (
    parent: LionWebJsonNode,
    index: number,
    child: LionWebId,
    msg: DeltaCommand,
    participation: Participation
): void => {
    if (index > (parent.annotations.length -1) || parent.annotations[index] !== child) {
        throw newErrorDelta("indexEntryMismatch", `child ${child} is not at oldIndex ${index} in ${parent.annotations}`, msg, participation)
    }
}

export function validateAnnotationIndex(parentNode: LionWebJsonNode, index: number, msg: DeltaCommand, participation: Participation): void {
    if (index > parentNode.annotations.length) {
        throw newErrorDelta("unknownIndex", `Index ${index} out of range for ${parentNode.id} annotations: '${parentNode.annotations}'`, msg, participation)
    }
}


export function validateExistingNodesIsEmpty(existingNodes: LionWebJsonNode[], msg: DeltaCommand, participation: Participation): void {
    if (existingNodes.length > 0) {
        const existingIds = existingNodes.map(n => n.id)
        throw newErrorDelta("nodeAlreadyExists", `Nodes '${existingIds}' already exist`, msg, participation)
    }
}

export function validateExistingIdsIsEmpty(existingIds: LionWebId[], msg: DeltaCommand, participation: Participation): void {
    if (existingIds.length > 0) {
        throw newErrorDelta("idsAlreadyInUse", `Nodes '${existingIds}' already exist`, msg, participation)
    }
}

export function validateReferenceTarget(resolveInfo: string | null | undefined, reference: LionWebId | null | undefined, msg: DeltaCommand, participation: Participation): void {
    if (isNullOrUndefined(resolveInfo) && isNullOrUndefined(reference)) {
        throw newErrorDelta("undefinedReferenceTarget", "resolveInfo and target are both null", msg, participation)
    }
}

// export function validateNodeExists(node: LionWebJsonNode)

export function validateParents(messageParent: LionWebId, dbParent: LionWebId | null, msg: DeltaCommand, participation: Participation): void {
    if (messageParent !== dbParent) {
        throw newErrorDelta("parentMismatch", `Parent ${messageParent} in message is not the parent of the child in the repository ${dbParent}`, msg, participation)
    }
}

export function validateHaveTheSameParents(newParentNode: LionWebJsonNode, oldParentNode: LionWebJsonNode, msg: DeltaCommand, participation: Participation): void {
    if (newParentNode.id === oldParentNode.id) {
        throw newErrorDelta(
            "haveTheSameParents",
            `Old parent ${oldParentNode.id} and new parent ${newParentNode.id} are the same, not allowed for MoveChildFromContainmentInOtherParent command`,
            msg,
            participation
        )
    }
}

export function validateDifferentContainments(c1: LionWebJsonMetaPointer, c2: LionWebJsonMetaPointer, msg: DeltaCommand, participation: Participation): void {
    if (isEqualMetaPointer(c1, c2)) {
        throw newErrorDelta(
            "identicalContainment",
            `Old containment ${JSON.stringify(c1)} and new containment ${JSON.stringify(c1)} are the same, not allowed for MoveChildFromContainmentInOtherParent command`,
            msg,
            participation
        )
    }
}
