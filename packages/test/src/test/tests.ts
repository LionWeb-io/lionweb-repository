import { RetrieveResponse } from "@lionweb/repository-common";
import { LanguageChange, LionWebJsonChunk, LionWebJsonChunkWrapper, LionWebJsonDiff, NodeRemoved } from "@lionweb/validation"
import { assert } from "chai"
import { RepositoryClient } from "./RepositoryClient.js"

const { deepEqual } = assert
import sm from "source-map-support"

sm.install()
const DATA: string = "./data/"

describe("Repository tests", () => {
    const t = new RepositoryClient()
    let baseFullChunk: LionWebJsonChunk

    beforeEach("a", async function () {
        const initialPartition = t.readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk
        baseFullChunk = t.readModel(DATA + "Disk_A.json") as LionWebJsonChunk
        const initResponse = await t.init()
        if (initResponse.status !== 200) {
            console.log("Cannot initialize database: " + JSON.stringify(initResponse.body))
        }
        const partResult = await t.testCreatePartitions(initialPartition)
        if (partResult.status !== 200) {
            console.log("Cannot create initial partition: " + JSON.stringify(partResult.body))
            console.log(JSON.stringify(initialPartition))
        }
        console.log("CREATE PARTITIONS RESULT " + JSON.stringify(partResult))
        const result = await t.testStore(baseFullChunk)
        if (result.status !== 200) {
            console.log("Cannot store initial chunk: " + JSON.stringify(result.body))
        }
    })

    describe("Partition tests", () => {
        it("retrieve nodes", async () => {
            const retrieve = await t.testRetrieve(["ID-2"])
            console.log("JSON MODEL ORIGINAL")
            printChunk(baseFullChunk)
            console.log("JSON MODEL RETRIEVED")
            const retrieveResponse = retrieve.body as RetrieveResponse 
            printChunk(retrieveResponse.chunk)
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(baseFullChunk, retrieveResponse.chunk)
            deepEqual(diff.diffResult.changes, [])
        })

        it("retrieve partitions", async () => {
            const model = structuredClone(baseFullChunk)
            model.nodes = model.nodes.filter(node => node.parent === null)
            const partitions = await t.testPartitions()
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(model, partitions.chunk)
            deepEqual(diff.diffResult.changes, [])
        })

        it("delete partitions", async () => {
            const prePartitions = await t.testPartitions()
            console.log("PRe partitions: " + JSON.stringify(prePartitions))
            const deleteResult = await t.testDeletePartitions(["ID-2"])
            console.log("test Delete partitions: " + JSON.stringify(deleteResult))
            const partitions = await t.testPartitions()
            console.log("Test  partitions: " + JSON.stringify(partitions))
            deepEqual(partitions.chunk, { "serializationFormatVersion": "2023.1", "languages": [], "nodes": [] })
        })
    })

    describe("Move node (9) to from parent (4) to (5)", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "move-child/Disk-move-child-partition.json",
                DATA + "move-child/Disk-move-child-partition.json"
            )
        })
        it("test update node (5)", async () => {
            await testResult(
                DATA + "move-child/Disk-move-child-partition.json",
                DATA + "move-child/Disk-move-child-single-node.json"
            )
        })
        it("test update nodes (5) and (4)", async () => {
            await testResult(
                DATA + "move-child/Disk-move-child-partition.json",
                DATA + "move-child/Disk-move-child-two-nodes.json"
            )
        })

        it("test update nodes (5) and (9)", async () => {
            await testResult(
                DATA + "move-child/Disk-move-child-partition.json",
                DATA + "move-child/Disk-move-child-two-nodes-2.json"
            )
        })
    })

    describe("Change value of node (3) property 'name' to 'root-new-value'", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "change-property-value/Disk_Property_value_changed-partition.json",
                DATA + "change-property-value/Disk_Property_value_changed-partition.json"
            )
        })
        it("test update node (3)", async () => {
            await testResult(
                DATA + "change-property-value/Disk_Property_value_changed-partition.json",
                DATA + "change-property-value/Disk_Property_value_changed-single-node.json"
            )
        })
    })

    describe("Add new property ", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "add-new-property-with-value/Disk-Property-add-property-partition.json",
                DATA + "add-new-property-with-value/Disk-Property-add-property-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "add-new-property-with-value/Disk-Property-add-property-partition.json",
                DATA + "add-new-property-with-value/Disk-Property-add-property-single-node.json"
            )
        })
    })

    describe("Remove node (4) from parent (3) and mode child (9) to (5)", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "remove-child/Disk-remove-child-partition.json",
                DATA + "remove-child/Disk-remove-child-partition.json"
            )
        })
        it("test update (3)", async () => {
            await testResult(
                DATA + "remove-child/Disk-remove-child-partition.json",
                DATA + "remove-child/Disk-remove-child-single-node.json"
            )
        })
    })

    describe("Add reference", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "add-reference/Disk_add-reference-partition.json",
                DATA + "add-reference/Disk_add-reference-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "add-reference/Disk_add-reference-partition.json",
                DATA + "add-reference/Disk_add-reference-single-node.json"
            )
        })
    })
    describe("Remove reference", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "remove-reference/Disk-remove-reference-partition.json",
                DATA + "remove-reference/Disk-remove-reference-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "remove-reference/Disk-remove-reference-partition.json",
                DATA + "remove-reference/Disk-remove-reference-single-node.json"
            )
        })
    })
    describe("Remove annotation", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            await testResult(
                DATA + "remove-annotation/Disk-remove-annotation-partition.json",
                DATA + "remove-annotation/Disk-remove-annotation-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "remove-annotation/Disk-remove-annotation-partition.json",
                DATA + "remove-annotation/Disk-remove-annotation-single-node.json"
            )
        })
    })
    describe("Add new annotation", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            await testResult(
                DATA + "add-new-annotation/Disk-add-new-annotation-partition.json",
                DATA + "add-new-annotation/Disk-add-new-annotation-partition.json"
            )
        })
        it("test update two nodes node", async () => {
            await testResult(
                DATA + "add-new-annotation/Disk-add-new-annotation-partition.json",
                DATA + "add-new-annotation/Disk-add-new-annotation-two-nodes.json"
            )
        })
    })
    describe("Add new node", () => {
        // TODO ANN-1 is still in the repo !!!
        it("test update full partition", async () => {
            await testResult(
                DATA + "add-new-nodes/Disk-add-new-nodes-partition.json",
                DATA + "add-new-nodes/Disk-add-new-nodes-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "add-new-nodes/Disk-add-new-nodes-partition.json",
                DATA + "add-new-nodes/Disk-add-new-nodes-single-node.json"
            )
        })
    })
    describe("Reorder children", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "reorder-children/reorder-children-partition.json",
                DATA + "reorder-children/reorder-children-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "reorder-children/reorder-children-partition.json",
                DATA + "reorder-children/reorder-children-single-node.json"
            )
        })
    })

    describe("Reorder annotations", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "reorder-annotations/reorder-annotations-partition.json",
                DATA + "reorder-annotations/reorder-annotations-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "reorder-annotations/reorder-annotations-partition.json",
                DATA + "reorder-annotations/reorder-annotations-single-node.json"
            )
        })
    })
    describe("Reorder reference targets", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "reorder-reference-targets/reorder-reference-targets-partition.json",
                DATA + "reorder-reference-targets/reorder-reference-targets-partition.json"
            )
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "reorder-reference-targets/reorder-reference-targets-partition.json",
                DATA + "reorder-reference-targets/reorder-reference-targets-single-node.json"
            )
        })
    })

    async function testResult(originalJsonFile: string, changesFile: string) {
        const changesChunk = t.readModel(changesFile) as LionWebJsonChunk
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(baseFullChunk, changesChunk)
        console.log("DIFF number of changes: " + diff.diffResult.changes.length)
        diff.diffResult.changes.filter(change => !(change instanceof NodeRemoved)).forEach(change => console.log(change.changeMsg()))

        const result = await t.testStore(changesChunk)
        console.log("Result: \n" + JSON.stringify(result.body))
        assert(result.status === 200)

        const jsonModelFull = t.readModel(originalJsonFile) as LionWebJsonChunk
        const afterRetrieve = await t.testRetrieve(["ID-2"])
        console.log("JSON MODEL ")
        printChunk(jsonModelFull)
        console.log("Retrieved with status " + afterRetrieve.status)
        const retrieveResponse = afterRetrieve.body as RetrieveResponse
        if (afterRetrieve.status === 400) {
            console.log(retrieveResponse.messages)
            deepEqual(afterRetrieve.status, 200)
        } else {
            printChunk(retrieveResponse.chunk)
            const diff2 = new LionWebJsonDiff()
            diff2.diffLwChunk(jsonModelFull, retrieveResponse.chunk)
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
