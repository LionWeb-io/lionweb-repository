import { RepositoryClient, HttpSuccessCodes } from "@lionweb/repository-client"
import { LionWebJsonChunk } from "@lionweb/validation"
import { readModel } from "./utils.js"

import { assert } from "chai"
import sm from "source-map-support"
sm.install()
const DATA: string = "./data/"

describe("Repository tests", () => {
    const t = new RepositoryClient("TestClient", "default")
    t.loggingOn = true

    beforeEach("a", async function () {
        const createResponse = await t.dbAdmin.createDatabase()
        if (createResponse.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot create database: " + JSON.stringify(createResponse.body))
        } else {
            console.log("database created: " + JSON.stringify(createResponse.body))
        }
        await t.dbAdmin.deleteRepository("default")
        await t.dbAdmin.createRepository("default", true, "2023.1")
        await t.bulk.createPartitions(readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk)
    })

    describe("Add new node", async () => {
        it("test update single node", async () => {
            await storeFiles([
                "./data/Disk_A.json",
                "./data/add-new-nodes/Disk-add-new-nodes-single-node.json",
                "./data/Disk_A.json",
            ])
            // await t.dbAdmin.deleteRepository("default")
        })
    })

    async function storeFiles(files: string[]) {
        for(const file of files) {
            const changesChunk = readModel(file) as LionWebJsonChunk
            const result = await t.bulk.store(changesChunk)
            assert.isTrue(result.status === HttpSuccessCodes.Ok, "Incorrect HTTP status: something went wrong")
        }
    }
})

