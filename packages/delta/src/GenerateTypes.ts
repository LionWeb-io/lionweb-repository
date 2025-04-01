import { PropertyDefinition } from "@lionweb/validation"
import { commandMap } from "./CommandDefinitions.js"

console.log("START")
commandMap.forEach((value: PropertyDefinition[], key: string) => {
    const result = `
        export type ${key} = ICommand & {
            ${value.map((propDef) => `${propDef.property} : ${propDef.expectedType}`).join(",\n")}
        }
    `
    console.log(result)
})
