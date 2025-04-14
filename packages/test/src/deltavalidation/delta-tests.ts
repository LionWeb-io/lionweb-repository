import { DeltaValidation } from "@lionweb/repository-delta/dist/DeltaValidation.js"
import fs from "node:fs"
import { assert } from "chai"
// const { deepEqual, fail } = assert
import { ValidationResult } from "@lionweb/validation"
import sm from "source-map-support"

sm.install()

const addPropertyJson = fs.readFileSync("./src/deltavalidation/addProperty.json").toString()
const addPropertyTests = JSON.parse(addPropertyJson)
// console.log(JSON.stringify(addPropertyTests, null, 2))
// console.log("=======")

const validator = new DeltaValidation(new ValidationResult())

addPropertyTests.tests.forEach((propTest: unknown, index: number) => {
    describe(`Repository tests addProperty[${index}]`, () => {
        before("empty before", async function () {})

        it("test addProperty ", async () => {
            validator.validationResult.issues = []
            // console.log("-----")
            // console.log(JSON.stringify(propTest, null, 2))
            // console.log("=====")
            // @ts-expect-error TS2339
            const kind = propTest?.command?.kind
            assert(kind === "addProperty", `Expected addPropertyCommand at index ${index}`)

            // @ts-expect-error TS2339
            const command = propTest.command
            validator.validateCommand(command)
            validator.validationResult.issues.forEach(issue => {
                console.log(`Issue ${issue.issueType}: ${issue.errorMsg()}`)
            })
            // @ts-expect-error TS2339
            if (propTest.expectedError === null) {
                assert(
                    validator.validationResult.issues.length === 0,
                    `expected at no error, got ${validator.validationResult.issues.length}`
                )
            } else {
                assert(
                    validator.validationResult.issues.length > 0,
                    `expected at least 1 error, got ${validator.validationResult.issues.length}`
                )
                // @ts-expect-error TS2339
                assert(validator.validationResult.issues[0].issueType === propTest.expectedError, "unexpected error")
            }
        })
    })
})
