import { RepositoryClient } from "@lionweb/server-http-client"
import { adminResponseFunctions, DeltaClient, eventFunctions, responseFunctions } from "@lionweb/server-delta-client"
import { GetAvailableIdsResponse, ListPartitionsResponse } from "@lionweb/server-delta-shared"
import { HttpSuccessCodes } from "@lionweb/server-shared"
import { test, describe, beforeAll, beforeEach, afterAll } from "vitest"
import { LionWebTreeConverter } from "../models/LionWebTree.js"
import { LibraryModel, libraryNodes, LibraryTree, ProgramModel, programNodes, ProgramTree, resetModels } from "../models/testmodel.js"
import { ProcedureBody, ProgramCommands } from "../models/keys.js"
import { CoverageMap, cmd, expectError, expectEvent, expectResponse, logProtocol } from "./test-helpers.js"
import { client, checkClient, logoModel, beforeAllTests, bulkApiClient, log, afterAllTests, withoutHistoryList } from "./SharedTest.js"

describe.each(withoutHistoryList)("MoveChildFromContainmentInOtherParent-$withoutHistory", async ({ withoutHistory }) => {
    beforeAll(async function () {
        await beforeAllTests(withoutHistory)
    })

    afterAll(async function () {
        afterAllTests()
    })

    beforeEach(async function () {
        client.sentMessageHistory = []
        client.receivedMessageHistory = []
    })

    test("MoveChildFromContainmentInOtherParent", async () => {
        resetModels()
        const partitionP = cmd.addFullPartition(client, ProgramModel.nodes())
        const partitionL = cmd.addFullPartition(client, LibraryModel.nodes())
        console.log(ProgramModel.asString())
        const ifC = ProgramModel.getNode("id-if")
        const lib = LibraryModel.getNode("id-library")
        ProgramModel.addPartition(libraryNodes)

        console.log(`MY ProgramModel ${ProgramModel.asString()}`)

        const moveErr1 = cmd.MoveChildFromContainmentInOtherParent(client, {
            movedChild: "id-never", // incorrect
            oldParent: ifC.parent,
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newIndex: 0,
            newParent: "id-procedure",
            newContainment: ProcedureBody,
        })
        await expectError(client, moveErr1, "unknownNode")
        const moveErr2 = cmd.MoveChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: "id-library", // incorrect
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newIndex: 0,
            newParent: "id-procedure",
            newContainment: ProcedureBody,
        })
        await expectError(client, moveErr2, "indexEntryMismatch")
        const moveErr3 = cmd.MoveChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: ifC.parent,
            oldContainment: ProgramCommands,
            oldIndex: 2, // incorrect
            newIndex: 0,
            newParent: "id-procedure",
            newContainment: ProcedureBody,
        })
        await expectError(client, moveErr3, "indexEntryMismatch")
        const moveErr4 = cmd.MoveChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: ifC.parent,
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newIndex: 2, // incorrect
            newParent: "id-procedure",
            newContainment: ProcedureBody,
        })
        await expectError(client, moveErr4, "unknownIndex")
        const moveErr5 = cmd.MoveChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: ifC.parent,
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newIndex: 0,
            newParent: "id-procedure-NOTHING", // incorrect
            newContainment: ProcedureBody,
        })
        await expectError(client, moveErr5, "unknownNode")
        const moveErr6 = cmd.MoveChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: ifC.parent,
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newIndex: 0,
            newParent: "id-procedure",
            newContainment: ProgramCommands, // incorrect
        })
        await expectError(client, moveErr6, "identicalContainment")
        const move = cmd.MoveChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: ifC.parent,
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newIndex: 0,
            newParent: "id-procedure",
            newContainment: ProcedureBody,
        })
        // await expectError(client, move, "queryError")
        await expectEvent(client, move, "ChildMovedFromContainmentInOtherParent")
        ProgramModel.applyDelta(move)
        await logProtocol(client, bulkApiClient, ["id-program", "id-library"], log, ProgramModel)
    })
})
