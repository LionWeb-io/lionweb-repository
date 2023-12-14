import { JsonContext, LionWebJsonNode } from "@lionweb/validation"
import { Change } from "./Change.js"

export abstract class ChunkChange extends Change {
    constructor(public context: JsonContext) {
        super(context)
    }
}

export class SerializationFormatChange extends ChunkChange {
    readonly id = "SerializationFormatChange"

    constructor(
        public context: JsonContext,
        protected original: string,
        protected newValue: string,
    ) {
        super(context)
    }

    protected msg = () => `Serialization versions do not match: ${this.original} vs ${this.newValue}`
}

export class NodeRemoved extends ChunkChange {
    readonly id = "NodeRemoved"

    constructor(
        public context: JsonContext,
        public node: LionWebJsonNode,
    ) {
        super(context)
    }

    protected msg = () => `Node ${this.node.id} is removed`
}

export class NodeAdded extends ChunkChange {
    readonly id = "NodeAdded"

    constructor(
        public context: JsonContext,
        public node: LionWebJsonNode,
    ) {
        super(context)
    }

    protected msg = () => `Node ${this.node.id} is added`
}
