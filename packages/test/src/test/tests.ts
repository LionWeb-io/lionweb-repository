import { LanguageChange, LionWebJsonChunk, LionWebJsonChunkWrapper, LionWebJsonDiff } from "@lionweb/validation"
import { assert } from "chai"
import { RepositoryClient } from "./RepositoryClient.js"

const { deepEqual } = assert
import sm from "source-map-support"

sm.install()

describe("Repository tests", () => {
    const t = new RepositoryClient()
    let jsonModel: LionWebJsonChunk

    beforeEach("a", async function () {
        jsonModel = t.readModel("./src/test/data/Disk_A.json") as LionWebJsonChunk
        await t.init()
        await t.testStore(jsonModel)
    })

    it("retrieve nodes", async () => {
        const retrieve = (await t.testRetrieve(["ID-2"]))
        console.log("JSON MODEL ORIGINAL")
        printChunk(jsonModel)
        console.log("JSON MODEL RETRIEVED")
        printChunk(retrieve.json  as LionWebJsonChunk)
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(jsonModel, retrieve.json  as LionWebJsonChunk)
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
            const jsonModel2 = t.readModel("./src/test/data/move-child/Disk-move-child-partition.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = (await t.testStore(jsonModel2)) 
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/move-child/Disk-move-child-partition.json")
        })
        it("test update node (5)", async () => {
            const jsonModel2 = t.readModel("./src/test/data/move-child/Disk-move-child-single-node.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = (await t.testStore(jsonModel2)) 
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/move-child/Disk-move-child-partition.json")
        })
        it("test update nodes (5) and (4)", async () => {
            const jsonModel2 = t.readModel("./src/test/data/move-child/Disk-move-child-two-nodes.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/move-child/Disk-move-child-partition.json")
        })

        it("test update nodes (5) and (9)", async () => {
            const jsonModel2 = t.readModel("./src/test/data/move-child/Disk-move-child-two-nodes-2.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)

            const result = (await t.testStore(jsonModel2)) 
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/move-child/Disk-move-child-partition.json")
        })
    })

    describe("Change value of node (3) property 'name' to 'root-new-value'", () => {
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/change-property-value/Disk_Property_value_changed-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = await t.testStore(jsonModel2)
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/change-property-value/Disk_Property_value_changed-partition.json")
        })
        it("test update node (3)", async () => {
            const jsonModel2 = t.readModel("./src/test/data/change-property-value/Disk_Property_value_changed-single-node.json") as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = await t.testStore(jsonModel2)
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/change-property-value/Disk_Property_value_changed-partition.json")
        })
    })

    describe("Add new property ", () => {
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/add-new-property-with-value/Disk-Property-add-property-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = await t.testStore(jsonModel2)
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/add-new-property-with-value/Disk-Property-add-property-partition.json")
        })
        it("test update single node", async () => {
            const jsonModel2 = t.readModel("./src/test/data/add-new-property-with-value/Disk-Property-add-property-single-node.json") as LionWebJsonChunk
            // const diff = new LionWebJsonDiff()
            // console.log("1 " + jsonModel + " 2 " + jsonModel2)
            // diff.diffLwChunk(jsonModel, jsonModel2)
            const result = await t.testStore(jsonModel2)
            console.log("Result: \n" + JSON.stringify(result, null, 2))

            await testResult("./src/test/data/add-new-property-with-value/Disk-Property-add-property-partition.json")
        })
    })

    describe("Remove node (4) from parent (3) and mode child (9) to (5)", () => {
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/remove-child/Disk-remove-child-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = await t.testStore(jsonModel2)
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/remove-child/Disk-remove-child-partition.json")
        })
        it("test update (3)", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/remove-child/Disk-remove-child-single-node.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            const result = (await t.testStore(jsonModel2))
            console.log("Store: " + jsonModel2.nodes.map(n => n.id))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/remove-child/Disk-remove-child-partition.json")
        })
    })

    describe("Add reference", () => {
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/add-reference/Disk_add-reference-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/add-reference/Disk_add-reference-partition.json")
        })
        it("test update single node", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/add-reference/Disk_add-reference-single-node.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/add-reference/Disk_add-reference-partition.json")
        })
    })
    describe("Remove reference", () => {
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/remove-reference/Disk-remove-reference-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/remove-reference/Disk-remove-reference-partition.json")
        })
        it("test update single node", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/remove-reference/Disk-remove-reference-single-node.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/remove-reference/Disk-remove-reference-partition.json")
        })
    })
    describe("Remove annotation", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/remove-annotation/Disk-remove-annotation-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/remove-annotation/Disk-remove-annotation-partition.json")
        })
        it("test update single node", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/remove-annotation/Disk-remove-annotation-single-node.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/remove-annotation/Disk-remove-annotation-partition.json")
        })
    })
    describe("Add new annotation", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/add-new-annotation/Disk-add-new-annotation-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/add-new-annotation/Disk-add-new-annotation-partition.json")
        })
        it("test update two nodes node", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/add-new-annotation/Disk-add-new-annotation-two-nodes.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/add-new-annotation/Disk-add-new-annotation-partition.json")
        })
    })
    describe("Add new node", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/add-new-nodes/Disk-add-new-nodes-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + result.json)
            if (result.status === 400) {
                console.log("ASJSON: \n" + result.json["issues"])
            }
            await testResult("./src/test/data/add-new-nodes/Disk-add-new-nodes-partition.json")
        })
        it("test update single node", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/add-new-nodes/Disk-add-new-nodes-single-node.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/add-new-nodes/Disk-add-new-nodes-partition.json")
        })
    })
    describe("Reorder children", () => {
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/reorder-children/reorder-children-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + result.json)
            if (result.status === 400) {
                console.log("ASJSON: \n" + result.json["issues"])
            }
            await testResult("./src/test/data/reorder-children/reorder-children-partition.json")
        })
        it("test update single node", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/reorder-children/reorder-children-single-node.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))

            await testResult("./src/test/data/reorder-children/reorder-children-partition.json")
        })
    })

    describe("Reorder annotations", () => {
        it("test update full partition", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/reorder-annotations/reorder-annotations-partition.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + result.json)
            if (result.status === 400) {
                console.log("ASJSON: \n" + result.json["issues"])
            }
            await testResult("./src/test/data/reorder-annotations/reorder-annotations-partition.json")
        })
        it("test update single node", async () => {
            const jsonModel2 = t.readModel(
                "./src/test/data/reorder-annotations/reorder-annotations-single-node.json",
            ) as LionWebJsonChunk
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(jsonModel, jsonModel2)
            console.log("DIF " + diff.diffResult.asStringArray())

            const result = (await t.testStore(jsonModel2))
            console.log("Result: \n" + JSON.stringify(result))
            assert(result.status === 200)

            await testResult("./src/test/data/reorder-annotations/reorder-annotations-partition.json")
        })
    })

    async function testResult(originalJsonFile) {
        const jsonModelFull = t.readModel(originalJsonFile) as LionWebJsonChunk
        const afterRetrieve = (await t.testRetrieve(["ID-2"])) 
        console.log("JSON MODEL ")
        printChunk(jsonModelFull)
        console.log("Retrieved with status " + afterRetrieve.status)
        if (afterRetrieve.status === 400) {
            console.log(afterRetrieve.json["issues"])
            deepEqual(afterRetrieve.status, 200)
        } else {
            printChunk(afterRetrieve.json as LionWebJsonChunk)
            const diff2 = new LionWebJsonDiff()
            diff2.diffLwChunk(jsonModelFull, afterRetrieve.json as LionWebJsonChunk)
            deepEqual(diff2.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)), [])
        }
    }
})

function printChunk(chunk: LionWebJsonChunk): void {
    const wrapper = new LionWebJsonChunkWrapper(chunk)
    console.log(wrapper.asString())
}
