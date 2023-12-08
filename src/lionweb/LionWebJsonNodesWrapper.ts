import { LionWebJsonChild as LionWebJsonContainment, LionWebJsonMetaPointer, LionWebJsonNode } from "@lionweb/validation";

export type NodeId = string;

// TODO Reconciliate with @lionweb/validation
/**
 * Wraps around a LionWebJsonChunk, providing access to information inside, using caches to improve performance.
 */
export class LionWebJsonNodesWrapper {
    nodes: LionWebJsonNode[] = [];
    /**
     * Map to get quick access to nodes by id.
     * @protected
     */
    protected nodesIdMap: Map<NodeId, LionWebJsonNode>;

    constructor(nodes: LionWebJsonNode[]) {
        this.nodes = nodes;
        // this.prepareNodeIds();
    }

    /**
     * Find all nodes in the tree starting at `node` with depth `depth`
     * @param node
     * @param depth
     */
    findTreeWithDepth(nodes: string[], depth: number): string[] {
        const result = [...nodes];
        this.findTreeRecursiveA(nodes, depth, result);
        return result;
    }

    findTreeRecursiveA(nodes: string[], depth: number, result: string[]): void {
        if (depth > 0) {
            for (const node of nodes) {
                const jsoinNode = this.getNode(node);
                const containments = this.getNode(node)?.containments;
                if (containments !== undefined && containments !== null) {
                    for (const containment of containments) {
                        result.push(...containment.children);
                        this.findTreeRecursiveA(containment.children, depth - 1, result);
                    }
                }
                const annotations = this.getNode(node)?.annotations;
                if (annotations !== undefined && annotations !== null) {
                    result.push(...annotations);
                    this.findTreeRecursiveA(annotations, depth - 1, result);
                }
            }
        }
    }

    /** Put all nodes in a map, validate that there are no two nodes with the same id.
     *  The check should logically be in LionWebReferenceValidator, but the created map is needed here.
     */
    prepareNodeIds() {
        this.nodesIdMap = new Map<NodeId, LionWebJsonNode>();
        this.nodes.forEach((node) => {
            this.nodesIdMap.set(node.id, node);
        });
    }

    getMap(): Map<NodeId, LionWebJsonNode> {
        if (this.nodesIdMap === undefined) {
            this.nodesIdMap = new Map<NodeId, LionWebJsonNode>()
            this.prepareNodeIds();
        }
        return this.nodesIdMap;
    }

    getNode(id: string): LionWebJsonNode | undefined {
        return this.getMap().get(id);
    }

    findContainment(node: LionWebJsonNode, containment: LionWebJsonMetaPointer): LionWebJsonContainment {
        return node.containments.find(cont =>
            (cont.containment.key === containment.key) &&
            (cont.containment.language === containment.language) &&
            (cont.containment.version === containment.version)
        );
    }

}
export function    findContainmentContainingChild(containments: LionWebJsonContainment[], childId: string): LionWebJsonContainment {
        return containments.find(cont => (cont.children.includes(childId))
        );
    }


