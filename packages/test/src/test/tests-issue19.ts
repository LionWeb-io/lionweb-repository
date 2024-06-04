import { RepositoryClient } from "@lionweb/repository-client";
import { HttpSuccessCodes } from "@lionweb/repository-common";
import { LionWebJsonChunk } from "@lionweb/validation"
import { readModel } from "./utils.js"

import { assert } from "chai"
import sm from "source-map-support"
sm.install()
const DATA: string = "./data/"

describe("Repository tests", () => {
    const t = new RepositoryClient("TestClient", "public")

    beforeEach("a", async function () {
        await t.dbAdmin.init()
        await t.bulk.createPartitions(readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk)
    })

    describe("Add new node", () => {
        it("test update single node", async () => {
            await storeFiles([
                "./data/Disk_A.json",
                "./data/add-new-nodes/Disk-add-new-nodes-single-node.json",
                "./data/Disk_A.json",
            ])
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

