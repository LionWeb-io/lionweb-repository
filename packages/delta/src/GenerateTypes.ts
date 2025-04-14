import { TypeDefinition, isObjectDefinition, isPrimitiveDefinition } from "@lionweb/validation"
import { commandMap } from "./CommandDefinitions.js"

let result = ""
commandMap.forEach((value: TypeDefinition, key: string) => {
    // result += `// key: ${key} \n`
    if (isObjectDefinition(value)) {
        result += `
export type ${key} = ICommand & {
    ${value.map((propDef) => `    ${propDef.property} : ${propDef.expectedType}`).join(",\n")}
}
`
    } else if (isPrimitiveDefinition(value)) {
        result += `
export type ${key} = ${value.primitiveType}
`
    }
})
console.log(result)
