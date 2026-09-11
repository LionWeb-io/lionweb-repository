import {
    isEqualMetaPointer,
    LionWebId,
    LionWebJsonChunk,
    LionWebJsonContainment,
    LionWebJsonMetaPointer,
    LionWebJsonNode,
    LionWebJsonReference,
    LionWebJsonReferenceTarget,
    LionWebSerializationFormatVersion
} from "@lionweb/json"
import { MetaPointers, NodeUtils } from "@lionweb/json-utils"
import { collectUsedLanguages, isProperTree } from "@lionweb/server-common"
import {
    AddAnnotationCommand,
    AddChildCommand,
    AddPartitionCommand,
    AddPropertyCommand,
    AddReferenceCommand,
    ChangeClassifierCommand,
    ChangePropertyCommand,
    ChangeReferenceCommand,
    CompositeCommand,
    DeleteAnnotationCommand,
    DeleteChildCommand,
    DeletePartitionCommand,
    DeletePropertyCommand,
    DeleteReferenceCommand,
    DeltaCommand,
    MoveAndReplaceAnnotationFromOtherParentCommand,
    MoveAndReplaceAnnotationInSameParentCommand,
    MoveAndReplaceChildFromContainmentInOtherParentCommand,
    MoveAndReplaceChildInSameContainmentInSameParentCommand,
    MoveAnnotationFromOtherParentCommand,
    MoveAnnotationInSameParentCommand,
    MoveChildFromContainmentInOtherParentCommand,
    MoveChildFromOtherContainmentInSameParentCommand,
    ReplaceAnnotationCommand,
    ReplaceChildCommand
} from "@lionweb/server-delta-shared"
import { pull } from "es-toolkit"

/**
 * Represents a complete model consisting of LionWebJsonNode objects.
 * Allows us to manage a collection of LionWebJsonNodes and it to be accessed as a tree.
 * 
 * Contains function to apply Delta Commands to the model.
 */
export class LionWebModel {
    /**
     * Map to get quick access to nodes by id.
     * @protected
     */
    protected nodesIdMap: Map<LionWebId, LionWebJsonNode> = new Map<LionWebId, LionWebJsonNode>()

    /**
     * Create from a collection of nodes
     * @param nodes
     */
    static fromNodesArray(nodes: LionWebJsonNode[]): LionWebModel {
        return new LionWebModel(nodes)
    }
    /**
     * Create a wrapper with `chunk` as its chunk
     * @param chunk
     */
    constructor(nodes: LionWebJsonNode[]) {
        this.addNodes(nodes)
    }

    /** Add `nodes` to the model.
     *  It is ok for a node to be in the model already.
     */
    private addNodes(nodes: LionWebJsonNode[]): void {
        nodes.forEach((node) => {
            this.nodesIdMap.set(node.id, node)
        })
    }

    /**
     * Get node with node id `id`
     * @param id
     * @returns The node found or `undefined` if no node with `id` is found. 
     */
    getNode(id: LionWebId): LionWebJsonNode | undefined {
        return this.nodesIdMap.get(id)
    }

    /**
     * Find all nodes with classifier `concept`
     * @param concept The classifier to look for
     * @returns The (potential empty) list of nodes with classifier = `concept`.
     */
    findNodesOfClassifier(concept: LionWebJsonMetaPointer): LionWebJsonNode[] {
        return this.nodes().filter((node) => isEqualMetaPointer(node.classifier, concept))
    }

    /**
     * Return the target nodes inside `reference` as a list of actual nodes (LionWebJsonNode[])
     * @param reference
     */
    getReferredNodes(reference: LionWebJsonReference | undefined): LionWebJsonNode[] {
        if (reference === undefined) {
            return []
        }
        const result = reference.targets.flatMap((target) => {
            if (target.reference === null) {
                return []
            } else {
                const referredNode = this.getNode(target.reference)
                return referredNode === undefined ? [] : [referredNode]
            }
        })
        return result
    }

