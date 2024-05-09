import {
    ContainmentRowData, CONTAINMENTS_TABLE,
    logger,
    NODES_TABLE,
    PROPERTIES_TABLE,
    PropertyRowData,
    ReferenceRowData,
    REFERENCES_TABLE,
    TableHelpers
} from "@lionweb/repository-common"
import {
    AnnotationAdded,
    AnnotationChange,
    Change,
    ContainmentChange,
    LionWebJsonMetaPointer,
    Missing, NodeRemoved,
    ParentChanged,
    PropertyValueChanged,
    ReferenceChange
} from "@lionweb/validation"
import { ColumnSet } from "pg-promise"
import { BulkApiContext } from "../main.js"
import { InitializedMapToArray } from "./InitializedMapToArray.js"
import { sqlArrayFromNodeIdArray } from "./QueryNode.js";

export type DbNodeUpdate = {
    id: string
    column: "annotations" | "parent" | "classifier_language" | "classifier_version" | "classifier_key"
    newValue: unknown
}

export type DbNodeDelete = {
    id: string
}

export type FeatureUpdate = {
    node_id: string
    missing: Missing
}

export type DbPropertyUpdate = FeatureUpdate & {
    property: LionWebJsonMetaPointer
    column: string
    newValue: unknown
}

export type DbContainmentUpdate = FeatureUpdate & {
    containment: LionWebJsonMetaPointer
    column: string
    children: string[]
}

export type DbReferenceUpdate = FeatureUpdate & {
    reference: LionWebJsonMetaPointer
    column: string
    targets: object[]
}

export type PropertKey = {
    nodeId: string
    property: LionWebJsonMetaPointer
}
export type ContainmentKey = {
    nodeId: string
    containment: LionWebJsonMetaPointer
}
export type ReferenceKey = {
    nodeId: string
    reference: LionWebJsonMetaPointer
}

// TODO Make easier to use, or use only one of this in LionwebQueries.ts
/**
 * This class captures changes in nodes and creates the Postgres queries to apply these changes to
 * the database tables.
 */
export class DbChanges {
    // The maps of updates that need to be done
    updatesOnNodeTable: InitializedMapToArray<string, DbNodeUpdate> = new InitializedMapToArray<string, DbNodeUpdate>()
    updatesPropertyTable: InitializedMapToArray<PropertKey, DbPropertyUpdate> = new InitializedMapToArray<PropertKey, DbPropertyUpdate>()
    updatesContainmentTable: InitializedMapToArray<ContainmentKey, DbContainmentUpdate> = new InitializedMapToArray<
        ContainmentKey,
        DbContainmentUpdate
    >()
    updatesReferenceTable: InitializedMapToArray<ReferenceKey, DbReferenceUpdate> = new InitializedMapToArray<
        ReferenceKey,
        DbReferenceUpdate
    >()
    // map of nodes to be removed
    deletedNodesTable: InitializedMapToArray<string, DbNodeDelete> = new InitializedMapToArray<string, DbNodeDelete>()

    constructor(private context: BulkApiContext) {}

    /**
     * Add _changes_ and convert them to (virtual) updates in the underlying tables.
     * @param changes
     */
    addChanges(changes: Change[]): void {
        changes.forEach(change => {
            switch (change.changeType) {
                case "NodeRemoved":
                    this.deletedNodesTable.add((change as NodeRemoved).node.id, { id: (change as NodeRemoved).node.id} )
                    break
                case "AnnotationAdded":
                case "AnnotationOrderChanged":
                case "AnnotationRemoved": {
                    const update: DbNodeUpdate = {
                        id: (change as AnnotationChange).nodeAfter.id,
                        column: "annotations",
                        newValue: (change as AnnotationAdded).nodeAfter.annotations
                    }
                    this.updatesOnNodeTable.add(update.id, update)
                    break
                }
                case "ParentChanged": {
                    const update: DbNodeUpdate = {
                        id: (change as ParentChanged).node.id,
                        column: "parent",
                        newValue: (change as ParentChanged).afterParentId
                    }
                    this.updatesOnNodeTable.add(update.id, update)
                    break
                }
                case "PropertyValueChanged": {
                    const update: DbPropertyUpdate = {
                        node_id: (change as PropertyValueChanged).nodeId,
                        property: (change as PropertyValueChanged).property,
                        column: "value",
                        newValue: (change as PropertyValueChanged).newValue,
                        missing: (change as PropertyValueChanged).missing
                    }
                    this.updatesPropertyTable.add({ nodeId: update.node_id, property: update.property }, update)
                    break
                }
                case "ChildRemoved":
                case "ChildAdded":
                case "ChildOrderChanged": {
                    const update: DbContainmentUpdate = {
                        node_id: (change as ContainmentChange).parentNode.id,
                        containment: (change as ContainmentChange).containment,
                        column: "children",
                        children: (change as ContainmentChange).afterContainment?.children ?? [],
                        missing: (change as ContainmentChange).missing 
                    }
                    this.updatesContainmentTable.add({ nodeId: update.node_id, containment: update.containment }, update)
                    break
                }
                case "TargetAdded":
                case "TargetRemoved":
                case "TargetOrderChanged": {
                    const update: DbReferenceUpdate = {
                        node_id: (change as ReferenceChange).node.id,
                        reference: (change as ReferenceChange).beforeReference.reference,
                        column: "targets",
                        targets: (change as ReferenceChange).afterReference?.targets ?? [],
                        missing: (change as ReferenceChange).missing
                    }
                    this.updatesReferenceTable.add({ nodeId: update.node_id, reference: update.reference }, update)
                    break
                }
            }
        })
    }

