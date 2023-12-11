import { JsonContext, ValidationIssue } from "@lionweb/validation";

export class DiffIssue extends ValidationIssue {
    readonly id: string = "Diff";
    message: string;

    constructor(context: JsonContext, msg: string) {
        super(context);
        this.message = msg;
    }
    protected msg(): string {
        return this.message;
    }
    
}