    addPartition(partition: LionWebJsonNode[]): void {
        this.addNodes(partition)
    }

    deletePartition(partitionId: LionWebId): void {
        const deletedNodes = this.getSubtreeWithDepth(partitionId, Number.MAX_SAFE_INTEGER)
        deletedNodes.forEach((node) => this.nodesIdMap.delete(node.id))
    }

    setProperty(nodeId: LionWebId, mp: LionWebJsonMetaPointer, value: string): void {
        const node = this.getNode(nodeId)
        let property = node.properties.find((p) => isEqualMetaPointer(p.property, mp))
        if (property === undefined) {
            property = {
                property: mp,
                value: value,
            }
            node.properties.push(property)
        } else {
            property.value = value
        }
    }

    deleteProperty(nodeId: LionWebId, mp: LionWebJsonMetaPointer): void {
        const node = this.getNode(nodeId)
        let property = node.properties.findIndex((p) => isEqualMetaPointer(p.property, mp))
        if (property !== -1) {
            node.properties.splice(property, 1)
        } else {
            // error
        }
    }

    /**
     * Add a child(tree) to a containment in a node.
     * If there is no such containment in the node, it will be created within the node
     * @param node          The `node` to which to add the child
     * @param mp            The containment
     * @param childTree     The child with its children
     * @param index         The index where to add the child
     */
    addChild(nodeId: LionWebId, mp: LionWebJsonMetaPointer, childTree: LionWebJsonNode[], index: number): void {
        const node = this.getNode(nodeId)
        let containment = node.containments.find((c) => isEqualMetaPointer(c.containment, mp))
        if (containment === undefined) {
            containment = {
                containment: mp,
                children: [],
            }
            node.containments.push(containment)
        }
        const childNode = childTree.find((ch) => ch.parent === node.id)
        containment.children.splice(index, 0, childNode.id)
        this.addNodes(childTree)
    }

    /**
     * Remove child from its parent, but do not delete the child node
     * Always a temporary situation, therefore this remains private
     * @param nodeId
     * @param mp
     * @param index
     */
    private detachChild(nodeId: LionWebId, mp: LionWebJsonMetaPointer, index: number): void {
        const node = this.getNode(nodeId)
        const containment = node.containments.find((c) => isEqualMetaPointer(c.containment, mp))
        if (containment === undefined) {
            return
        }
        if (index !== -1) {
            containment.children.splice(index, 1)
        }
    }
    
    deleteChild(nodeId: LionWebId, mp: LionWebJsonMetaPointer, index: number): void {
        const node = this.getNode(nodeId)
        const containment = node.containments.find((c) => isEqualMetaPointer(c.containment, mp))
        if (containment === undefined) {
            return
        }
        if (index !== -1) {
            const deletedNodes = this.getSubtreeWithDepth(containment.children[index], Number.MAX_SAFE_INTEGER)
            deletedNodes.forEach((node) => this.nodesIdMap.delete(node.id))
            containment.children.splice(index, 1)
        }
    }

    replaceChild(nodeId: LionWebId, containmentMp: LionWebJsonMetaPointer, childTree: LionWebJsonNode[], index: number): void {
        this.deleteChild(nodeId, containmentMp, index)
        this.addChild(nodeId, containmentMp, childTree, index)
    }

    addAnnotation(nodeId: LionWebId, annotationTree: LionWebJsonNode[], index: number): void {
        const node = this.getNode(nodeId)
        const annotationNode = annotationTree.find((ch) => ch.parent === node.id)
        node.annotations.splice(index, 0, annotationNode.id)
        this.addNodes(annotationTree)
    }

    deleteAnnotation(nodeId: LionWebId, index: number): void {
        const node = this.getNode(nodeId)
        if (index !== -1) {
            const deletedNodes = this.getSubtreeWithDepth(node.annotations[index], Number.MAX_SAFE_INTEGER)
            deletedNodes.forEach((node) => this.nodesIdMap.delete(node.id))
            node.annotations.splice(index, 1)
        }
    }

