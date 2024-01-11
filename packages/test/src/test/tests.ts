import { LanguageChange, LionWebJsonChunk, LionWebJsonChunkWrapper, LionWebJsonDiff } from "@lionweb/validation"
import { assert } from "chai"
import { RepositoryClient } from "./RepositoryClient.js"

const { deepEqual } = assert
import sm from "source-map-support"

sm.install()

describe("Repository tests", () => {
    const t = new RepositoryClient()
    let baseFullChunk: LionWebJsonChunk

    beforeEach("a", async function () {
        baseFullChunk = t.readModel("./src/test/data/Disk_A.json") as LionWebJsonChunk
        await t.init()
        await t.testStore(baseFullChunk)
    })

    it("retrieve nodes", async () => {
        const retrieve = await t.testRetrieve(["ID-2"])
        console.log("JSON MODEL ORIGINAL")
        printChunk(baseFullChunk)
        console.log("JSON MODEL RETRIEVED")
        printChunk(retrieve.json as LionWebJsonChunk)
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(baseFullChunk, retrieve.json as LionWebJsonChunk)
        deepEqual(diff.diffResult.changes, [])
    })

    it("retrieve partitions", async () => {
        const model = structuredClone(baseFullChunk)
        model.nodes = model.nodes.filter(node => node.parent === null)
        const partitions = await t.testPartitions()
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(model, partitions)
        deepEqual(diff.diffResult.changes, [])
    })

    describe("Move node (9) to from parent (4) to (5)", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/move-child/Disk-move-child-partition.json",
                "./src/test/data/move-child/Disk-move-child-partition.json"
            )
        })
        it("test update node (5)", async () => {
            await testResult(
                "./src/test/data/move-child/Disk-move-child-partition.json",
                "./src/test/data/move-child/Disk-move-child-single-node.json"
            )
        })
        it("test update nodes (5) and (4)", async () => {
            await testResult(
                "./src/test/data/move-child/Disk-move-child-partition.json",
                "./src/test/data/move-child/Disk-move-child-two-nodes.json"
            )
        })

        it("test update nodes (5) and (9)", async () => {
            await testResult(
                "./src/test/data/move-child/Disk-move-child-partition.json",
                "./src/test/data/move-child/Disk-move-child-two-nodes-2.json"
            )
        })
    })

    describe("Change value of node (3) property 'name' to 'root-new-value'", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/change-property-value/Disk_Property_value_changed-partition.json",
                "./src/test/data/change-property-value/Disk_Property_value_changed-partition.json"
            )
        })
        it("test update node (3)", async () => {
            await testResult(
                "./src/test/data/change-property-value/Disk_Property_value_changed-partition.json",
                "./src/test/data/change-property-value/Disk_Property_value_changed-single-node.json"
            )
        })
    })

    describe("Add new property ", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/add-new-property-with-value/Disk-Property-add-property-partition.json",
                "./src/test/data/add-new-property-with-value/Disk-Property-add-property-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                "./src/test/data/add-new-property-with-value/Disk-Property-add-property-partition.json",
                "./src/test/data/add-new-property-with-value/Disk-Property-add-property-single-node.json"
            )
        })
    })

    describe("Remove node (4) from parent (3) and mode child (9) to (5)", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/remove-child/Disk-remove-child-partition.json",
                "./src/test/data/remove-child/Disk-remove-child-partition.json"
            )
        })
        it("test update (3)", async () => {
            await testResult(
                "./src/test/data/remove-child/Disk-remove-child-partition.json",
                "./src/test/data/remove-child/Disk-remove-child-single-node.json"
            )
        })
    })

    describe("Add reference", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/add-reference/Disk_add-reference-partition.json",
                "./src/test/data/add-reference/Disk_add-reference-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                "./src/test/data/add-reference/Disk_add-reference-partition.json",
                "./src/test/data/add-reference/Disk_add-reference-single-node.json"
            )
        })
    })
    describe("Remove reference", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/remove-reference/Disk-remove-reference-partition.json",
                "./src/test/data/remove-reference/Disk-remove-reference-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                "./src/test/data/remove-reference/Disk-remove-reference-partition.json",
                "./src/test/data/remove-reference/Disk-remove-reference-single-node.json"
            )
        })
    })
    describe("Remove annotation", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/remove-annotation/Disk-remove-annotation-partition.json",
                "./src/test/data/remove-annotation/Disk-remove-annotation-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                "./src/test/data/remove-annotation/Disk-remove-annotation-partition.json",
                "./src/test/data/remove-annotation/Disk-remove-annotation-single-node.json"
            )
        })
    })
    describe("Add new annotation", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/add-new-annotation/Disk-add-new-annotation-partition.json",
                "./src/test/data/add-new-annotation/Disk-add-new-annotation-partition.json"
            )
        })
        it("test update two nodes node", async () => {
            await testResult(
                "./src/test/data/add-new-annotation/Disk-add-new-annotation-partition.json",
                "./src/test/data/add-new-annotation/Disk-add-new-annotation-two-nodes.json"
            )
        })
    })
    describe("Add new node", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/add-new-nodes/Disk-add-new-nodes-partition.json",
                "./src/test/data/add-new-nodes/Disk-add-new-nodes-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                "./src/test/data/add-new-nodes/Disk-add-new-nodes-partition.json",
                "./src/test/data/add-new-nodes/Disk-add-new-nodes-single-node.json"
            )
        })
    })
    describe("Reorder children", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/reorder-children/reorder-children-partition.json",
                "./src/test/data/reorder-children/reorder-children-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                "./src/test/data/reorder-children/reorder-children-partition.json",
                "./src/test/data/reorder-children/reorder-children-single-node.json"
            )
        })
    })

    describe("Reorder annotations", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/reorder-annotations/reorder-annotations-partition.json",
                "./src/test/data/reorder-annotations/reorder-annotations-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                "./src/test/data/reorder-annotations/reorder-annotations-partition.json",
                "./src/test/data/reorder-annotations/reorder-annotations-single-node.json"
            )
        })
    })
    describe("Reorder reference targets", () => {
        it("test update full partition", async () => {
            await testResult(
                "./src/test/data/reorder-reference-targets/reorder-reference-targets-partition.json",
                "./src/test/data/reorder-reference-targets/reorder-reference-targets-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                "./src/test/data/reorder-reference-targets/reorder-reference-targets-partition.json",
                "./src/test/data/reorder-reference-targets/reorder-reference-targets-single-node.json"
            )
        })
    })

    async function testResult(originalJsonFile: string, changesFile: string) {
        const changesChunk = t.readModel(changesFile) as LionWebJsonChunk
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(baseFullChunk, changesChunk)
        console.log("DIF " + diff.diffResult.asStringArray())

        const result = await t.testStore(changesChunk)
        console.log("Result: \n" + JSON.stringify(result))
        assert(result.status === 200)

        const jsonModelFull = t.readModel(originalJsonFile) as LionWebJsonChunk
        const afterRetrieve = await t.testRetrieve(["ID-2"])
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
            deepEqual(
                diff2.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)),
                []
            )
        }
    }
})

function printChunk(chunk: LionWebJsonChunk): void {
    const wrapper = new LionWebJsonChunkWrapper(chunk)
    console.log(wrapper.asString())
}
