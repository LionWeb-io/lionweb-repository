import { HttpClientErrors, HttpSuccessCodes, RetrieveResponse } from "@lionweb/repository-common"
import { LanguageChange, LionWebJsonChunk, LionWebJsonChunkWrapper, LionWebJsonDiff } from "@lionweb/validation"
import { assert } from "chai"
import { RepositoryClient } from "./RepositoryClient.js"

const { deepEqual, equal } = assert
import sm from "source-map-support"

sm.install()
const DATA: string = "./data/"

describe("Repository tests", () => {
    const t = new RepositoryClient()
    let initialPartition: LionWebJsonChunk
    let initialPartitionVersion: number = 0
    let baseFullChunk: LionWebJsonChunk
    let baseFullChunkVersion: number = 0

    before("create database", async function () {
        const initResponse = await t.createDatabase()
        if (initResponse.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot create database: " + JSON.stringify(initResponse.body))
        } else {
            console.log("database created: " + JSON.stringify(initResponse.body))
        }
    })
    
    beforeEach("a", async function () {
        initialPartition = t.readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk
        baseFullChunk = t.readModel(DATA + "Disk_A.json") as LionWebJsonChunk
        const initResponse = await t.init()
        if (initResponse.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot initialize database: " + JSON.stringify(initResponse.body))
        } else {
            console.log("initialized database: " + JSON.stringify(initResponse.body))
        }
        const partResult = await t.testCreatePartitions(initialPartition)
        if (partResult.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot create initial partition: " + JSON.stringify(partResult.body))
            console.log(JSON.stringify(initialPartition))
        }
        // console.log("CREATE PARTITIONS RESULT " + JSON.stringify(partResult))
        initialPartitionVersion = Number.parseInt(partResult.body.messages.find(m => m.data["version"] !== undefined).data["version"])
        const result = await t.testStore(baseFullChunk)
        if (result.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot store initial chunk: " + JSON.stringify(result.body))
        }
        // console.log("STORE PARTITIONS RESULT " + JSON.stringify(result.body.messages))
        const tmp2 = result.body.messages.find(m => m.data["version"] !== undefined).data["version"]
        console.log("TMP 2 [" + tmp2 + "]")
        baseFullChunkVersion = Number.parseInt(result.body.messages.find(m => m.data["version"] !== undefined).data["version"])
        console.log("repoVersionAfterPartitionCreated " + initialPartitionVersion + "repoVersionAfterPartitionFilled " + baseFullChunkVersion)
    })

    describe("Partition tests", () => {
        it("retrieve nodes", async () => {
            const retrieve = await t.testRetrieve(["ID-2"])
            console.log("Retrieve Result: " + JSON.stringify(JSON.stringify(retrieve.body.messages)))
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
            console.log("Retrieve partitions Result: " + JSON.stringify(JSON.stringify(partitions.messages)))
            const diff = new LionWebJsonDiff()
            diff.diffLwChunk(model, partitions.chunk)
            deepEqual(diff.diffResult.changes, [])
        })

        it("delete partitions", async () => {
            const prePartitions = await t.testPartitions()
            console.log("PRe partitions: " + JSON.stringify(prePartitions))
            const deleteResult = await t.testDeletePartitions(["ID-2"])
            console.log("Retrieve partitions Result: " + JSON.stringify(JSON.stringify(deleteResult.body.messages)))
            console.log("test Delete partitions: " + JSON.stringify(deleteResult))
            const partitions = await t.testPartitions()
            console.log("Test  partitions: " + JSON.stringify(partitions))
            deepEqual(partitions.chunk, { "serializationFormatVersion": "2023.1", "languages": [], "nodes": [] })
            console.log("-------------------------------------------------------------------------------")
            const partitions1 = await t.testPartitionsHistory(1)
            console.log("Test  partitions history 1: " + JSON.stringify(partitions1, null, 2))
            const partitions2 = await t.testPartitionsHistory(2)
            console.log("Test  partitions history 2: " + JSON.stringify(partitions2, null, 2))
        })
    })

    describe("Move node (9) to from parent (4) to (5)", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "move-child/Disk-move-child-partition.json",
                DATA + "move-child/Disk-move-child-partition.json"
            )
            await testHistory()
        })
        it("test update node (5)", async () => {
            await testResult(
                DATA + "move-child/Disk-move-child-partition.json",
                DATA + "move-child/Disk-move-child-single-node.json"
            )
            await testHistory()
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
            await testHistory()
        })
    })

    describe("Change value of node (3) property 'name' to 'root-new-value'", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "change-property-value/Disk_Property_value_changed-partition.json",
                DATA + "change-property-value/Disk_Property_value_changed-partition.json"
            )
            await testHistory()
        })
        it("test update node (3)", async () => {
            await testResult(
                DATA + "change-property-value/Disk_Property_value_changed-partition.json",
                DATA + "change-property-value/Disk_Property_value_changed-single-node.json"
            )
            await testHistory()
        })
    })

    describe("Add new property ", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "add-new-property-with-value/Disk-Property-add-property-partition.json",
                DATA + "add-new-property-with-value/Disk-Property-add-property-partition.json"
            )
            await testHistory()
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "add-new-property-with-value/Disk-Property-add-property-partition.json",
                DATA + "add-new-property-with-value/Disk-Property-add-property-single-node.json"
            )
            await testHistory()
        })
    })

    describe("Remove node (4) from parent (3) and mode child (9) to (5)", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "remove-child/Disk-remove-child-partition.json",
                DATA + "remove-child/Disk-remove-child-partition.json"
            )
            await testHistory()
        })
        it("test update (3)", async () => {
            await testResult(
                DATA + "remove-child/Disk-remove-child-partition.json",
                DATA + "remove-child/Disk-remove-child-single-node.json"
            )
            await testHistory()
        })
    })

    describe("Add reference", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "add-reference/Disk_add-reference-partition.json",
                DATA + "add-reference/Disk_add-reference-partition.json"
            )
            await testHistory()
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "add-reference/Disk_add-reference-partition.json",
                DATA + "add-reference/Disk_add-reference-single-node.json"
            )
            await testHistory()
        })
    })
    describe("Remove reference", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "remove-reference/Disk-remove-reference-partition.json",
                DATA + "remove-reference/Disk-remove-reference-partition.json"
            )
            await testHistory()
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "remove-reference/Disk-remove-reference-partition.json",
                DATA + "remove-reference/Disk-remove-reference-single-node.json"
            )
            await testHistory()
        })
    })
    describe("Remove annotation", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "remove-annotation/Disk-remove-annotation-partition.json",
                DATA + "remove-annotation/Disk-remove-annotation-partition.json"
            )
            await testHistory()
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "remove-annotation/Disk-remove-annotation-partition.json",
                DATA + "remove-annotation/Disk-remove-annotation-single-node.json"
            )
            await testHistory()
        })
    })
    describe("Add new annotation", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "add-new-annotation/Disk-add-new-annotation-partition.json",
                DATA + "add-new-annotation/Disk-add-new-annotation-partition.json"
            )
            await testHistory()
        })
        it("test update two nodes node", async () => {
            await testResult(
                DATA + "add-new-annotation/Disk-add-new-annotation-partition.json",
                DATA + "add-new-annotation/Disk-add-new-annotation-two-nodes.json"
            )
            await testHistory()
        })
    })
    describe("Add new node", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "add-new-nodes/Disk-add-new-nodes-partition.json",
                DATA + "add-new-nodes/Disk-add-new-nodes-partition.json"
            )
            await testHistory()
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "add-new-nodes/Disk-add-new-nodes-partition.json",
                DATA + "add-new-nodes/Disk-add-new-nodes-single-node.json"
            )
            await testHistory()
        })
    })
    describe("Reorder children", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "reorder-children/reorder-children-partition.json",
                DATA + "reorder-children/reorder-children-partition.json"
            )
            await testHistory()
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "reorder-children/reorder-children-partition.json",
                DATA + "reorder-children/reorder-children-single-node.json"
            )
            await testHistory()
        })
    })

    describe("Reorder annotations", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "reorder-annotations/reorder-annotations-partition.json",
                DATA + "reorder-annotations/reorder-annotations-partition.json"
            )
            await testHistory()
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "reorder-annotations/reorder-annotations-partition.json",
                DATA + "reorder-annotations/reorder-annotations-single-node.json"
            )
            await testHistory()
        })
    })
    describe("Reorder reference targets", () => {
        it("test update full partition", async () => {
            await testResult(
                DATA + "reorder-reference-targets/reorder-reference-targets-partition.json",
                DATA + "reorder-reference-targets/reorder-reference-targets-partition.json"
            )
            await testHistory()
        })
        it("test update single node", async () => {
            await testResult(
                DATA + "reorder-reference-targets/reorder-reference-targets-partition.json",
                DATA + "reorder-reference-targets/reorder-reference-targets-single-node.json"
            )
            await testHistory()
        })
    })

    describe("Use reserved ids", () => {
        it("test using ids reserved by same client", async () => {
            console.log("=======================================")
            const reservedIds = await t.testIds("FirstClient", 42)
            console.log("Reserving ids " + JSON.stringify(reservedIds))
        })
        it("test using ids reserved by other client", async () => {
            const reservedIds = await t.testIds("FirstClient", 2)
            console.log("Reserving ids " + JSON.stringify(reservedIds))
            const testIncorrect = await t.testStore({
                languages: [
                    {
                        key: "-default-key-FileSystem",
                        version: "2023.1"
                    },
                    {
                        key: "LionCore-builtins",
                        version: "2023.1"
                    }
                ],
                nodes: [
                    {
                        id: "ANN-1",
                        classifier: {
                            language: "-default-key-FileSystem",
                            version: "2023.1",
                            key: "Folder-key"
                        },
                        properties: [],
                        containments: [
                            {
                                containment: {
                                    language: "-default-key-FileSystem",
                                    version: "2023.1",
                                    key: "Folder-listing-key"
                                },
                                children: [reservedIds.body["ids"][0]]
                            }
                        ],
                        references: [],
                        annotations: [],
                        parent: "ID-2"
                    },
                    {
                        id: reservedIds.body["ids"][0],
                        classifier: {
                            language: "-default-key-FileSystem",
                            version: "2023.1",
                            key: "Folder-key"
                        },
                        properties: [],
                        containments: [],
                        references: [],
                        annotations: [],
                        parent: "ANN-1"
                    }
                ],
                serializationFormatVersion: "2023.1"
            })
            console.log("Reserved id eror result " + JSON.stringify(testIncorrect.body))
            equal(testIncorrect.status, HttpClientErrors.PreconditionFailed, "Failed reserved id")
        })
    })

    async function testResult(originalJsonFile: string, changesFile: string) {
        const changesChunk = t.readModel(changesFile) as LionWebJsonChunk
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(baseFullChunk, changesChunk)
        console.log("DIFF number of changes: " + diff.diffResult.changes.length)
        // diff.diffResult.changes.filter(change => !(change instanceof NodeRemoved)).forEach(change => console.log(change.changeMsg()))
        diff.diffResult.changes.forEach(change => console.log(change.changeMsg()))

        const result = await t.testStore(changesChunk)
        console.log("Store Result: " + JSON.stringify(result.body.messages.filter(m => m.kind !== "QueryFromStore" && m.kind !== "QueryFromApi")))
        assert(result.status === HttpSuccessCodes.Ok)

        const jsonModelFull = t.readModel(originalJsonFile) as LionWebJsonChunk
        const afterRetrieve = await t.testRetrieve(["ID-2"])
        console.log("JSON MODEL ")
        // printChunk(jsonModelFull)
        console.log("Retrieve Result: " + afterRetrieve.status + " messages " + JSON.stringify(afterRetrieve.body.messages))
        const retrieveResponse = afterRetrieve.body as RetrieveResponse
        if (!retrieveResponse.success) {
            console.log(retrieveResponse.messages)
            deepEqual(afterRetrieve.status, HttpSuccessCodes.Ok)
        } else {
            // printChunk(retrieveResponse.chunk)
            const diff2 = new LionWebJsonDiff()
            diff2.diffLwChunk(jsonModelFull, retrieveResponse.chunk)
            deepEqual(
                diff2.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)),
                []
            )
        }
    }
    
    async function testHistory(): Promise<void> {
        const repoAt_1 = await t.testPartitionsHistory(initialPartitionVersion)
        const diff = new LionWebJsonDiff()
        diff.diffLwChunk(initialPartition, repoAt_1.chunk)
        deepEqual(
            diff.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)),
            []
        )
        const repoAt_2 = await t.testRetrieveHistory(baseFullChunkVersion, ["ID-2"])
        console.log("TEST RETRIEVE HISTORY")
        console.log(JSON.stringify(repoAt_2, null, 2))
        const diff2 = new LionWebJsonDiff()
        diff2.diffLwChunk(baseFullChunk, repoAt_2.body.chunk)
        deepEqual(
            diff2.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)),
            []
        )
    }
})

function printChunk(chunk: LionWebJsonChunk): void {
    const wrapper = new LionWebJsonChunkWrapper(chunk)
    console.log(wrapper.asString())
}