    deleteAnnotationById(nodeId: LionWebId, annotationId: LionWebId): void {
        const node = this.getNode(nodeId)
        const index = node.annotations.findIndex(id => id === annotationId)
        this.deleteAnnotation(nodeId, index)
    }

    replaceAnnotation(nodeId: LionWebId, annotationTree: LionWebJsonNode[], index: number): void {
        this.deleteAnnotation(nodeId, index)
        this.addAnnotation(nodeId, annotationTree, index)
    }

    addReference(nodeId: LionWebId, refMp: LionWebJsonMetaPointer, ref: LionWebJsonReferenceTarget, index: number): void {
        const node = this.getNode(nodeId)
        let reference = node.references.find((c) => isEqualMetaPointer(c.reference, refMp))
        if (reference === undefined) {
            reference = {
                reference: refMp,
                targets: [],
            }
            node.references.push(reference)
        }
        reference.targets.splice(index, 0, ref)
    }

    deleteReference(nodeId: LionWebId, refMp: LionWebJsonMetaPointer, index: number): void {
        const node = this.getNode(nodeId)
        let reference = node.references.find((c) => isEqualMetaPointer(c.reference, refMp))
        if (reference === undefined) {
            return
        }
        reference.targets.splice(index, 1)
    }

    changeReference(nodeId: LionWebId, refMp: LionWebJsonMetaPointer, ref: LionWebJsonReferenceTarget, index: number): void {
        const node = this.getNode(nodeId)
        let reference = node.references.find((c) => isEqualMetaPointer(c.reference, refMp))
        if (reference === undefined) {
            return
        }
        reference.targets[index] = ref
    }

    /**
     * Return an array with _all_ child nodes of `node` for all containments
     * @param nodeId
     */
    getAllChildNodes(nodeId: LionWebId): LionWebJsonNode[] {
        const node = this.getNode(nodeId)
        return node.containments.flatMap((cont) => this.getContainmentNodes(nodeId, cont.containment))
    }

    /**
     * Return an array with all child nodes of `node` for the containment `containment`.
     * @param nodeId
     */
    getContainmentNodes(nodeId: LionWebId, containment: LionWebJsonMetaPointer): LionWebJsonNode[] {
        const cnt = this.getContainment(nodeId, containment)
        if (cnt === undefined) {
            return []
        } else {
            return cnt.children.flatMap((child) => {
                const childNode = this.getNode(child)
                return childNode === undefined ? [] : [childNode]
            })
        }
    }

    /**
     * Return an array with all child nodes of `node` for the containment `containment`.
     * @param nodeId
     */
    getContainment(nodeId: LionWebId, containment: LionWebJsonMetaPointer): LionWebJsonContainment {
        const node = this.getNode(nodeId)
        return node.containments.find((c) => isEqualMetaPointer(containment, c.containment))
    }

    /**
     * Return the nodes inside `containment` as a list of actual nodes (LionWebJsonNode[])
     * @param reference
     */
    getChildrenAsNodes(containment: LionWebJsonContainment | undefined) {
        if (containment === undefined) {
            return []
        }
        const result: LionWebJsonNode[] = []
        containment.children.forEach((ch) => {
            const childNode = this.getNode(ch)
            if (childNode !== undefined) {
                result.push(childNode)
            }
        })
        return result
    }

    getSubtreeWithDepth(nodeId: LionWebId, depthLimit: number): LionWebJsonNode[] {
        const node = this.getNode(nodeId)
        if (node === undefined) {
            return []
        }
        const result: LionWebJsonNode[] = [node]
        let baseNodes: LionWebJsonNode[] = [node]
        for (let depth = 0; depth < depthLimit; depth++) {
            const children = baseNodes.flatMap((node) => this.getAllChildNodes(node.id))
            result.push(...children)
            baseNodes = children
            if (baseNodes.length === 0) {
                break
            }
        }
        return result
    }

