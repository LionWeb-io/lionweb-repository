import { JsonContext } from "@lionweb/validation"

export type ChangeType =
    | "GenericChange"
    | "NodeRemoved"
    | "NodeAdded"
    | "ChildRemoved"
    | "ChildAdded"
    | "ParentChanged"
    | "PropertyValueChanged"
    | "SerializationFormatChange"

export abstract class Change {
    abstract readonly id: ChangeType
    context: JsonContext

    constructor(context: JsonContext) {
        this.context = context
    }

    protected abstract msg(): string

    public changeMsg(): string {
        return `${this.id}: ${this.msg()} at ${this.context.toString()} `
    }
}

export class GenericChange extends Change {
    readonly id = "GenericChange"

    constructor(
        context: JsonContext,
        protected message: string,
    ) {
        super(context)
    }

    protected msg(): string {
        return this.message
    }
}
