import { isEqualMetaPointer } from "@lionweb/json"
import { NodeUtils } from "@lionweb/json-utils"
import { ChildAdded, FeatureMissing, ChildRemoved, ParentChanged, ChildOrderChanged } from "@lionweb/json-diff"
import { JsonContext } from "@lionweb/json-utils"
import {
    DbChanges,
    MetaPointersTracker,
    TableHelpers,
    DB_retrieveNodeTree,
    DB_retrieveFullNodesFromIdList,
    SQL_nextRepoVersion,
    SQL_deleteFullNodes,
    SQL_insertNodeArray
} from "@lionweb/server-common"
import { LionWebTask } from "@lionweb/server-database"
import {
    AddChildCommand,
    ChildAddedEvent,
    ChildDeletedEvent,
    ChildMovedAndReplacedFromOtherContainmentInSameParentEvent,
    ChildMovedFromOtherContainmentInSameParentEvent,
    ChildReplacedEvent,
    DeleteChildCommand,
    DeltaEvent,
    ErrorEvent,
    MoveAndReplaceChildFromOtherContainmentInSameParentCommand,
    MoveChildFromContainmentInOtherParentCommand,
    MoveChildFromOtherContainmentInSameParentCommand,
    MoveChildInSameContainmentInSameParentCommand,
    ReplaceChildCommand,
    type ErrorDelta,
    MoveAndReplaceChildFromContainmentInOtherParentCommand,
    MoveAndReplaceChildInSameContainmentInSameParentCommand,
    ChildMovedInSameContainmentInSameParentEvent,
    ChildMovedAndReplacedFromContainmentInOtherParentEvent,
    ChildMovedFromContainmentInOtherParentEvent,
    ChildMovedAndReplacedInSameContainmentInSameParentEvent
} from "@lionweb/server-delta-shared"
import { deltaLogger } from "@lionweb/server-logging"
import { DeltaContext } from "../DeltaContext.js"
import { affectedNodeMessage, affectedPartitionMessage } from "../events.js"
import { Participation } from "../participation/index.js"
import { DB_affectedPartition, deltaContext, DeltaFunction, errorEvent } from "./DeltaUtil.js"
import {
    findAndValidateNodeExists,
    validateChildInContainment,
    validateContainment,
    validateExistingNodesIsEmpty,
    validateHaveTheSameParents,
    findAndValidateContainment,
    validateParents,
    validateProperTree,
    findContainment,
    validateDifferentContainments
} from "./Validations.js"