    /**
     * Create a Postgres query for all the changes added to this DbCommand.
     */
    createPostgresQuery(): string {
        let result = `-- Update generated by DbCommands\n`
        this.updatesOnNodeTable.values().forEach((values: DbNodeUpdate[]) => {
            const newValue = {}
            values.forEach(v => (newValue[v.column] = v.newValue))
            result += `-- update nodes
                        UPDATE ${NODES_TABLE}
                            SET ${this.context.pgp.helpers.sets(newValue, Object.keys(newValue))}
                        WHERE
                            id = '${values[0].id}';
                      `
        })
        this.updatesReferenceTable.values().forEach((values: DbReferenceUpdate[]) => {
            // Just take the first from _values_, as every property except _newValue_ is identical anyway.
            // And there can only be one new _targets_ value as well.
            const data: ReferenceRowData = {
                node_id: values[0].node_id,
                reference_language: values[0].reference.language,
                reference_version: values[0].reference.version,
                reference_key: values[0].reference.key,
                targets: values[0].targets
            }
            result += this.createQuery(
                data,
                "reference_language",
                "reference_version",
                "reference_key",
                REFERENCES_TABLE,
                TableHelpers.REFERENCES_COLUMN_SET,
                values[0].missing
            )
        })
        this.updatesContainmentTable.values().forEach((values: DbContainmentUpdate[]) => {
            // Just take the first from _values_, as every property except _newValue_ is identical anyway.
            // And there can only be one new _targets_ value as well.
            const data: ContainmentRowData = {
                node_id: values[0].node_id,
                containment_language: values[0].containment.language,
                containment_version: values[0].containment.version,
                containment_key: values[0].containment.key,
                children: values[0].children
            }
            result += this.createQuery(
                data,
                "containment_language",
                "containment_version",
                "containment_key",
                CONTAINMENTS_TABLE,
                TableHelpers.CONTAINMENTS_COLUMN_SET,
                values[0].missing
            )
        })
        this.updatesPropertyTable.values().forEach((values: DbPropertyUpdate[]) => {
            // Just take the first from _values_, as every property except _newValue_ is identical anyway.
            // And there can only be one newValue as well.
            const data: PropertyRowData = {
                node_id: values[0].node_id,
                property_language: values[0].property.language,
                property_version: values[0].property.version,
                property_key: values[0].property.key,
                value: values[0].newValue
            }
            result += this.createQuery(
                data,
                "property_language",
                "property_version",
                "property_key",
                PROPERTIES_TABLE,
                TableHelpers.PROPERTIES_COLUMN_SET,
                values[0].missing
            )
        })
        // Deletes at the end, so any (useles) upodates on deleted nodes don't give errors.
        const idsToDelete = this.deletedNodesTable.values().map(v => v[0].id)
        if (idsToDelete.length > 0) {
            const sqlIds = sqlArrayFromNodeIdArray(idsToDelete)
            result += `-- Remove orphans by moving them to the orphan tables
                DELETE FROM ${NODES_TABLE} n
                WHERE n.id IN ${sqlIds};
                
                DELETE FROM ${PROPERTIES_TABLE} p
                WHERE p.node_id IN ${sqlIds};

                DELETE FROM ${CONTAINMENTS_TABLE} c
                WHERE c.node_id IN ${sqlIds};

                DELETE FROM ${REFERENCES_TABLE} r
                WHERE r.node_id IN ${sqlIds};
                `
        }
        
        logger.requestLog("DATABASE INSERT " + result)
        return result
    }

    /**
     * Creates a query (update, insert or delete) for a features table.
     * Generic for properties, references and containments.
     * @param data
     * @param languageColum
     * @param versionColumn
     * @param keyColum
     * @param tableName
     * @param columnSet
     * @param missing
     */
    private createQuery(
        data: object,
        languageColum: string,
        versionColumn: string,
        keyColum: string,
        tableName: string,
        columnSet: ColumnSet,
        missing: Missing
    ): string {
        let result = ""
        switch (missing) {
            case Missing.MissingBefore:
                result += `-- insert new feature for existing node
                                ${this.context.pgp.helpers.insert(data, columnSet)};`
                break
            case Missing.MissingAfter:
                result += `-- delete feature for existing node
                                DELETE FROM ${tableName} tabl
                                WHERE 
                                    tabl.node_id = '${data["node_id"]}' AND
                                    tabl.${languageColum} = '${data[languageColum]}' AND
                                    tabl.${versionColumn} = '${data[versionColumn]}' AND
                                    tabl.${keyColum} = '${data[keyColum]}';
                    `
                break
            case Missing.NotMissing:
                result += `-- update feature for existing node
                                UPDATE ${tableName} tabl
                                    SET ${this.context.pgp.helpers.sets(data, columnSet)}
                                WHERE
                                    tabl.node_id = '${data["node_id"]}' AND
                                    tabl.${languageColum} = '${data[languageColum]}' AND
                                    tabl.${versionColumn} = '${data[versionColumn]}' AND
                                    tabl.${keyColum} = '${data[keyColum]}';
                              `
                break
        }
        return result
    }
}