    nodes(): LionWebJsonNode[] {
        return Array.from(this.nodesIdMap.values())
    }
    
    asChunk(serializationVersion: LionWebSerializationFormatVersion = "2023.1" ): LionWebJsonChunk {
        const nodes = this.nodes()
        return {
            serializationFormatVersion: serializationVersion,
            languages: collectUsedLanguages(nodes),
            nodes: nodes,
        }
    }
    
    getPartitions(): LionWebJsonNode[] {
        return this.nodes().filter(node => node.parent === null)
    }

    /**
     * Apply `delta` command to the model.
     * NOTE: There is no checking done, it is assumed the `delta` is correct.
     * @param delta The delta to apply.
     */
    applyDelta(delta: DeltaCommand): void {
        switch (delta.messageKind) {
            case "AddPartition": {
                this.addPartition((delta as AddPartitionCommand).newPartition.nodes)
                break
            }
            case "DeletePartition": {
                this.deletePartition((delta as DeletePartitionCommand).deletedPartition)
                break
            }
            case "AddChild": {
                const cmd = delta as AddChildCommand
                this.addChild(cmd.parent, cmd.containment, cmd.newChild.nodes, cmd.index)
                break
            }
            case "DeleteChild": {
                const cmd = delta as DeleteChildCommand
                this.deleteChild(cmd.parent, cmd.containment, cmd.index)
                break
            }
            case "ReplaceChild": {
                const cmd = delta as ReplaceChildCommand
                this.replaceChild(cmd.parent, cmd.containment, cmd.newChild.nodes, cmd.index)
                break
            }
            case "AddProperty": {
                const cmd = delta as AddPropertyCommand
                this.setProperty(cmd.node, cmd.property, cmd.newValue)
                break
            }
            case "DeleteProperty": {
                const cmd = delta as DeletePropertyCommand
                this.deleteProperty(cmd.node, cmd.property)
                break
            }
            case "ChangeProperty": {
                const cmd = delta as ChangePropertyCommand
                this.setProperty(cmd.node, cmd.property, cmd.newValue)
                break
            }
            case "AddReference": {
                const cmd = delta as AddReferenceCommand
                this.addReference(cmd.parent, cmd.reference, { reference: cmd.newReference, resolveInfo: cmd.newResolveInfo }, cmd.index)
                break
            }
            case "DeleteReference": {
                const cmd = delta as DeleteReferenceCommand
                this.deleteReference(cmd.parent, cmd.reference, cmd.index)
                break
            }
            case "ChangeReference": {
                const cmd = delta as ChangeReferenceCommand
                this.changeReference(
                    cmd.parent,
                    cmd.reference,
                    {
                        reference: cmd.newReference,
                        resolveInfo: cmd.newResolveInfo,
                    },
                    cmd.index,
                )
                break
            }
            case "AddAnnotation": {
                const cmd = delta as AddAnnotationCommand
                this.addAnnotation(cmd.parent, cmd.newAnnotation.nodes, cmd.index)
                break
            }
            case "DeleteAnnotation": {
                const cmd = delta as DeleteAnnotationCommand
                this.deleteAnnotation(cmd.parent, cmd.index)
                break
            }
            case "ReplaceAnnotation": {
                const cmd = delta as ReplaceAnnotationCommand
                this.replaceAnnotation(cmd.parent, cmd.newAnnotation.nodes, cmd.index)
                break
            }
            case "MoveAndReplaceChildFromContainmentInOtherParent": {
                const cmd = delta as MoveAndReplaceChildFromContainmentInOtherParentCommand
                const movedChildNode = this.getNode(cmd.movedChild)
                // remove from old containment
                this.getContainment(movedChildNode.parent, cmd.oldContainment).children.splice(cmd.oldIndex, 1)
                // Add to new containment
                movedChildNode.parent = cmd.newParent
                this.replaceChild(cmd.newParent, cmd.newContainment, [movedChildNode], cmd.newIndex)
                break
            }
            case "MoveAndReplaceChildFromOtherContainmentInSameParent": {
                const cmd = delta as MoveChildFromOtherContainmentInSameParentCommand
                const movedChildNode = this.getNode(cmd.movedChild)
                // remove from old containment
                this.getContainment(movedChildNode.parent, cmd.oldContainment).children.splice(cmd.oldIndex, 1)
                // Add to new containment
                this.replaceChild(cmd.parent, cmd.newContainment, [movedChildNode], cmd.newIndex)
                break
            }
            case "MoveAndReplaceChildInSameContainmentInSameParent": {
                const cmd = delta as MoveAndReplaceChildInSameContainmentInSameParentCommand
                const movedChildNode = this.getNode(cmd.movedChild)
                // Add to new containment, do this first, otherwise the replacedNode's index may be changed.
                this.replaceChild(cmd.parent, cmd.containment, [movedChildNode], cmd.oldIndex + cmd.indexOffset)
                // Afterwards remove from old containment
                this.getContainment(cmd.parent, cmd.containment).children.splice(cmd.oldIndex, 1)
                break
            }
            case "MoveChildFromContainmentInOtherParent": {
                const cmd = delta as MoveChildFromContainmentInOtherParentCommand
                const movedChildNode = this.getNode(cmd.movedChild)
                // remove from old containment, don't delete the child nodes
                this.getContainment(movedChildNode.parent, cmd.oldContainment).children.splice(cmd.oldIndex, 1)
                // Add to new containment
                movedChildNode.parent = cmd.newParent
                this.addChild(cmd.newParent, cmd.newContainment, [movedChildNode], cmd.newIndex)
                break
            }
            case "MoveChildFromOtherContainmentInSameParent": {
                const cmd = delta as MoveChildFromOtherContainmentInSameParentCommand
                const movedChildNode = this.getNode(cmd.movedChild)
                // remove from old containment, don't delete the child nodes
                this.getContainment(movedChildNode.parent, cmd.oldContainment).children.splice(cmd.oldIndex, 1)
                // Add to new containment
                const index = cmd.newIndex > cmd.oldIndex ? cmd.newIndex : cmd.newIndex - 1 
                this.addChild(cmd.parent, cmd.newContainment, [movedChildNode], index)
                break
            }
            case "MoveChildInSameContainmentInSameParent": {
                const cmd = delta as MoveAndReplaceChildInSameContainmentInSameParentCommand
                this.getContainment(cmd.parent, cmd.containment).children.splice(cmd.oldIndex, 1)
                this.getContainment(cmd.parent, cmd.containment).children.splice(cmd.oldIndex + cmd.indexOffset, 0, cmd.movedChild)
                break
            }
            case "MoveAndReplaceAnnotationFromOtherParent": {
                const cmd = delta as MoveAndReplaceAnnotationFromOtherParentCommand
                const annotationNode = this.getNode(cmd.movedAnnotation)
                const oldParentNode = this.getNode(annotationNode.parent)
                // Don't use deleteAnnotation, as it will remove the children as well.
                pull(oldParentNode.annotations, [cmd.movedAnnotation])
                annotationNode.parent = cmd.newParent
                this.replaceAnnotation(cmd.newParent, [annotationNode], cmd.newIndex)
                break
            }
            case "MoveAndReplaceAnnotationInSameParent": {
                const cmd = delta as MoveAndReplaceAnnotationInSameParentCommand
                const annotationNode = this.getNode(cmd.movedAnnotation)
                const parentNode = this.getNode(annotationNode.parent)
                // Don't use deleteAnnotation, as it will remove the children as well.
                pull(parentNode.annotations, [cmd.movedAnnotation])
                if (cmd.indexOffset < 0) {
                    this.replaceAnnotation(parentNode.id, [annotationNode], cmd.oldIndex + cmd.indexOffset)
                } else {
                    this.replaceAnnotation(parentNode.id, [annotationNode], cmd.oldIndex + cmd.indexOffset - 1)
                }
                break
            }
            case "MoveAnnotationFromOtherParent": {
                const cmd = delta as MoveAnnotationFromOtherParentCommand
                const annotationNode = this.getNode(cmd.movedAnnotation)
                const oldParentNode = this.getNode(annotationNode.parent)
                // Don't use deleteAnnotation, as it will remove the children as well.
                pull(oldParentNode.annotations, [cmd.movedAnnotation])
                const newParentNode = this.getNode(cmd.newParent)
                newParentNode.annotations.splice(cmd.newIndex, 0, cmd.movedAnnotation)
                break
            }
            case "MoveAnnotationInSameParent": {
                const cmd = delta as MoveAnnotationInSameParentCommand
                const parentNode = this.getNode(this.getNode(cmd.movedAnnotation).parent)
                pull(parentNode.annotations, [cmd.movedAnnotation])
                parentNode.annotations.splice(cmd.oldIndex + cmd.indexOffset, 0, cmd.movedAnnotation)
                break
            }
            case "ChangeClassifier": {
                const cmd = delta as ChangeClassifierCommand
                this.getNode(cmd.node).classifier = cmd.newClassifier
                break
            }
            case "CompositeCommand": {
                const cmd = delta as CompositeCommand
                for(const part of cmd.parts) {
                    this.applyDelta(part)
                }
                break
            }
            default: {
                throw new Error(`Unknown delta type in LionWebModel.applyDelta: ${delta.messageKind}`)
            }
        }
    }