const AddChild = async (participation: Participation, msg: AddChildCommand, ctx: DeltaContext): Promise<DeltaEvent | ErrorDelta> => {
    deltaLogger.info(`Called AddChild ${msg.newChild.nodes.map(n => n.id)}`)
    const newChildNode = validateProperTree(msg.newChild, msg.parent, msg, participation)
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            ...(msg.newChild.nodes.map(n => n.id)), msg.parent
        ])
        const parentNode = findAndValidateNodeExists(msg.parent, nodesFromDB, msg, participation)
        const existingChildNodes = nodesFromDB.filter(nn => {
            deltaLogger.debug(`nn.id ${nn.id} parent ${msg.parent}`)
            return nn.id !== msg.parent
        })
        validateExistingNodesIsEmpty(existingChildNodes, msg, participation)

        // let containment1 = findContainment(parentNode, msg.containment)
        // if (containment1 === undefined) {
        //     containment1 = { containment: msg.containment, children: []}
        // }
        // find the containment, create a new one if it isn't there
        const containment = validateContainment(parentNode, msg.containment, msg.index,  "Add",undefined, msg, participation)
        containment.children.splice(msg.index, 0, newChildNode!.id)

        //////////////////// Check done, do the work /////////////////
        const changes = new DbChanges(TableHelpers.pgp)
        // Add child to parent
        const missing: FeatureMissing = (parentNode.containments.find(c => isEqualMetaPointer(c.containment, msg.containment)) === undefined ? FeatureMissing.MissingBefore : FeatureMissing.NotMissing)
        deltaLogger.debug(`Missing is ${missing} ================================ {msg.containment}`, {msg})
        changes.addChanges(
            [new ChildAdded(new JsonContext(null, ["delta"]), parentNode!, msg.containment, containment, newChildNode!.id, missing)]
        )
        // Add child nodes to database
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        await metaPointerTracker.populateFromNodes(msg.newChild.nodes, task)
        await changes.populateMetaPointersFromDbChanges(metaPointerTracker, msg.newChild.nodes, task)
        const nextVersionSql = SQL_nextRepoVersion(participation.participationId)
        const addNodesquery = SQL_insertNodeArray(msg.newChild.nodes, metaPointerTracker)
        const addChildQuery = changes.createPostgresQuery(metaPointerTracker)
        deltaLogger.debug(`ADD NODES QUERY '${addNodesquery}`)
        deltaLogger.debug(`ADD CHILD QUERY '${addChildQuery}`)
        const queryResult = await task.query(participation.repositoryData!, nextVersionSql + addNodesquery + addChildQuery)
        const partition = await DB_affectedPartition(task, parentNode!.id, participation)
        return {
            messageKind: "ChildAdded",
            containment: msg.containment,
            index: msg.index,
            parent: msg.parent,
            newChild: msg.newChild,
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0,          // dummy, will be changed for each participation before sending
            additionalInfos: [affectedNodeMessage(parentNode!.id), affectedPartitionMessage(partition)]
        } as ChildAddedEvent
    })
    return result
}

const DeleteChild = async (
    participation: Participation,
    msg: DeleteChildCommand,
    ctx: DeltaContext
): Promise<DeltaEvent | ErrorDelta> => {
    deltaLogger.debug("DeleteChild " + msg.deletedChild)
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            msg.parent, msg.deletedChild
        ])
        const parentNode = findAndValidateNodeExists(msg.parent, nodesFromDB, msg, participation)
        const childNode = findAndValidateNodeExists(msg.deletedChild, nodesFromDB, msg, participation)

        const containment = findAndValidateContainment(parentNode, msg.containment, msg, participation)
        validateChildInContainment(parentNode, containment, msg.index, msg.deletedChild, msg, participation)

        // All ok, now prepare the deletion query
        containment.children.splice(msg.index, 1)
        // Get the subtree of `deletedChild` from the database to remove them
        const subtreeNodes = await DB_retrieveNodeTree(task, participation.repositoryData!, [msg.deletedChild], Number.MAX_SAFE_INTEGER)
        const deleteSql = SQL_deleteFullNodes(subtreeNodes.map(n => n.id))
        const dbChanges = new DbChanges(TableHelpers.pgp)
        dbChanges.addChanges(            
            [new ChildRemoved(new JsonContext(null, ["delta"]), parentNode, msg.containment, containment, msg.deletedChild, FeatureMissing.NotMissing)]
        ) 
        // Run the query with metapointers as a dummy, there are no metapointers being added
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        const nextVersionSql = SQL_nextRepoVersion(participation.participationId)
        const execute = await task.query(participation.repositoryData!, nextVersionSql + deleteSql + dbChanges.createPostgresQuery(metaPointerTracker))
        const partition = await DB_affectedPartition(task, parentNode!.id, participation)
        return {
            messageKind: "ChildDeleted",
            deletedChild: msg.deletedChild,
            index: msg.index,
            parent: msg.parent,
            containment: msg.containment,
            deletedDescendants: subtreeNodes.filter(node => node.id !== msg.deletedChild).map(node => node.id),
            additionalInfos: [affectedNodeMessage(parentNode.id), affectedPartitionMessage(partition)],
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0
        } as ChildDeletedEvent
    })
    return result
}

