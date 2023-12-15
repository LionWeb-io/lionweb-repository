import { LionWebJsonChunk, LionWebJsonNode } from "@lionweb/validation"
import { assert } from "chai"
import fs from "fs"
import { LionWebJsonDiff } from "./LionWebJsonDiff.js"

const { deepEqual } = assert

function readModel(filename: string): any {
    if (fs.existsSync(filename)) {
        const stats = fs.statSync(filename)
        if (stats.isFile()) {
            let chunk: LionWebJsonChunk = JSON.parse(fs.readFileSync(filename).toString())
            return chunk
        }
    }
    return null
}

describe("Library test model", () => {
    it("[de-]serialize example library", async () => {
        const jsonModel = readModel("./src/test/data/Disk_1.json")
        const jsonModel2 = readModel("./src/test/data/Disk_2.json")

        const diff1 = new LionWebJsonDiff()
        diff1.diffLwChunk(jsonModel, jsonModel)
        // No errors expected
        deepEqual(diff1.diffsAsString, [])

        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(jsonModel, jsonModel2)
        // No errors expected
        deepEqual(diff.diffsAsString.length, 4)
    })
})
