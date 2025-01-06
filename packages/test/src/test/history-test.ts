import { RepositoryClient, HttpSuccessCodes } from "@lionweb/repository-client"
import { LanguageChange, LionWebJsonChunk, LionWebJsonDiff } from "@lionweb/validation"
import { readModel } from "./utils.js"


import { assert } from "chai"
const { deepEqual, fail } = assert
import sm from "source-map-support"

sm.install()
const DATA: string = "./data/"

type StoredAst = {
    chunk: LionWebJsonChunk,
    version: number
}

describe("Repository tests", () => {
    const client = new RepositoryClient("TestHistoryClient", "history")
    client.loggingOn = true
    let initialPartition: LionWebJsonChunk
    let baseFullChunk: LionWebJsonChunk

    before("create database", async function () {
        const createResponse = await client.dbAdmin.createDatabase()
        if (createResponse.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot create database: " + JSON.stringify(createResponse.body))
        } else {
            console.log("database created: " + JSON.stringify(createResponse.body))
        }
        initialPartition = readModel(DATA + "Disk_A_partition.json") as LionWebJsonChunk
        baseFullChunk = readModel(DATA + "Disk_A.json") as LionWebJsonChunk
        const initResponse = await client.dbAdmin.createRepository("history", true, "2023.1")
        if (initResponse.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot initialize database: " + JSON.stringify(initResponse.body))
        } else {
            console.log("initialized database: " + JSON.stringify(initResponse.body))
        }
        const partResult = await client.bulk.createPartitions(initialPartition)
        if (partResult.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot create initial partition: " + JSON.stringify(partResult.body))
            console.log(JSON.stringify(initialPartition))
        }
        const result = await client.bulk.store(baseFullChunk)
        if (result.status !== HttpSuccessCodes.Ok) {
            console.log("Cannot store initial chunk: " + JSON.stringify(result.body))
        }
    })

    describe("History", () => {
        it("test multiple ast changes", async () => {
            const v3 = await store(DATA + "move-child/Disk-move-child-partition.json")
            const v4 = await store(DATA + "change-property-value/Disk_Property_value_changed-partition.json")
            const v5 = await store(DATA + "reorder-annotations/reorder-annotations-partition.json")
            const v6 = await store(DATA + "add-new-property-with-value/Disk-Property-add-property-partition.json")
            await testHistory(v3)
            await testHistory(v4)
            await testHistory(v5)
            await testHistory(v6)
        })
    })

    async function store(file: string): Promise<StoredAst> {
        const changesChunk = readModel(file) as LionWebJsonChunk
        const result = await client.bulk.store(changesChunk)
        // console.log("TEST HISTORY " + JSON.stringify(result.body))
        return {
            chunk: changesChunk,
            version: Number.parseInt(result.body.messages.find(m => m.kind === "RepoVersion")?.data?.version)
        }
    }

    async function testHistory(v: StoredAst): Promise<void> {
        console.log("TEST HISTORY version " + v.version)
        const repoAt_version = await client.history.retrieve(v.version, ["ID-2"])
        if (repoAt_version.body.success === false) {
            fail("Repo call failed with error: " + repoAt_version.body.messages.find(m => m.kind === "error")?.message)
        }
        const diff2 = new LionWebJsonDiff()
        diff2.diffLwChunk(v.chunk, repoAt_version.body.chunk)
        deepEqual(
            diff2.diffResult.changes.filter(ch => !(ch instanceof LanguageChange)),
            []
        )
    }
}) 