const ReplaceChild = async (
    participation: Participation,
    msg: ReplaceChildCommand,
    ctx: DeltaContext
): Promise<DeltaEvent | ErrorDelta> => {
    deltaLogger.debug("Called ReplaceChild " + msg.messageKind)
    const newChildNode = validateProperTree(msg.newChild, msg.parent, msg, participation)
    
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            msg.parent,
            msg.replacedChild,
            ...msg.newChild.nodes.map(n => n.id)
        ])
        const parentNode = findAndValidateNodeExists(msg.parent, nodesFromDB, msg, participation)
        const existingChildNodes = nodesFromDB.filter(n => n.id !== msg.parent && n.id !== msg.replacedChild)
        validateExistingNodesIsEmpty(existingChildNodes, msg, participation)

        const containment = validateContainment(parentNode, msg.containment, msg.index, "Replace", msg.replacedChild, msg, participation)
        validateChildInContainment(parentNode, containment, msg.index, msg.replacedChild, msg, participation)
        containment.children.splice(msg.index, 1, newChildNode.id)
        
        // Checks done, do the work
        const changes = new DbChanges(TableHelpers.pgp)
        const replacedTree = await DB_retrieveNodeTree(task, participation.repositoryData!, [msg.replacedChild], Number.MAX_SAFE_INTEGER)

        const missing: FeatureMissing =
            parentNode.containments.find(c => isEqualMetaPointer(c.containment, msg.containment)) === undefined
                ? FeatureMissing.MissingBefore
                : FeatureMissing.NotMissing
        changes.addChanges([
            new ChildAdded(deltaContext(), parentNode, msg.containment, containment, newChildNode.id, missing)
        ])
        // Add child nodes to database
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        await metaPointerTracker.populateFromNodes(msg.newChild.nodes, task)
        await changes.populateMetaPointersFromDbChanges(metaPointerTracker, msg.newChild.nodes, task)
        const addNodesquery = SQL_insertNodeArray(msg.newChild.nodes, metaPointerTracker)
        const deleteNodes = SQL_deleteFullNodes(replacedTree.map(node => node.id))
        const addChildQuery = changes.createPostgresQuery(metaPointerTracker)
        const nextVersionSql = SQL_nextRepoVersion(participation.participationId)
        const queryResult = await task.query(participation.repositoryData!, nextVersionSql + addNodesquery + deleteNodes + addChildQuery)
        const partition = await DB_affectedPartition(task, parentNode!.id, participation)
        return {
            messageKind: "ChildReplaced",
            parent: msg.parent,
            containment: msg.containment,
            index: msg.index,
            newChild: msg.newChild,
            replacedChild: msg.replacedChild,
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0, // dummy, will be changed for each participation before sending
            additionalInfos: [affectedNodeMessage(parentNode.id), affectedPartitionMessage(partition)]
        } as ChildReplacedEvent
    })

    return result
}


