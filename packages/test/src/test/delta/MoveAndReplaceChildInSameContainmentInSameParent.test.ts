import { test, describe, beforeAll, beforeEach, afterAll } from "vitest"
import { LibraryModel, libraryNodes, ProgramModel, programNodes, resetModels } from "../models/testmodel.js"
import { CONTAINMENT, LibraryProcedures, ProcedureBody, ProgramCommands } from "../models/keys.js"
import { cmd, expectError, expectEvent, logProtocol } from "./test-helpers.js"
import { client, beforeAllTests, bulkApiClient, log, afterAllTests, withoutHistoryList } from "./SharedTest.js"

describe.each(withoutHistoryList)("MoveAndReplaceChildInSameContainmentInSameParent-$withoutHistory ", async ({ withoutHistory }) => {
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

    test("MoveAndReplaceChildInSameContainmentInSameParent-negativeOffset", async () => {
        resetModels()

        const partitionP = cmd.addFullPartition(client, programNodes)
        const partitionL = cmd.addFullPartition(client, libraryNodes)
        await expectEvent(client, partitionP, "PartitionAdded")
        await expectEvent(client, partitionL, "PartitionAdded")
        // console.log(ProgramModel.asString())
        const ifC = ProgramModel.getNode("id-if")
        const lib = LibraryModel.getNode("id-library")
        ProgramModel.addPartition(libraryNodes)

        const moveErr1 = cmd.moveAndReplaceChildInSameContainmentInSameParent(client,
            CONTAINMENT.ProcedureParameter,  ProgramModel.getNode("id-p1-param1"), 0, 1, "id-p1-param2-none")
        await expectError(client, moveErr1, "unknownNode")
        const moveErr2 = cmd.moveAndReplaceChildInSameContainmentInSameParent(client,
            CONTAINMENT.ProcedureParameter,  ProgramModel.getNode("id-p1-param1"), 1, 1, "id-p1-param2")
        await expectError(client, moveErr2, "indexEntryMismatch")
        const moveErr3 = cmd.moveAndReplaceChildInSameContainmentInSameParent(client,
            CONTAINMENT.ProcedureParameter,  ProgramModel.getNode("id-p1-param1"), 0, 0, "id-p1-param2")
        await expectError(client, moveErr3, "indexEntryMismatch")
        const moveErr4 = cmd.moveAndReplaceChildInSameContainmentInSameParent(client,
            CONTAINMENT.ProcedureParameter,  ProgramModel.getNode("id-p1-param1"), 10, 20, "id-p1-param2")
        await expectError(client, moveErr4, "indexEntryMismatch")

        const move = cmd.moveAndReplaceChildInSameContainmentInSameParent(client,
            CONTAINMENT.ProcedureParameter,  ProgramModel.getNode("id-p1-param2"), 1, -1, "id-p1-param1")
        await expectEvent(client, move, "ChildMovedAndReplacedInSameContainmentInSameParent")
        ProgramModel.applyDelta(move)
        await logProtocol(client, bulkApiClient, ["id-program", "id-library"], log, ProgramModel)
    })

    test("MoveAndReplaceChildInSameContainmentInSameParent-positiveOffset", async () => {
        resetModels()
        cmd.deletePartition(client, "id-program")
        cmd.deletePartition(client, "id-library")

        const partitionP = cmd.addFullPartition(client, programNodes)
        const partitionL = cmd.addFullPartition(client, libraryNodes)
        await expectEvent(client, partitionP, "PartitionAdded")
        await expectEvent(client, partitionL, "PartitionAdded")
        // console.log(ProgramModel.asString())
        const ifC = ProgramModel.getNode("id-if")
        const lib = LibraryModel.getNode("id-library")
        ProgramModel.addPartition(libraryNodes)

        const moveErr1 = cmd.moveAndReplaceChildInSameContainmentInSameParent(client,
            CONTAINMENT.ProcedureParameter,  ProgramModel.getNode("id-p1-param1"), 0, 1, "id-p1-param2-none")
        await expectError(client, moveErr1, "unknownNode")

        const move = cmd.moveAndReplaceChildInSameContainmentInSameParent(client,
            CONTAINMENT.ProcedureParameter,  ProgramModel.getNode("id-p1-param1"), 0, 1, "id-p1-param2")
        await expectEvent(client, move, "ChildMovedAndReplacedInSameContainmentInSameParent")
        ProgramModel.applyDelta(move)
        await logProtocol(client, bulkApiClient, ["id-program", "id-library"], log, ProgramModel)
    })
})
