import { LionWebJsonChunk, LionWebJsonChunkWrapper, LionWebJsonNode } from "@lionweb/validation"
import { assert } from "chai"
import { before } from "mocha"
import { LionWebJsonNodesWrapper } from "../lionweb/LionWebJsonNodesWrapper.js";
import { LionWebJsonDiff } from "./diff/LionWebJsonDiff.js"
import { TestClient } from "./TestClient.js"

const { deepEqual } = assert
import sm from "source-map-support"

sm.install()

describe("Library test model", () => {
    const t = new TestClient()
    let jsonModel: LionWebJsonChunk

    beforeEach("a", async function () {
        jsonModel = t.readModel("./src/test/data/Disk_A.json") as LionWebJsonChunk
        await t.init();
        // printChunk(jsonModel)
        await t.testStore(jsonModel)
        console.log("Calling done")
        // done()
    })

    it("retrieve nodes", async () => {
        const retrieve = (await t.testRetrieve()) as LionWebJsonChunk
        // console.log("Retrieved: " + JSON.stringify(retrieve))
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(jsonModel, retrieve)
        deepEqual(diff.errors, [])
    })

    it("retrieve partitions", async () => {
        const model = structuredClone(jsonModel)
        model.nodes = model.nodes.filter((node) => node.parent === null)
        const partitions = await t.testPartitions()
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(model, partitions)
        deepEqual(diff.errors, [])
    })

    it("test update full model", async () => {
        const jsonModel2 = t.readModel("./src/test/data/Disk_B-1.json") as LionWebJsonChunk
        // printChunk(jsonModel2)
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(jsonModel, jsonModel2)
        console.log("Diff: " + diff.errors)

        const result = await t.testStore(jsonModel2) as string[]
        console.log("Result: \n" + result.join("\n"))
        
        await testResult()
    })
    it("test update (5)", async () => {
        const jsonModel2 = t.readModel("./src/test/data/Disk_B-2.json") as LionWebJsonChunk
        printChunk(jsonModel2)
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(jsonModel, jsonModel2)
        console.log("Diff: " + diff.errors)
        const result = await t.testStore(jsonModel2) as string[]
        console.log("Result: \n" + result.join("\n"))

        await testResult()
    })
    it("test update (5) and (4)", async () => {
        const jsonModel2 = t.readModel("./src/test/data/Disk_B-3.json") as LionWebJsonChunk
        // printChunk(jsonModel2)
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(jsonModel, jsonModel2)
        console.log("Diff: " + diff.errors)
        const result = await t.testStore(jsonModel2) as string[]
        console.log("Result: \n" + (result === null ? "" : result.join("\n")))

        await testResult()
    })

    it("test update (5) and (9)", async () => {
        const jsonModel2 = t.readModel("./src/test/data/Disk_B-4.json") as LionWebJsonChunk
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(jsonModel, jsonModel2)

        const result = await t.testStore(jsonModel2) as string[]
        console.log("Result: \n" + (result === null ? "" : result.join("\n")))
        
        await testResult()
    })

    async function testResult() {
        const jsonModelFull = t.readModel("./src/test/data/Disk_B-1.json") as LionWebJsonChunk
        const afterRetrieve = (await t.testRetrieve()) as LionWebJsonChunk
        // console.log("Retrieved: " + JSON.stringify(retrieve))
        const diff2 = new LionWebJsonDiff()

        console.log("JSON MODEL ")
        printChunk(jsonModelFull)
        console.log("Retrieved ")
        printChunk(afterRetrieve)
        diff2.diffLwChunk(jsonModelFull, afterRetrieve)
        deepEqual(diff2.errors, [])
    }
})

function printChunk(chunk: LionWebJsonChunk): void {
    const wrapper = new LionWebJsonNodesWrapper(chunk.nodes)
    console.log(wrapper.asString())
}