const MoveChildFromContainmentInOtherParentFunction = async (
    participation: Participation,
    msg: MoveChildFromContainmentInOtherParentCommand,
    ctx: DeltaContext
): Promise<DeltaEvent | ErrorEvent> => {
    deltaLogger.debug("Called MoveChildFromContainmentInOtherParent " + msg.messageKind)
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            msg.newParent, msg.movedChild, msg.oldParent
        ])
        const newParentNode = findAndValidateNodeExists(msg.newParent, nodesFromDB, msg, participation)
        const movedChildNode = findAndValidateNodeExists(msg.movedChild, nodesFromDB, msg, participation)
        const oldParentFromCommand = findAndValidateNodeExists(msg.oldParent, nodesFromDB, msg, participation)
        const oldParentFromCmdContainment = NodeUtils.findContainment(oldParentFromCommand, msg.oldContainment)
        validateChildInContainment(oldParentFromCommand, oldParentFromCmdContainment, msg.oldIndex, msg.movedChild, msg, participation)
        const oldMovedChildParentFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            movedChildNode.parent!
        ])
        const oldParentNode = findAndValidateNodeExists(movedChildNode.parent!, oldMovedChildParentFromDB, msg, participation)
        validateHaveTheSameParents(newParentNode, oldParentNode, msg, participation)
        validateParents(msg.oldParent, movedChildNode.parent, msg, participation)
        
        const newContainment = validateContainment(newParentNode, msg.newContainment, msg.newIndex, "Add", undefined, msg, participation)
        const oldContainment = findAndValidateContainment(oldParentNode, msg.oldContainment, msg, participation)
        validateDifferentContainments(newContainment.containment, oldContainment.containment, msg, participation)

        validateChildInContainment(oldParentNode, oldContainment, msg.oldIndex, msg.movedChild, msg, participation)
        // Now Do It
        const changes = new DbChanges(TableHelpers.pgp)
        newContainment.children.splice(msg.newIndex, 0, movedChildNode.id)
        oldContainment.children.splice(msg.oldIndex, 1)
        const newParentMissing: FeatureMissing =
            newParentNode.containments.find(c => isEqualMetaPointer(c.containment, msg.newContainment)) === undefined
                ? FeatureMissing.MissingBefore
                : FeatureMissing.NotMissing
        changes.addChanges([
            new ParentChanged(new JsonContext(null, ["delta"]), movedChildNode, oldParentNode.id, newParentNode.id),
            new ChildAdded(deltaContext(),newParentNode,msg.newContainment,newContainment,movedChildNode.id,newParentMissing),
            new ChildRemoved(deltaContext(),oldParentNode,oldContainment.containment,oldContainment,movedChildNode.id,FeatureMissing.NotMissing)
        ])
        // Add child nodes to database
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        // TODO This isn't neccesary as this is done by next functionm call: check this!
        // await metaPointerTracker.populateFromNodes([newParentNode], task)
        await changes.populateMetaPointersFromDbChanges(metaPointerTracker, [newParentNode], task)
        await task.query(participation.repositoryData!, changes.createPostgresQuery(metaPointerTracker))
        const oldPartition = await DB_affectedPartition(task, oldParentNode!.id, participation)
        const newPartition = await DB_affectedPartition(task, newParentNode!.id, participation)
        return {
            messageKind: "ChildMovedFromContainmentInOtherParent",
            newParent: newParentNode.id,
            newContainment: msg.newContainment,
            newIndex: msg.newIndex,
            oldParent: oldParentNode.id,
            oldContainment: msg.oldContainment,
            oldIndex: msg.oldIndex,
            movedChild: msg.movedChild,
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0, // dummy, will be changed for each participation before sending
            additionalInfos: [
                affectedNodeMessage(msg.newParent),
                affectedPartitionMessage(oldPartition),
                // TODO Make sure two infos with the same key are handled correctly
                affectedPartitionMessage(newPartition)
            ]
        } as ChildMovedFromContainmentInOtherParentEvent
    })
    return result
}

