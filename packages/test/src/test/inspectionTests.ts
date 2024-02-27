import { HttpSuccessCodes } from "@lionweb/repository-common";
import { LionWebJsonChunk } from "@lionweb/validation"
import { assert } from "chai"
import { RepositoryClient } from "./RepositoryClient.js"

const { deepEqual } = assert
import sm from "source-map-support"

sm.install()
const DATA: string = "./data/"

describe("Repository tests for inspection APIs", () => {
    const t = new RepositoryClient()
    let jsonModel: LionWebJsonChunk

    beforeEach("a", async function () {
        await t.init()
        jsonModel = t.readModel(DATA + "Disk_A.json") as LionWebJsonChunk
        const initialPartition = t.readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk
        const partResult = await t.testCreatePartitions(initialPartition)
        if (partResult.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot create initial partition: " + JSON.stringify(partResult.body))
        }
        const result = await t.testStore(jsonModel)
        if (result.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot store initial chunk: " + JSON.stringify(result.body))
        }
    })

    it("nodes by language", async () => {
        const result = (await t.testNodesByLanguage())
        deepEqual(result, [
                {
                    language: '-default-key-FileSystem',
                    ids: [
                        "ID-2", "ANN-1", "ANN-10", "ANN-9",
                        "ID-10", "ID-11", "ID-12",
                        "ID-13", "ID-14", "ID-15",
                        "ID-3", "ID-4",
                        "ID-5", "ID-6", "ID-7",
                        "ID-8", "ID-9"
                    ]
                }
            ]
        )
    })

    it("nodes by classifier", async () => {
        const result = (await t.testNodesByClassifier())
        deepEqual(result, [
                {
                    "language": "-default-key-FileSystem",
                    "classifier": "Disk-key",
                    "ids": [
                        "ID-2"
                    ]
                },
                {
                    "language": "-default-key-FileSystem",
                    "classifier": "Folder-key",
                    "ids": [
                        "ANN-1",
                        "ANN-10",
                        "ANN-9",
                        "ID-10",
                        "ID-11",
                        "ID-12",
                        "ID-13",
                        "ID-14",
                        "ID-15",
                        "ID-3",
                        "ID-4",
                        "ID-5",
                        "ID-6",
                        "ID-7",
                        "ID-8",
                        "ID-9"
                    ]
                }
            ]
        )
    })

})