    asString(): string {
        let result = ""
        this.getPartitions().forEach((partition) => {
            const pString = this.recursiveToString(partition, 1)
            result += pString
        })
        return result
    }

    private recursiveToString(node: LionWebJsonNode | undefined, depth: number): string {
        // console.log(`recursiveToString ${depth} : ${node.id} cls: ${JSON.stringify(node.classifier)}`)
        if (node === undefined) {
            return ""
        }
        let result: string = ""
        // console.log(`RECURSIVE ${JSON.stringify(node)}`)
        const nameProperty = NodeUtils.findProperty(node, MetaPointers.INamedName)
        const name = nameProperty === undefined ? "" : " " + nameProperty.value
        result += `${this.indent(depth)} (${node.id}) ${name} : ${node.classifier.key}\n`
        if (node.annotations !== undefined && node.annotations.length !== 0) {
            result += this.indent(depth + 1) + "*Annotations*" + "\n"
            node.annotations.forEach((ann) => {
                result += this.recursiveToString(this.getNode(ann), depth + 1)
                // result += this.indent(depth) + "[[" + asMinimalJsonString(ann) + "]]\n"
            })
        }
        node.properties
            .filter((p) => p !== nameProperty)
            .forEach((property) => {
                result += this.indent(depth + 1) + "*property* " + property.property.key + ": " + property.value + "\n"
            })
        // if (node.references.length === 0) {
        //     result += this.indent(depth + 1) + "No references\n"
        // }
        node.references.forEach((ref) => {
            result += this.indent(depth + 1) + "*reference*" + ref.reference.key + "*\n"
            ref.targets.forEach((tgt, tgtIndex) => (result += this.indent(depth + 2) + `[${tgtIndex}] resolve ${tgt.resolveInfo} target: ${tgt.reference}\n`))
        })
        node.containments.forEach((cont) => {
            if (cont.children.length !== 0) {
                result += this.indent(depth + 1) + "*containment*" + cont.containment.key + "*" + "\n"
                cont.children.forEach((ch, chIndex) => {
                    result += `[${chIndex}]` + this.recursiveToString(this.getNode(ch), depth + 1)
                })
            }
        })
        // if (node.annotations.length > 0) { 
        //     result += "annotations: "
        //     node.annotations.forEach(ann => {
        //         result += ann +  " "
        //     })
        //     result += "\n"
        // }
        return result
    }

    private indent(depth: number): string {
        return Array(depth).join("    ")
    }
}
