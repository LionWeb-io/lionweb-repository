import { test, describe, beforeAll, beforeEach, afterAll } from "vitest"
import { LibraryModel, libraryNodes, ProgramModel, programNodes, resetModels } from "../models/testmodel.js"
import { CONTAINMENT, LibraryProcedures, ProcedureBody, ProgramCommands } from "../models/keys.js"
import { cmd, expectError, expectEvent, logProtocol } from "./test-helpers.js"
import { client, beforeAllTests, bulkApiClient, log, afterAllTests, withoutHistoryList } from "./SharedTest.js"

describe.each(withoutHistoryList)("MoveAndReplaceChildFromOtherContainmentInOtherParent-$withoutHistory", async ({ withoutHistory }) => {
    let a=""
    beforeAll(async function () {
        await beforeAllTests(withoutHistory, "REPO")
    })

    afterAll(async function () {
        console.log("eeeeee")
        afterAllTests()
    })

    beforeEach(async function () {
        console.log(`rrrrrr ${a}`)
        client.sentMessageHistory = []
        client.receivedMessageHistory = []
    })
    
    test("MoveAndReplaceChildFromContainmentInOtherParent", async () => {
        resetModels()
        // console.log(`suitw ${JSON.stringify( suite("33").name)}`)
        const partitionP = cmd.addFullPartition(client, programNodes)
        const partitionL = cmd.addFullPartition(client, libraryNodes)
        await expectEvent(client, partitionP, "PartitionAdded")
        await expectEvent(client, partitionL, "PartitionAdded")
        // console.log(ProgramModel.asString())
        const ifC = ProgramModel.getNode("id-if")
        const lib = LibraryModel.getNode("id-library")
        ProgramModel.addPartition(libraryNodes)

        console.log(`MY ProgramModel ${ProgramModel.asString()}`)

        const moveErr1 = cmd.MoveAndReplaceChildFromContainmentInOtherParent(client, {
            movedChild: "id-never", // incorrect
            oldParent: ifC.parent,
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newParent: "id-procedure",
            newContainment: ProcedureBody,
            newIndex: 0,
            replacedChild: "id-any",
        })
        await expectError(client, moveErr1, "unknownNode")
        const moveErr2 = cmd.MoveAndReplaceChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: "id-library", // incorrect
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newParent: "id-procedure",
            newContainment: ProcedureBody,
            newIndex: 0,
            replacedChild: "id-any",
        })
        await expectError(client, moveErr2, "unknownNode")
        const moveErr3 = cmd.MoveAndReplaceChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: "id-program", // incorrect
            oldContainment: ProgramCommands,
            oldIndex: 1,
            newParent: "id-procedure",
            newContainment: ProcedureBody,
            newIndex: 0,
            replacedChild: "id-procedure",
        })
        await expectError(client, moveErr3, "indexEntryMismatch")

        const move = cmd.MoveAndReplaceChildFromContainmentInOtherParent(client, {
            movedChild: "id-if",
            oldParent: "id-program",
            oldContainment: ProgramCommands,
            oldIndex: 3,
            newParent: "id-library",
            newContainment: LibraryProcedures,
            newIndex: 0,
            replacedChild: "id-procedure",
        })

        await expectEvent(client, move, "ChildMovedAndReplacedFromContainmentInOtherParent")
        ProgramModel.applyDelta(move)
        await logProtocol(client, bulkApiClient, ["id-program", "id-library"], log, ProgramModel)
    })
})