const MoveChildFromOtherContainmentInSameParent = async (
    participation: Participation,
    msg: MoveChildFromOtherContainmentInSameParentCommand,
    ctx: DeltaContext
): Promise<DeltaEvent | ErrorEvent> => {
    deltaLogger.debug("Called MoveChildFromOtherContainmentInSameParent " + msg.messageKind)
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            msg.parent, msg.movedChild
        ])
        const parentNode = findAndValidateNodeExists(msg.parent, nodesFromDB, msg, participation)
        const movedChildNode = findAndValidateNodeExists(msg.movedChild, nodesFromDB, msg, participation)
        const oldContainment = findAndValidateContainment(parentNode, msg.oldContainment, msg, participation)
        validateChildInContainment(parentNode, oldContainment, msg.oldIndex, msg.movedChild, msg, participation)
        const newContainment = validateContainment(parentNode, msg.newContainment, msg.newIndex, "Add", undefined, msg, participation)
        const newContainmentMissing: FeatureMissing =
            parentNode.containments.find(c => isEqualMetaPointer(c.containment, msg.newContainment)) === undefined
                ? FeatureMissing.MissingBefore
                : FeatureMissing.NotMissing
        //// Execute ////
        const changes = new DbChanges(TableHelpers.pgp)
        newContainment.children.splice(msg.newIndex, 0, movedChildNode.id)
        oldContainment.children.splice(msg.oldIndex, 1)
        changes.addChanges([
            new ChildAdded(deltaContext(),parentNode,msg.newContainment,newContainment,movedChildNode.id,newContainmentMissing),
            new ChildRemoved(deltaContext(),parentNode,oldContainment.containment,oldContainment,movedChildNode.id,FeatureMissing.NotMissing)
        ])
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        await changes.populateMetaPointersFromDbChanges(metaPointerTracker, [parentNode], task)
        await task.query(participation.repositoryData!, changes.createPostgresQuery(metaPointerTracker))
        const partition = await DB_affectedPartition(task, parentNode.id, participation)

        return {
            messageKind: "ChildMovedFromOtherContainmentInSameParent",
            parent: parentNode.id,
            newContainment: msg.newContainment,
            newIndex: msg.newIndex,
            oldContainment: msg.oldContainment,
            oldIndex: msg.oldIndex,
            movedChild: msg.movedChild,
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0, // dummy, will be changed for each participation before sending
            additionalInfos: [
                affectedNodeMessage(msg.parent),
                affectedPartitionMessage(partition),
            ]
        } as ChildMovedFromOtherContainmentInSameParentEvent
    })
    return result
}

const MoveChildInSameContainmentInSameParent = async (
    participation: Participation,
    msg: MoveChildInSameContainmentInSameParentCommand,
    ctx: DeltaContext
): Promise<DeltaEvent | ErrorEvent> => {
    deltaLogger.debug("Called MoveChildInSameContainmentInSameParent " + msg.messageKind)
    // TODO check that offset is not 0 and resulkt within bounds
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            msg.movedChild,
            msg.parent
        ])
        const parentNode = findAndValidateNodeExists(msg.parent, nodesFromDB, msg, participation)
        const movedChildNode = findAndValidateNodeExists(msg.movedChild, nodesFromDB, msg, participation)
        const containment = findAndValidateContainment(parentNode, msg.containment, msg, participation)
        validateChildInContainment(parentNode, containment, msg.oldIndex, msg.movedChild, msg, participation)
        // TODO validate new index

        //// Execute ////
        const changes = new DbChanges(TableHelpers.pgp)
        const changedContainment = structuredClone(containment)
        changedContainment.children.splice(msg.oldIndex + msg.indexOffset, 0, movedChildNode.id)
        // if (msg.oldIndex > msg.newIndex) {
        //     changedContainment.children.splice(msg.newIndex, 0, movedChildNode.id)
        // } else {
        //     changedContainment.children.splice(msg.newIndex - 1, 0, movedChildNode.id)
        // }
        changes.addChanges([
            new ChildOrderChanged(deltaContext(), parentNode, msg.containment, changedContainment, msg.movedChild, FeatureMissing.NotMissing)
        ])
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        // TODO Check: not needed as there are no new nodes or containments.
        // await changes.populateMetaPointersFromDbChanges(metaPointerTracker, [], task)
        await task.query(participation.repositoryData!, changes.createPostgresQuery(metaPointerTracker))
        const partition = await DB_affectedPartition(task, parentNode.id, participation)

        return {
            messageKind: "ChildMovedInSameContainmentInSameParent",
            parent: msg.parent,
            movedChild: msg.movedChild,
            containment: msg.containment,
            oldIndex: msg.oldIndex,
            indexOffset: msg.indexOffset,
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0, // dummy, will be changed for each participation before sending
            additionalInfos: [affectedNodeMessage(msg.parent), affectedPartitionMessage(partition)]
        } as ChildMovedInSameContainmentInSameParentEvent
    })
    return result
}

