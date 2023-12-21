import { LionWebJsonChunk, LionWebJsonChunkWrapper, LionWebJsonDiff } from "@lionweb/validation"
import { assert } from "chai"
import { TestClient } from "./TestClient.js"

const { deepEqual } = assert
import sm from "source-map-support"

sm.install()

describe("Repository tests", () => {
    const t = new TestClient()
    let jsonModel: LionWebJsonChunk

    beforeEach("a", async function () {
        jsonModel = t.readModel("./src/test/data/Disk_A.json") as LionWebJsonChunk
        await t.init()
        await t.testStore(jsonModel)
    })

    it("retrieve nodes", async () => {
        const retrieve = (await t.testRetrieve(["ID-2"])) as LionWebJsonChunk
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(jsonModel, retrieve)
        deepEqual(diff.diffResult.changes, [])
    })

    it("retrieve partitions", async () => {
        const model = structuredClone(jsonModel)
        model.nodes = model.nodes.filter(node => node.parent === null)
        const partitions = await t.testPartitions()
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(model, partitions)
        deepEqual(diff.diffResult.changes, [])
    })

    describe("Move node (9) to from parent (4) to (5)", () => {
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel("./src/test/data/Disk_B-1.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = (await t.testStore(jsonModel2)) as string[]
            console.log("Result: \n" + result.join("\n"))

            await testResult()
        })
        it("test update node (5)", async () => {
            const jsonModel2 = t.readModel("./src/test/data/Disk_B-2.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = (await t.testStore(jsonModel2)) as string[]
            console.log("Result: \n" + result.join("\n"))

            await testResult()
        })
        it("test update nodes (5) and (4)", async () => {
            const jsonModel2 = t.readModel("./src/test/data/Disk_B-3.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = (await t.testStore(jsonModel2)) as string[]
            console.log("Result: \n" + (result === null ? "" : result.join("\n")))

            await testResult()
        })

        it("test update nodes (5) and (9)", async () => {
            const jsonModel2 = t.readModel("./src/test/data/Disk_B-4.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)

            const result = (await t.testStore(jsonModel2)) as string[]
            console.log("Result: \n" + (result === null ? "" : result.join("\n")))

            await testResult()
        })
    })

    async function testResult() {
        const jsonModelFull = t.readModel("./src/test/data/Disk_B-1.json") as LionWebJsonChunk
        const afterRetrieve = (await t.testRetrieve(["ID-2"])) as LionWebJsonChunk
        // console.log("Retrieved: " + JSON.stringify(retrieve))
        const diff2 = new LionWebJsonDiff()

        console.log("JSON MODEL ")
        printChunk(jsonModelFull)
        console.log("Retrieved ")
        printChunk(afterRetrieve)
        diff2.diffLwChunk(jsonModelFull, afterRetrieve)
        deepEqual(diff2.diffResult.changes, [])
    }
})

function printChunk(chunk: LionWebJsonChunk): void {
    const wrapper = new LionWebJsonChunkWrapper(chunk)
    console.log(wrapper.asString())
}
