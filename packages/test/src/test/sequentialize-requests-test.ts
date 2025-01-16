import { ClientResponse, RepositoryClient, StoreResponse } from "@lionweb/repository-client"
import { LionWebJsonChunk } from "@lionweb/validation"
import { assert } from "chai"

import sm from "source-map-support"
import { readModel } from "./utils.js"

sm.install()

describe("Transaction isolation tests", () => {
    const t = new RepositoryClient("TestClient", "isolation")
    t.loggingOn = true

    beforeEach("a", async function () {
        await t.dbAdmin.deleteRepository("isolation")
        await t.dbAdmin.createRepository("isolation", true, "2023.1")
        await t.bulk.createPartitions(readModel("./data/Disk_A_partition.json") as LionWebJsonChunk)
    })

    describe("Nowait", () => {
        it("test sending requests without waiting, so they will be sequentialized.", async () => {
            await storeFiles([
                "./data/Disk_A.json",
                "./data/add-new-annotation/Disk-add-new-annotation-partition.json",
                "./data/add-new-nodes/Disk-add-new-nodes-partition.json",
                "./data/add-new-property-with-value/Disk-Property-add-property-partition.json"
            ])
        })
    })

    async function storeFiles(files: string[]) {
        const chunks = []
        const results: Promise<ClientResponse<StoreResponse>>[] = []
        for (const file of files) {
            const changesChunk = readModel(file) as LionWebJsonChunk
            chunks.push(changesChunk)
        }
        let i = 1
        for (const ch of chunks) {
            console.log("request " + i++)
            results.push(t.bulk.store(ch))
        }
        for (const result of results) {
            result.then(answer => {
                assert(answer.body.success, "Request should be done correctly")
                // console.log(`===== Result ok: ${answer.body.success}, messages: ${answer.body.messages.map(m => m.kind + ": " + m.message) + "\n"}`)
            })
        }
    }
})
