import { JsonContext, LionWebJsonNode } from "@lionweb/validation";
import { Change } from "./Change.js";

export abstract class ContainmentChange extends Change {
    constructor(public context: JsonContext,
                public parentNode: LionWebJsonNode,
                public containmentKey: string,
                public childId: string)
    {
        super(context);
    }
}

export class ChildAdded extends ContainmentChange {
    readonly id = "ChildAdded";
    protected msg = () => `Node "${this.parentNode.id}" added child "${this.childId}"`;
}

export function isChildAdded(ch: Change): ch is ChildAdded {
    return (!!ch) && ch.id === "ChildAdded";
}

export class ChildRemoved extends ContainmentChange {
    readonly id = "ChildRemoved";
    protected msg = () => `Node "${this.parentNode.id}" removed child "${this.childId}"`;
}

export class ParentChanged extends Change {
    readonly id = "ParentChanged";
    constructor(public context: JsonContext,
                public node: LionWebJsonNode,
                public beforeParentId: string,
                public afterParentId: string)
    {
        super(context);
    }
    protected msg = () => `Node "${this.node.id}" changhed parent from "${this.beforeParentId}" to "${this.afterParentId}`;
}
