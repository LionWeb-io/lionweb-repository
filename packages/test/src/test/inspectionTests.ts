import { RepositoryClient, HttpSuccessCodes } from "@lionweb/repository-client"
import { LionWebJsonChunk } from "@lionweb/validation"
import { readModel } from "./utils.js"

import { assert } from "chai"
const { deepEqual } = assert
import sm from "source-map-support"

sm.install()
const DATA: string = "./data/"

describe("Repository tests for inspection APIs", () => {
    const client = new RepositoryClient("InspectionTests", "default")
    client.loggingOn = true
    let jsonModel: LionWebJsonChunk

    before("create database", async function () {
        const initResponse = await client.dbAdmin.createDatabase()
        if (initResponse.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot create database: " + JSON.stringify(initResponse.body))
        } else {
            console.log("database created: " + JSON.stringify(initResponse.body))
        }
    })
    
    beforeEach("a", async function () {
        await client.dbAdmin.deleteRepository("default")
        const initResponse = await client.dbAdmin.createRepository("default", true, "2023.1")
        if (initResponse.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot initialize database: " + JSON.stringify(initResponse.body))
        } else {
            console.log("initialized database: " + JSON.stringify(initResponse.body))
        }
        jsonModel = readModel(DATA + "Disk_A.json") as LionWebJsonChunk
        const initialPartition = readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk
        const partResult = await client.bulk.createPartitions(initialPartition)
        if (partResult.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot create initial partition: " + JSON.stringify(partResult.body))
        }
        const result = await client.bulk.store(jsonModel)
        if (result.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot store initial chunk: " + JSON.stringify(result.body))
        }
    })

    it("nodes by language", async () => {
        const result = await client.inspection.nodesByLanguage()
        result.forEach(e => e.ids.sort((a, b) => a.localeCompare(b)))
        deepEqual(result, [
                {
                    language: '-default-key-FileSystem',
                    ids: [
                        "ANN-1", "ANN-10", "ANN-9", "ID-10", "ID-11", "ID-12",
                        "ID-13", "ID-14", "ID-15", "ID-2",
                        "ID-3", "ID-4",
                        "ID-5", "ID-6", "ID-7",
                        "ID-8", "ID-9"
                    ],
                    size: 17
                }
            ]
        )
    })

    it("nodes by classifier", async () => {
        const result = await client.inspection.nodesByClassifier()
        result.forEach(e => e.ids.sort((a, b) => a.localeCompare(b)))
        deepEqual(result, [
                {
                    "language": "-default-key-FileSystem",
                    "classifier": "Disk-key",
                    "ids": [
                        "ID-2"
                    ],
                    "size": 1
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
                    ],
                    "size": 16
                }
            ]
        )
    })

})
