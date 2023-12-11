// TODO The diff is outdated and need work to become ffully functional again.

import {
    ChunkUtils,
    isEqualMetaPointer, JsonContext,
    LionWebJsonChild as LionWebJsonContainment,
    LionWebJsonChunk,
    LionWebJsonNode, LionWebJsonProperty, LionWebJsonReference,
    LionWebSyntaxValidator, LwJsonUsedLanguage,
    NodeUtils,
    ValidationResult
} from "@lionweb/validation";
import { LionWebJsonMetaPointer } from "@lionweb/validation/src/json/LionWebJson.js";
import { DiffIssue } from "./DiffIssue.js";

export type ChangedType = {
    path: string;
    oldValue: unknown;
    newValue: unknown;
};
export type AddedOrDeletedType = {
    path: string;
    value: unknown;
};
export type MatchedType = {
    path: string;
    value: unknown;
};
export type ResultType = {
    matched: MatchedType[];
    changed: ChangedType[];
    added: AddedOrDeletedType[];
    deleted: AddedOrDeletedType[];
};

export class LionWebJsonDiff {
    errors: string[] = [];
    lwChecker = new LionWebSyntaxValidator(new ValidationResult());

    constructor() {
        this.lwChecker.recursive = false;
    }

    error(msg: string) {
        this.errors.push(msg + "\n");
    }

    errorC(ctx: JsonContext, msg: string) {
        const issue = new DiffIssue(ctx, msg);
        this.errors.push("!!!" + issue.errorMsg());
        this.diffResult.issue(issue);
    }

    check(b: boolean, message: string): void {
        if (!b) {
            this.error("Check error: " + message);
        }
    }

    /**
     * Compare two LwNode objects and return their difference
     * @param node1
     * @param node2
     */
    diffLwNode(ctx: JsonContext, node1: LionWebJsonNode, node2: LionWebJsonNode): void {
        // console.log("Comparing nodes")
        if (!isEqualMetaPointer(node1.classifier, node2.classifier)) {
            this.errorC(ctx, `Object ${node1.id} has classifier ${JSON.stringify(node1.classifier)} vs. ${JSON.stringify(node2.classifier)}`);
        }
        if (node1.parent !== node2.parent) {
            this.errorC(ctx, `Object ${node1.id} has parent ${node1.parent} vs. ${node2.parent}`);
        }
        node1.properties.forEach((property: LionWebJsonProperty, index: number) => {
            const key = property.property.key;
            // console.log(`    property ${key} of node ${obj1.id}`)
            const otherProp = NodeUtils.findLwProperty(node2, key);
            if (otherProp === null) {
                this.errorC(ctx.concat(index), `Property with concept key ${key} does not exist in second object`);
            } else {
                this.diffLwProperty(ctx.concat("properties", index), property, otherProp);
            }
        })
        node1.containments.forEach((containment: LionWebJsonContainment, index: number) => {
            const key = containment.containment.key;
            // console.log(`    property ${key} of node ${obj1.id}`)
            const otherContainment = NodeUtils.findLwChild(node2, key);
            if (otherContainment === null) {
                this.errorC(ctx.concat(index), `Containment with key ${key} does not exist in second object`);
            } else {
                this.diffContainment(ctx.concat("containments", index), containment, otherContainment);
            }
        })
        node1.references.forEach((reference: LionWebJsonReference, index: number) => {
            const key = reference.reference.key;
            const otherref = NodeUtils.findLwReference(node2, key);
            if (otherref === null) {
                this.errorC(ctx,`Reference with key ${key} does not exist in second object`);
            } else {
                this.diffLwReference(ctx.concat("references", index), reference, otherref);
            }
        })
    }

    diffResult  = new ValidationResult();
    
