// TODO The diff is outdated and need work to become ffully functional again.

import {
    ChunkUtils,
    isEqualMetaPointer,
    JsonContext,
    LionWebJsonChild as LionWebJsonContainment,
    LionWebJsonChunk,
    LionWebJsonNode,
    LionWebJsonProperty,
    LionWebJsonReference,
    LionWebSyntaxValidator,
    LwJsonUsedLanguage,
    NodeUtils,
    ValidationResult,
} from "@lionweb/validation"
import { LionWebJsonMetaPointer } from "@lionweb/validation/src/json/LionWebJson.js"
import { Change, GenericChange } from "./Change.js"
import { NodeAdded, NodeRemoved } from "./ChunkChange.js"
import { ChildAdded, ChildRemoved, ContainmentChange, ParentChanged } from "./ContainmentChange.js"
import { DiffIssue } from "./DiffIssue.js"
import { DiffResult } from "./DiffResult.js"
import { PropertyChange, PropertyValueChanged } from "./PropertyChange.js"

export type ChangedType = {
    path: string
    oldValue: unknown
    newValue: unknown
}
export type AddedOrDeletedType = {
    path: string
    value: unknown
}
export type MatchedType = {
    path: string
    value: unknown
}
export type ResultType = {
    matched: MatchedType[]
    changed: ChangedType[]
    added: AddedOrDeletedType[]
    deleted: AddedOrDeletedType[]
}

export class LionWebJsonDiff {
    errors: string[] = []

    // lwChecker = new LionWebSyntaxValidator(new ValidationResult());

    constructor() {
        // this.lwChecker.recursive = false;
    }

    change(change: Change): void {
        this.errors.push(change.changeMsg() + "\n")
        this.diffResult.change(change)
    }

    errorC(ctx: JsonContext, msg: string) {
        const change = new GenericChange(ctx, msg)
        this.errors.push("!!!" + change.changeMsg() + "\n")
        this.diffResult.change(change)
    }

    /**
     * Compare two LwNode objects and return their difference
     * @param beforeNode
     * @param afterNode
     */
    diffLwNode(ctx: JsonContext, beforeNode: LionWebJsonNode, afterNode: LionWebJsonNode): void {
        // console.log("Comparing nodes")
        if (!isEqualMetaPointer(beforeNode.classifier, afterNode.classifier)) {
            this.errorC(ctx, `Object ${beforeNode.id} has classifier ${JSON.stringify(beforeNode.classifier)} vs. ${JSON.stringify(afterNode.classifier)}`)
        }
        if (beforeNode.parent !== afterNode.parent) {
            this.change(new ParentChanged(ctx, beforeNode, beforeNode.parent, afterNode.parent))
        }
        beforeNode.properties.forEach((beforeProperty: LionWebJsonProperty, index: number) => {
            const key = beforeProperty.property.key
            // console.log(`    property ${key} of node ${obj1.id}`)
            const afterProperty = NodeUtils.findLwProperty(afterNode, key)
            if (afterProperty === null) {
                this.errorC(ctx.concat(index), `Property with concept key ${key} does not exist in second object`)
            } else {
                this.diffLwProperty(ctx.concat("properties", index), beforeNode, beforeProperty, afterProperty)
            }
        })
        beforeNode.containments.forEach((beforeContainment: LionWebJsonContainment, index: number) => {
            const beforeKey = beforeContainment.containment.key
            // console.log(`    property ${key} of node ${obj1.id}`)
            const afterContainment = NodeUtils.findLwChild(afterNode, beforeKey)
            if (afterContainment === null) {
                this.errorC(ctx.concat(index), `Containment with key ${beforeKey} does not exist in second object`)
            } else {
                this.diffContainment(ctx.concat("containments", index), beforeNode, beforeContainment, afterContainment)
            }
        })
        beforeNode.references.forEach((reference: LionWebJsonReference, index: number) => {
            const key = reference.reference.key
            const otherref = NodeUtils.findLwReference(afterNode, key)
            if (otherref === null) {
                this.errorC(ctx, `Reference with key ${key} does not exist in second object`)
            } else {
                this.diffLwReference(ctx.concat("references", index), reference, otherref)
            }
        })
    }

    diffResult = new DiffResult()

