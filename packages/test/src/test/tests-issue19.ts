import { RepositoryClient } from "@lionweb/repository-client";
import { HttpSuccessCodes, RetrieveResponse } from "@lionweb/repository-common";
import { LionWebJsonChunk, LionWebJsonChunkWrapper } from "@lionweb/validation"
import { readModel } from "./utils.js"

import { assert } from "chai"
import sm from "source-map-support"
sm.install()
const DATA: string = "./data/"

describe("Repository tests", () => {
    const t = new RepositoryClient("TestClient")

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
            console.log(`Store file ${file} ` + JSON.stringify(result, null, 2))
            assert.isTrue(result.status === HttpSuccessCodes.Ok, "something wrong")
            const afterRetrieve = await t.bulk.retrieve(["ID-2"])
            printChunk((afterRetrieve.body as RetrieveResponse).chunk)
        }
    }
})

function printChunk(chunk: LionWebJsonChunk): void {
    const wrapper = new LionWebJsonChunkWrapper(chunk)
    console.log(wrapper.asString())
}
