import { LanguageChange, LionWebJsonChunk, LionWebJsonChunkWrapper, LionWebJsonDiff } from "@lionweb/validation"
import { assert } from "chai"
import { RepositoryClient } from "./RepositoryClient.js"

const { deepEqual } = assert
import sm from "source-map-support"

sm.install()

describe("Repository tests for inspection APIs", () => {
    const t = new RepositoryClient()
    let jsonModel: LionWebJsonChunk

    beforeEach("a", async function () {
        jsonModel = t.readModel("./src/test/data/Disk_A.json") as LionWebJsonChunk
        await t.init()
        await t.testStore(jsonModel)
    })

    it("nodes by language", async () => {
        const retrieve = (await t.testNodesByLanguage())
        console.log("FOO", retrieve)
        // console.log("JSON MODEL ORIGINAL")
        // printChunk(jsonModel)
        // console.log("JSON MODEL RETRIEVED")
        // printChunk(retrieve.json  as LionWebJsonChunk)
        // const diff = new LionWebJsonDiff()
        // diff.diffLwChunk(jsonModel, retrieve.json  as LionWebJsonChunk)
        // deepEqual(diff.diffResult.changes, [])
    })


})