const MoveAndReplaceChildFromContainmentInOtherParent = async (
    participation: Participation,
    msg: MoveAndReplaceChildFromContainmentInOtherParentCommand,
    ctx: DeltaContext
): Promise<DeltaEvent | ErrorEvent> => {
    deltaLogger.debug("Called MoveAndReplaceChildFromContainmentInOtherParent " + msg.messageKind)
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            msg.replacedChild,
            msg.movedChild,
            msg.oldParent,
            msg.newParent
        ])
        const oldParentNode = findAndValidateNodeExists(msg.oldParent, nodesFromDB, msg, participation)
        const newParentNode = findAndValidateNodeExists(msg.newParent, nodesFromDB, msg, participation)
        const movedChildNode = findAndValidateNodeExists(msg.movedChild, nodesFromDB, msg, participation)
        const replacedChildNode = findAndValidateNodeExists(msg.replacedChild, nodesFromDB, msg, participation)
        const oldContainment = findAndValidateContainment(oldParentNode, msg.oldContainment, msg, participation)
        validateChildInContainment(oldParentNode, oldContainment, msg.oldIndex, msg.movedChild, msg, participation)
        const newContainment = validateContainment(
            newParentNode,
            msg.newContainment,
            msg.newIndex,
            "Replace",
            msg.replacedChild,
            msg,
            participation
        )
        // Get the subtree of `deletedChild` from the database to remove them
        const subtreeNodes = await DB_retrieveNodeTree(task, participation.repositoryData!, [msg.replacedChild], Number.MAX_SAFE_INTEGER)
        const deleteSql = SQL_deleteFullNodes(subtreeNodes.map(n => n.id))

        //// Execute ////
        const changes = new DbChanges(TableHelpers.pgp)
        newContainment.children.splice(msg.newIndex, 1, movedChildNode.id)
        oldContainment.children.splice(msg.oldIndex, 1)
        changes.addChanges([
            new ParentChanged(deltaContext(), movedChildNode, msg.oldParent, msg.newParent),
            new ChildRemoved(deltaContext(), oldParentNode, msg.oldContainment, oldContainment, movedChildNode.id, FeatureMissing.NotMissing),
            new ChildRemoved(
                deltaContext(),
                newParentNode,
                newContainment.containment,
                newContainment,
                replacedChildNode.id,
                FeatureMissing.NotMissing
            ),
            new ChildAdded(deltaContext(), newParentNode, msg.newContainment, newContainment, movedChildNode.id, FeatureMissing.NotMissing),
        ])
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        // TODO Check: not needed as there are no new nodes or containments.
        // await changes.populateMetaPointersFromDbChanges(metaPointerTracker, [], task)
        await task.query(participation.repositoryData!, deleteSql + changes.createPostgresQuery(metaPointerTracker))
        const partition = await DB_affectedPartition(task, oldParentNode.id, participation)

        return {
            messageKind: "ChildMovedAndReplacedFromContainmentInOtherParent",
            movedChild: msg.movedChild,
            newParent: msg.newParent,
            newContainment: msg.newContainment,
            newIndex: msg.newIndex,
            oldParent: msg.oldParent,
            oldContainment: msg.oldContainment,
            oldIndex: msg.oldIndex,
            replacedChild: msg.replacedChild,
            replacedDescendants: subtreeNodes.map(n => n.id),
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0, // dummy, will be changed for each participation before sending
            additionalInfos: [affectedNodeMessage(msg.oldParent), affectedPartitionMessage(partition)]
        } as ChildMovedAndReplacedFromContainmentInOtherParentEvent
    })
    return result
}

