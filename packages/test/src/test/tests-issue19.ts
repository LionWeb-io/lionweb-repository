import { HttpSuccessCodes, RetrieveResponse } from "@lionweb/repository-common";
import { LionWebJsonChunk, LionWebJsonChunkWrapper } from "@lionweb/validation"
import { assert } from "chai"
import { RepositoryClient } from "./RepositoryClient.js"

import sm from "source-map-support"
sm.install()
const DATA: string = "./data/"

describe("Repository tests", () => {
    const t = new RepositoryClient()

    beforeEach("a", async function () {
        await t.init()
        await t.testCreatePartitions(t.readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk)
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
            const changesChunk = t.readModel(file) as LionWebJsonChunk
            const result = await t.testStore(changesChunk)
            console.log(`Store file ${file} ` + JSON.stringify(result, null, 2))
            assert.isTrue(result.status === HttpSuccessCodes.Ok, "something wrong")
            const afterRetrieve = await t.testRetrieve(["ID-2"])
            printChunk((afterRetrieve.body as RetrieveResponse).chunk)
        }
    }
})

function printChunk(chunk: LionWebJsonChunk): void {
    const wrapper = new LionWebJsonChunkWrapper(chunk)
    console.log(wrapper.asString())
}