    diffLwChunk(beforeChunk: LionWebJsonChunk, afterChunk: LionWebJsonChunk): void {
        const ctx = new JsonContext(null, ["$"])
        console.log("Comparing chunks")
        if (beforeChunk.serializationFormatVersion !== afterChunk.serializationFormatVersion) {
            this.errorC(ctx, `Serialization versions do not match: ${beforeChunk.serializationFormatVersion} vs ${afterChunk.serializationFormatVersion}`)
        }
        beforeChunk.languages.forEach((beforeLanguage: LwJsonUsedLanguage, index: number) => {
            const afterLanguage = ChunkUtils.findLwUsedLanguage(afterChunk, beforeLanguage.key)
            if (afterLanguage === null) {
                // return { isEqual: false, diffMessage: `Node with concept key ${id} does not exist in second object`};
                this.errorC(ctx, `Language with  key ${beforeLanguage.key} does not exist in second object`)
            } else {
                this.diffLwUsedLanguage(ctx.concat("languages", index), beforeLanguage, afterLanguage)
            }
        })
        for (const language of afterChunk.languages) {
            console.log("Comparing languages")
            const otherLanguage = ChunkUtils.findLwUsedLanguage(beforeChunk, language.key)
            if (otherLanguage === null) {
                // return { isEqual: false, diffMessage: `Node with concept key ${id} does not exist in second object`};
                this.errorC(ctx, `Language with  key ${language.key} does not exist in first object`)
            }
        }
        beforeChunk.nodes.forEach((beforeNode: LionWebJsonNode, index: number) => {
            const beforeId = beforeNode.id
            const afterNode = ChunkUtils.findNode(afterChunk, beforeId)
            const newCtx = ctx.concat("nodes", index)
            if (afterNode === null || afterNode === undefined) {
                // return { isEqual: false, diffMessage: `Node with concept key ${id} does not exist in second object`};
                // this.errorC(newCtx,`Node "${id}" removed`);
                this.change(new NodeRemoved(ctx, beforeNode))
            } else {
                this.diffLwNode(newCtx, beforeNode, afterNode)
            }
        })
        afterChunk.nodes.forEach((afterNode: LionWebJsonNode, index: number) => {
            const afterId = afterNode.id
            const beforeNode = ChunkUtils.findNode(beforeChunk, afterId)
            if (beforeNode === null) {
                const newCtx = ctx.concat("nodes", index)
                this.change(new NodeAdded(ctx, afterNode))
            }
        })
    }

    diffContainment(ctx: JsonContext, node: LionWebJsonNode, beforeContainment: LionWebJsonContainment, afterContainment: LionWebJsonContainment): void {
        if (!isEqualMetaPointer(beforeContainment.containment, afterContainment.containment)) {
            // return { isEqual: false, diffMessage: `Property Object has concept ${JSON.stringify(obj1.property)} vs ${JSON.stringify(obj2.property)}`}
            this.errorC(
                ctx,
                `Containment Object has concept ${JSON.stringify(beforeContainment.containment)} vs ${JSON.stringify(afterContainment.containment)}`,
            )
        }
        // Check whether children exist in both objects (two for loops)
        for (const childId1 of beforeContainment.children) {
            if (!afterContainment.children.includes(childId1)) {
                this.change(new ChildRemoved(ctx, node, beforeContainment.containment.key, childId1))
            }
        }
        for (const childId2 of afterContainment.children) {
            if (!beforeContainment.children.includes(childId2)) {
                this.change(new ChildAdded(ctx, node, beforeContainment.containment.key, childId2))
            }
        }
    }

    diffLwReference(ctx: JsonContext, ref1: LionWebJsonReference, ref2: LionWebJsonReference): void {
        if (!isEqualMetaPointer(ref1.reference, ref2.reference)) {
            this.errorC(ctx, `Reference has concept ${JSON.stringify(ref1.reference)} vs ${JSON.stringify(ref2.reference)}`)
        }
        for (const target of ref1.targets) {
            const otherTarget = NodeUtils.findLwReferenceTarget(ref2.targets, target)
            if (otherTarget === null) {
                this.errorC(ctx, `REFERENCE Target ${JSON.stringify(target)} missing in second `)
            } else {
                if (target.reference !== otherTarget.reference || target.resolveInfo !== otherTarget.resolveInfo) {
                    this.errorC(ctx, `REFERENCE target ${JSON.stringify(target)} vs ${JSON.stringify(otherTarget)}`)
                }
            }
        }
        for (const target of ref2.targets) {
            if (NodeUtils.findLwReferenceTarget(ref1.targets, target) === null) {
                this.errorC(ctx, `REFERENCE Target ${JSON.stringify(target)} missing in first `)
            }
        }
    }

    private diffLwUsedLanguage(ctx: JsonContext, obj1: LwJsonUsedLanguage, obj2: LwJsonUsedLanguage) {
        if (obj1.key !== obj2.key || obj1.version !== obj2.version) {
            this.errorC(ctx, `Different used languages ${JSON.stringify(obj1)} vs ${JSON.stringify(obj2)}`)
        }
    }

    private diffLwProperty(ctx: JsonContext, node: LionWebJsonNode, beforeProperty: LionWebJsonProperty, afterProperty: LionWebJsonProperty) {
        if (!isEqualMetaPointer(beforeProperty.property, afterProperty.property)) {
            this.errorC(ctx, `Property Object has concept ${JSON.stringify(beforeProperty.property)} vs ${JSON.stringify(afterProperty.property)}`)
        }
        if (beforeProperty.value !== afterProperty.value) {
            this.change(new PropertyValueChanged(ctx, node.id, beforeProperty.property.key, beforeProperty.value, afterProperty.value))
            // this.errorC(ctx, `Property ${obj1.property.key} has value ${obj1.value} vs ${obj2.value}`);
        }
    }
}