const MoveAndReplaceChildFromOtherContainmentInSameParent = async (
    participation: Participation,
    msg: MoveAndReplaceChildFromOtherContainmentInSameParentCommand,
    ctx: DeltaContext
): Promise<DeltaEvent | ErrorEvent> => {
    deltaLogger.debug("Called MoveAndReplaceChildFromOtherContainmentInSameParent " + msg.messageKind)
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            msg.replacedChild,
            msg.movedChild,
            msg.parent
        ])
        const parentNode = findAndValidateNodeExists(msg.parent, nodesFromDB, msg, participation)
        const movedChildNode = findAndValidateNodeExists(msg.movedChild, nodesFromDB, msg, participation)
        const replacedChildNode = findAndValidateNodeExists(msg.replacedChild, nodesFromDB, msg, participation)
        const oldContainment = findAndValidateContainment(parentNode, msg.oldContainment, msg, participation)
        validateChildInContainment(parentNode, oldContainment, msg.oldIndex, msg.movedChild, msg, participation)
        const newContainment = validateContainment(
            parentNode,
            msg.newContainment,
            msg.newIndex,
            "Replace",
            msg.replacedChild,
            msg,
            participation
        )
        // Get the subtree of `deletedChild` from the database to remove them
        const subtreeNodes = await DB_retrieveNodeTree(task, participation.repositoryData!, [msg.replacedChild], Number.MAX_SAFE_INTEGER)
        const deleteSql = SQL_deleteFullNodes(subtreeNodes.map(n => n.id))

        //// Execute ////
        const changes = new DbChanges(TableHelpers.pgp)
        newContainment.children.splice(msg.newIndex, 1, movedChildNode.id)
        oldContainment.children.splice(msg.oldIndex, 1)
        changes.addChanges([
            new ChildRemoved(deltaContext(), parentNode, msg.oldContainment, oldContainment, movedChildNode.id, FeatureMissing.NotMissing),
            new ChildRemoved(
                deltaContext(),
                parentNode,
                newContainment.containment,
                newContainment,
                replacedChildNode.id,
                FeatureMissing.NotMissing
            ),
            new ChildAdded(deltaContext(), parentNode, msg.newContainment, newContainment, movedChildNode.id, FeatureMissing.NotMissing)
        ])
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        // TODO Check: not needed as there are no new nodes or containments.
        // await changes.populateMetaPointersFromDbChanges(metaPointerTracker, [], task)
        await task.query(participation.repositoryData!, deleteSql + changes.createPostgresQuery(metaPointerTracker))
        const partition = await DB_affectedPartition(task, parentNode.id, participation)

        return {
            messageKind: "ChildMovedAndReplacedFromOtherContainmentInSameParent",
            parent: msg.parent,
            movedChild: msg.movedChild,
            newContainment: msg.newContainment,
            newIndex: msg.newIndex,
            oldContainment: msg.oldContainment,
            oldIndex: msg.oldIndex,
            replacedChild: msg.replacedChild,
            replacedDescendants: subtreeNodes.map(n => n.id),
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0, // dummy, will be changed for each participation before sending
            additionalInfos: [affectedNodeMessage(msg.parent), affectedPartitionMessage(partition)]
        } as ChildMovedAndReplacedFromOtherContainmentInSameParentEvent
    })
    return result
}

