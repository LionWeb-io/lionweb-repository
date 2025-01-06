import { getVersionFromResponse, RepositoryClient, HttpClientErrors, HttpSuccessCodes, RetrieveResponse } from "@lionweb/repository-client";
import { LanguageChange, LionWebJsonChunk, LionWebJsonDiff } from "@lionweb/validation"
import { readModel } from "./utils.js"

import { assert } from "chai"
const { deepEqual, equal } = assert
import sm from "source-map-support"

sm.install()
const DATA: string = "./data/"

const collection = [true, false]

// Run all, tests with and without history
collection.forEach(withoutHistory => {
        const repository = withoutHistory ? "MyFirstRepo" : "MyFirstHistoryRepo"
        describe("Repository tests " + (withoutHistory ? "without history" : "with history"), () => {
            const client = new RepositoryClient("TestClient", repository)
            // client.loggingOn = true
            let initialPartition: LionWebJsonChunk
            let initialPartitionVersion: number = 0
            let baseFullChunk: LionWebJsonChunk
            let baseFullChunkVersion: number = 0
            let initError: string = ""

            before("create database", async function () {
                const initResponse = await client.dbAdmin.createDatabase()
                if (initResponse.status !== HttpSuccessCodes.Ok) {
                    console.log("Cannot create database: " + JSON.stringify(initResponse.body))
                } else {
                    console.log("database created: " + JSON.stringify(initResponse.body))
                }
            })

            beforeEach("a", async function () {
                client.repository = repository
                initError = ""
                initialPartition = readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk
                baseFullChunk = readModel(DATA + "Disk_A.json") as LionWebJsonChunk
                const initResponse = await client.dbAdmin.createRepository(repository, !withoutHistory, "2023.1")
                if (initResponse.status !== HttpSuccessCodes.Ok) {
                    console.log("Cannot initialize database: " + JSON.stringify(initResponse.body))
                    initError = JSON.stringify(initResponse.body)
                    return
                } else {
                    console.log("initialized database: " + JSON.stringify(initResponse.body))
                }
                const partResult = await client.bulk.createPartitions(initialPartition)
                if (partResult.status !== HttpSuccessCodes.Ok) {
                    console.log("Cannot create initial partition: " + JSON.stringify(partResult.body))
                    initError = JSON.stringify(partResult.body)
                    return
                }
                console.log("PARTITION INITIAL " + JSON.stringify(partResult.body.messages) )
                initialPartitionVersion = getVersionFromResponse(partResult)
                const result = await client.bulk.store(baseFullChunk)
                if (result.status !== HttpSuccessCodes.Ok) {
                    console.log("Cannot store initial chunk: " + JSON.stringify(result.body))
                    initError = JSON.stringify(result.body)
                    return
                }
                baseFullChunkVersion = getVersionFromResponse(result)
                console.log(
                    "repoVersionAfterPartitionCreated " + initialPartitionVersion + "repoVersionAfterPartitionFilled " + baseFullChunkVersion
                )
                const repositories = await client.dbAdmin.listRepositories()
                console.log("repositories: " + repositories.body.repositoryNames)
            })

            afterEach("a", async function () {
                await client.dbAdmin.deleteRepository(repository)
            })

            describe("Repository does not exist", () => {
                it("repository may not be null", async () => {
                    assert(initError === "", initError)
                    client.repository = null
                    const retrieve = await client.bulk.retrieve(["ID-2"])
                    console.log("Retrieve Result: " + JSON.stringify(JSON.stringify(retrieve.body.messages)))
                    assert(retrieve.body.success === false, "Repository === null failed")
                })
                it("repository name must exist", async () => {
                    assert(initError === "", initError)
                    client.repository = "nothing"
                    const retrieve = await client.bulk.retrieve(["ID-2"])
                    console.log("Retrieve Result: " + JSON.stringify(JSON.stringify(retrieve.body.messages)))
                    assert(retrieve.body.success === false, "Non exiting repository should fail")
                })
            })

            describe("Partition tests", () => {
                it("retrieve nodes", async () => {
                    assert(initError === "", initError)
                    const retrieve = await client.bulk.retrieve(["ID-2"])
                    console.log("Retrieve Result: " + JSON.stringify(JSON.stringify(retrieve.body.messages)))
                    const retrieveResponse = retrieve.body as RetrieveResponse
                    const diff = new LionWebJsonDiff()
                    diff.diffLwChunk(baseFullChunk, retrieveResponse.chunk)
                    deepEqual(diff.diffResult.changes, [])
                })

                it("retrieve partitions", async () => {
                    assert(initError === "", initError)
                    const model = structuredClone(baseFullChunk)
                    model.nodes = model.nodes.filter(node => node.parent === null)
                    const partitions = await client.bulk.listPartitions()
                    console.log("Retrieve partitions Result: " + JSON.stringify(partitions))
                    const diff = new LionWebJsonDiff()
                    diff.diffLwChunk(model, partitions.body.chunk)
                    deepEqual(diff.diffResult.changes, [])
                })

                it("delete partitions", async () => {
                    assert(initError === "", initError)
                    await client.bulk.deletePartitions(["ID-2"])
                    const partitions = await client.bulk.listPartitions()
                    deepEqual(partitions.body.chunk, { serializationFormatVersion: "2023.1", languages: [], nodes: [] })
                })
            })

            describe("Move node (9) to from parent (4) to (5)", () => {
                it("test update full partition", async () => {
                    await testResult(DATA + "move-child/Disk-move-child-partition.json", DATA + "move-child/Disk-move-child-partition.json")
                    await testHistory()
                })
                it("test update node (5)", async () => {
                    await testResult(DATA + "move-child/Disk-move-child-partition.json", DATA + "move-child/Disk-move-child-single-node.json")
                    await testHistory()
                })
                it("test update nodes (5) and (4)", async () => {
                    await testResult(DATA + "move-child/Disk-move-child-partition.json", DATA + "move-child/Disk-move-child-two-nodes.json")
                })

                it("test update nodes (5) and (9)", async () => {
                    await testResult(DATA + "move-child/Disk-move-child-partition.json", DATA + "move-child/Disk-move-child-two-nodes-2.json")
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
                    const reservedIds = await client.bulk.ids(42)
                    console.log("Reserving ids " + JSON.stringify(reservedIds))
                })
                it("test using ids reserved by other client", async () => {
                    // Reserve ids by other client 
                    client.clientId = "OtherClient"
                    const reservedIds = await client.bulk.ids(10)
                    // Use other client ids with test client
                    client.clientId = "TestClient"
                    const testIncorrect = await client.bulk.store({
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
                    equal(testIncorrect.status, HttpClientErrors.PreconditionFailed, "Failed reserved id")
                })
            })

            describe("Multi-repo test", () => {
                it("Check current repository", async () => {
                    assert(initError === "", initError)
                    const currentrepo = withoutHistory ? "MyFirstRepo" : "MyFirstHistoryRepo"
                    {
                        const repositories = await client.dbAdmin.listRepositories()
                        assert(repositories.body.repositoryNames.length === 1, "There should be exactly one repository")
                        assert(repositories.body.repositoryNames.includes(currentrepo), "Incorrect repository found: " + repositories.body.repositoryNames)
                    }
                    await client.dbAdmin.createRepository("Repo2", !withoutHistory, "2023.1")
                    {
                        const repositories = await client.dbAdmin.listRepositories()
                        assert(repositories.body.repositoryNames.length === 2, "There should be exactly two repositories")
                        assert(repositories.body.repositoryNames.every(repo => repo === currentrepo || repo === "Repo2"), "Incorrect repository found: " + repositories.body.repositoryNames)
                    }

                    const createResult = await client.dbAdmin.createRepository("Repo2", true, "2023.1")
                    assert(createResult.body.success === false, "Should not be able to create existing repo")
                    const delete2 = await client.dbAdmin.deleteRepository("Repo2")
                    {
                        assert(delete2.body.success === true, "Should be able to delete existiung repository")
                        const repositories = await client.dbAdmin.listRepositories()
                        assert(repositories.body.repositoryNames.length === 1, "There should be exactly one repository")
                        assert(repositories.body.repositoryNames.includes(currentrepo), "Incorrect repository found: " + repositories.body.repositoryNames)
                    }
                    const createResult2 = await client.dbAdmin.createRepository("Repo2", !withoutHistory, "2023.1")
                    {
                        assert(createResult2.body.success === true, "Should  be able to create existing repository: " + JSON.stringify(createResult2.body.messages))
                        const repositories = await client.dbAdmin.listRepositories()
                        assert(repositories.body.repositoryNames.length === 2, "There should be exactly two repositories")
                        assert(repositories.body.repositoryNames.every(repo => repo === currentrepo || repo === "Repo2"), "Incorrect repository found: " + repositories.body.repositoryNames)
                    }
                })
            })
            
            describe("Multiple LionWeb versions test", () => {
                it("Check repository LionWeb versions does not accept other versions", async () => {
                    assert(initError === "", initError)
                    const incorrectVersion: LionWebJsonChunk = {
                        serializationFormatVersion: "2024.1",
                        nodes: [],
                        languages: []
                    }
                    const nonsenseVersion: LionWebJsonChunk = {
                        serializationFormatVersion: "nonsense-version",
                        nodes: [],
                        languages: []
                    }
                    const correctVersion: LionWebJsonChunk = {
                        serializationFormatVersion: "2023.1",
                        nodes: [],
                        languages: []
                    }
                    const incorrect = await client.bulk.createPartitions(incorrectVersion)
                    assert(incorrect.body.success === false, "incorrect LionWeb version should be refused: " + + incorrect.body.messages.map(m => m.message))
                    const nonsense = await client.bulk.createPartitions(nonsenseVersion)
                    assert(nonsense.body.success === false, "nonsense LionWeb version should be refused: " + nonsense.body.messages.map(m => m.message))
                    const correct = await client.bulk.createPartitions(correctVersion)
                    assert(correct.body.success === true, "correct LionWeb version should be accepted: " + correct.body.messages.map(m => m.message))
                })
            })

            async function testResult(originalJsonFile: string, changesFile: string) {
                console.log(`Test result of '${originalJsonFile}' with '${changesFile}'`)
                assert(initError === "", initError)
                const changesChunk = readModel(changesFile) as LionWebJsonChunk

                const result = await client.bulk.store(changesChunk)
                assert(result.status === HttpSuccessCodes.Ok)

                const jsonModelFull = readModel(originalJsonFile) as LionWebJsonChunk
                const afterRetrieve = await client.bulk.retrieve(["ID-2"])
                console.log("Retrieve Result: " + afterRetrieve.status + " messages " + JSON.stringify(afterRetrieve.body.messages))
                const retrieveResponse = afterRetrieve.body as RetrieveResponse
                if (!retrieveResponse.success) {
                    console.log(retrieveResponse.messages)
                    deepEqual(afterRetrieve.status, HttpSuccessCodes.Ok)
                } else {
                    const diff2 = new LionWebJsonDiff()
                    diff2.diffLwChunk(jsonModelFull, retrieveResponse.chunk)
                    deepEqual(
                        diff2.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)),
                        []
                    )
                }
            }

            async function testHistory(): Promise<void> {
                if (withoutHistory) {
                    return
                }
                // test historical data
                const repoAt_1 = await client.history.listPartitions(initialPartitionVersion)
                const diff = new LionWebJsonDiff()
                diff.diffLwChunk(initialPartition, repoAt_1.body.chunk)
                deepEqual(
                    diff.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)),
                    []
                )
                const repoAt_2 = await client.history.retrieve(baseFullChunkVersion, ["ID-2"])
                const diff2 = new LionWebJsonDiff()
                diff2.diffLwChunk(baseFullChunk, repoAt_2.body.chunk)
                deepEqual(
                    diff2.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)),
                    []
                )
            }


        })
    }

)


