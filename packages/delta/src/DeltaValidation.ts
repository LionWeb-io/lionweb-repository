import { ValidationResult, SyntaxValidator, JsonContext, TypeDefinition } from "@lionweb/validation"
import { commandMap } from "./CommandDefinitions.js"
import { CommandKind } from "./DeltaCommands.js"

export type UnknownObjectType = { [key: string]: unknown }

export type PropertyType =
    | "string"
    | "number"
    | "bigint"
    | "boolean"
    | "symbol"
    | "undefined"
    | "object"
    | "function"
    | "array"
    | "LionWebMetaPointer"
    | "LionWebId"
    | "LionWebKey"
    | "LionWebVersion"
    | "LionWebChunk"
    | "CommandKind"
    | "ResponseMessage"

export class DeltaValidation extends SyntaxValidator {
    constructor(validationResult: ValidationResult) {
        super(validationResult, commandMap)
    }

    validateCommand(object: UnknownObjectType) {
        const kind = object.kind as CommandKind
        if (kind === undefined) {
            console.log("ERROR, unknown command object type")
            return
        }
        const commandKind = object["kind"] as string
        this.validate(object, commandKind)
    }
}