    diffLwChunk(chunk1: LionWebJsonChunk, chunk2: LionWebJsonChunk): void {
        const ctx = new JsonContext(null, ["$"]);
        console.log("Comparing chunks");
        if (chunk1.serializationFormatVersion !== chunk2.serializationFormatVersion) {
            this.errorC(ctx, `Serialization versions do not match: ${chunk1.serializationFormatVersion} vs ${chunk2.serializationFormatVersion}`);
        }
        chunk1.languages.forEach((language: LwJsonUsedLanguage, index: number) => {
            const otherLanguage = ChunkUtils.findLwUsedLanguage(chunk2, language.key);
            if (otherLanguage === null) {
                // return { isEqual: false, diffMessage: `Node with concept key ${id} does not exist in second object`};
                this.errorC(ctx, `Language with  key ${language.key} does not exist in second object`);
            } else {
                this.diffLwUsedLanguage(ctx.concat("languages", index), language, otherLanguage);
            }
        })
        for (const language of chunk2.languages) {
            console.log("Comparing languages");
            const otherLanguage = ChunkUtils.findLwUsedLanguage(chunk1, language.key);
            if (otherLanguage === null) {
                // return { isEqual: false, diffMessage: `Node with concept key ${id} does not exist in second object`};
                this.errorC(ctx, `Language with  key ${language.key} does not exist in first object`);
            }
        }
        chunk1.nodes.forEach((node: LionWebJsonNode, index: number) => {
            const id = node.id;
            const otherNode = ChunkUtils.findNode(chunk2, id);
            const newCtx = ctx.concat("nodes", index);
            if (otherNode === null || otherNode === undefined) {
                // return { isEqual: false, diffMessage: `Node with concept key ${id} does not exist in second object`};
                this.errorC(newCtx,`Node with concept key ${id} does not exist in second object`);
            } else {
                this.diffLwNode(newCtx, node, otherNode);
            }
        });
        chunk2.nodes.forEach((node: LionWebJsonNode, index: number) => {
            const id = node.id;
            const otherNode = ChunkUtils.findNode(chunk1, id);
            if (otherNode === null) {
                const newCtx = ctx.concat("nodes", index);
                // return { isEqual: false, diffMessage: `Node with concept key ${id} does not exist in second object`};
                this.errorC(newCtx, `Node with concept key ${id} does not exist in first object`);
            }
        });
    }

    diffContainment(ctx: JsonContext, obj1: LionWebJsonContainment, obj2: LionWebJsonContainment): void {
        if (!isEqualMetaPointer(obj1.containment, obj2.containment)) {
            // return { isEqual: false, diffMessage: `Property Object has concept ${JSON.stringify(obj1.property)} vs ${JSON.stringify(obj2.property)}`}
            this.errorC(ctx, `Containment Object has concept ${JSON.stringify(obj1.containment)} vs ${JSON.stringify(obj2.containment)}`);
        }
        // Check whether children exist in both objects (two for loops)
        for (const childId1 of obj1.children) {
            if (!obj2.children.includes(childId1)) {
                this.errorC(ctx, `Child ${childId1} is missing in other object`);
            }
        }
        for (const childId2 of obj2.children) {
            if (!obj1.children.includes(childId2)) {
                this.errorC(ctx, `Child ${childId2} is missing in first object`);
            }
        }
    }

    diffLwReference(ctx: JsonContext, ref1: LionWebJsonReference, ref2: LionWebJsonReference): void {
        if (!isEqualMetaPointer(ref1.reference, ref2.reference)) {
            // return { isEqual: false, diffMessage: `Property Object has concept ${JSON.stringify(obj1.property)} vs ${JSON.stringify(obj2.property)}`}
            this.errorC(ctx, `Reference has concept ${JSON.stringify(ref1.reference)} vs ${JSON.stringify(ref2.reference)}`);
        }
        for (const target of ref1.targets) {
            const otherTarget = NodeUtils.findLwReferenceTarget(ref2.targets, target);
            if (otherTarget === null) {
                this.errorC(ctx, `REFERENCE Target ${JSON.stringify(target)} missing in second `);
            } else {
                if (target.reference !== otherTarget.reference || target.resolveInfo !== otherTarget.resolveInfo) {
                    this.errorC(ctx, `REFERENCE target ${JSON.stringify(target)} vs ${JSON.stringify(otherTarget)}`);
                }
            }
        }
        for (const target of ref2.targets) {
            if (NodeUtils.findLwReferenceTarget(ref1.targets, target) === null) {
                this.errorC(ctx, `REFERENCE Target ${JSON.stringify(target)} missing in first `);
            }
        }
    }

    private diffLwUsedLanguage(ctx: JsonContext, obj1: LwJsonUsedLanguage, obj2: LwJsonUsedLanguage) {
        if (obj1.key !== obj2.key || obj1.version !== obj2.version) {
            this.errorC(ctx, `Different used languages ${JSON.stringify(obj1)} vs ${JSON.stringify(obj2)}`);
        }
    }

    private diffLwProperty(ctx: JsonContext, obj1: LionWebJsonProperty, obj2: LionWebJsonProperty) {
        if (!isEqualMetaPointer(obj1.property, obj2.property)) {
            this.error(`Property Object has concept ${JSON.stringify(obj1.property)} vs ${JSON.stringify(obj2.property)}`);
        }
        if (obj1.value !== obj2.value) {
            this.errorC(ctx, `Property ${obj1.property.key} has value ${obj1.value} vs ${obj2.value}`);
        }
    }
}