const MoveAndReplaceChildInSameContainmentInSameParent = async (
    participation: Participation,
    msg: MoveAndReplaceChildInSameContainmentInSameParentCommand,
    ctx: DeltaContext
): Promise<DeltaEvent | ErrorEvent> => {
    deltaLogger.debug("Called MoveAndReplaceChildInSameContainmentInSameParent " + msg.messageKind)
    const result = await ctx.dbConnection.tx(async (task: LionWebTask) => {
        const nodesFromDB = await DB_retrieveFullNodesFromIdList(task, participation.repositoryData!, [
            msg.replacedChild,
            msg.movedChild,
            msg.parent
        ])
        const parentNode = findAndValidateNodeExists(msg.parent, nodesFromDB, msg, participation)
        const movedChildNode = findAndValidateNodeExists(msg.movedChild, nodesFromDB, msg, participation)
        const replacedChildNode = findAndValidateNodeExists(msg.replacedChild, nodesFromDB, msg, participation)
        const containment = findAndValidateContainment(parentNode, msg.containment, msg, participation)
        validateChildInContainment(parentNode, containment, msg.oldIndex, msg.movedChild, msg, participation)
        validateChildInContainment(parentNode, containment, msg.oldIndex + msg.indexOffset, msg.replacedChild, msg, participation)
        // Get the subtree of `deletedChild` from the database to remove them
        const subtreeNodes = await DB_retrieveNodeTree(task, participation.repositoryData!, [msg.replacedChild], Number.MAX_SAFE_INTEGER)
        const deleteSql = SQL_deleteFullNodes(subtreeNodes.map(n => n.id))

        //// Execute ////
        const changes = new DbChanges(TableHelpers.pgp)
        const changedContainment = structuredClone(containment)
        changedContainment.children.splice(msg.oldIndex, 1)
        if (msg.indexOffset < 0) {
            changedContainment.children.splice(msg.oldIndex + msg.indexOffset, 1, movedChildNode.id)
        } else {
            changedContainment.children.splice(msg.oldIndex + msg.indexOffset - 1, 1, movedChildNode.id)
        }
        changes.addChanges([
            new ChildRemoved(deltaContext(), parentNode, msg.containment, changedContainment, msg.replacedChild, FeatureMissing.NotMissing),
            new ChildAdded(deltaContext(), parentNode, msg.containment, changedContainment, movedChildNode.id, FeatureMissing.NotMissing)
        ])
        const metaPointerTracker = new MetaPointersTracker(participation.repositoryData!)
        // TODO Check: not needed as there are no new nodes or containments.
        // await changes.populateMetaPointersFromDbChanges(metaPointerTracker, [], task)
        await task.query(participation.repositoryData!, deleteSql + changes.createPostgresQuery(metaPointerTracker))
        const partition = await DB_affectedPartition(task, parentNode.id, participation)

        return {
            messageKind: "ChildMovedAndReplacedInSameContainmentInSameParent",
            parent: msg.parent,
            movedChild: msg.movedChild,
            containment: msg.containment,
            oldIndex: msg.oldIndex,
            indexOffset: msg.indexOffset,
            replacedChild: msg.replacedChild,
            replacedDescendants: subtreeNodes.map(n => n.id),
            originCommands: [{ commandId: msg.commandId, participationId: participation.participationId }],
            sequenceNumber: 0, // dummy, will be changed for each participation before sending
            additionalInfos: [affectedNodeMessage(msg.parent), affectedPartitionMessage(partition)]
        } as ChildMovedAndReplacedInSameContainmentInSameParentEvent
    })
    return result
}

export const childFunctions: DeltaFunction[] = [
    {
        messageKind: "AddChild",
        // @ts-expect-error TS2332
        processor: AddChild
    },
    {
        messageKind: "DeleteChild",
        // @ts-expect-error TS2332
        processor: DeleteChild
    },
    {
        messageKind: "ReplaceChild",
        // @ts-expect-error TS2332
        processor: ReplaceChild
    },
    {
        messageKind: "MoveChildFromContainmentInOtherParent",
        // @ts-expect-error TS2332
        processor: MoveChildFromContainmentInOtherParentFunction
    },
    {
        messageKind: "MoveChildInSameContainmentInSameParent",
        // @ts-expect-error TS2332
        processor: MoveChildInSameContainmentInSameParent
    },
    {
        messageKind: "MoveChildFromOtherContainmentInSameParent",
        // @ts-expect-error TS2332
        processor: MoveChildFromOtherContainmentInSameParent
    },
    {
        messageKind: "MoveAndReplaceChildFromContainmentInOtherParent",
        // @ts-expect-error TS2332
        processor: MoveAndReplaceChildFromContainmentInOtherParent
    },
    {
        messageKind: "MoveAndReplaceChildFromOtherContainmentInSameParent",
        // @ts-expect-error TS2332
        processor: MoveAndReplaceChildFromOtherContainmentInSameParent
    },
    {
        messageKind: "MoveAndReplaceChildInSameContainmentInSameParent",
        // @ts-expect-error TS2332
        processor: MoveAndReplaceChildInSameContainmentInSameParent
    }
]
